import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json().catch(() => null);
    const quote_number = body?.quote_number;
    if (typeof quote_number !== 'string' || !quote_number || quote_number.length > 100) {
      return new Response(JSON.stringify({ error: 'Missing quote_number' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 1. Look up quotation
    const { data: quote, error: fetchError } = await supabaseClient
      .from('quotations')
      .select('*')
      .eq('quote_number', quote_number)
      .single();

    if (fetchError || !quote) {
      return new Response(JSON.stringify({ error: 'Quotation not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (quote.status !== 'issued') {
      return new Response(JSON.stringify({ error: 'Quotation already accepted or invalid' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (quote.valid_until && new Date(quote.valid_until).getTime() <= Date.now()) {
      return new Response(JSON.stringify({ error: 'This quotation has expired. Please request a new quotation.' }), { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Basic Rate Limiting: Check if this phone has accepted a quote in the last 24h
    const { data: recentAccepts, error: rateError } = await supabaseClient
      .from('quotations')
      .select('id')
      .eq('phone', quote.phone)
      .eq('status', 'accepted')
      .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (rateError) throw rateError;
    if (recentAccepts && recentAccepts.length >= 5) {
       // Just capping at 5 accepts per day to prevent spam
       return new Response(JSON.stringify({ error: 'Rate limit exceeded for this phone number.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Update to accepted
    const { data: accepted, error: acceptError } = await supabaseClient
      .from('quotations')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', quote.id)
      .eq('status', 'issued')
      .select('id')
      .maybeSingle();
    if (acceptError) throw acceptError;
    if (!accepted) {
      return new Response(JSON.stringify({ error: 'This quotation has already been processed.' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 3. Call n8n webhook
    const n8nUrl = Deno.env.get('N8N_WEBHOOK_URL');
    const n8nSecret = Deno.env.get('N8N_WEBHOOK_SECRET') || Deno.env.get('FINBOOK_SECRET');

    let handoffStatus = 'failed';
    let handoffError = null;
    let n8nSessionId = null;
    let workflowTriggered = false;

    if (n8nUrl && n8nSecret) {
      try {
        const n8nResponse = await fetch(n8nUrl, {
          method: 'POST',
          signal: AbortSignal.timeout(15000),
          headers: {
            'Content-Type': 'application/json',
            'x-finbook-secret': n8nSecret
          },
          body: JSON.stringify({
            phone: quote.phone,
            company_type: quote.quote.company_type,
            proposed_director_count: quote.proposed_director_count,
            company_state: quote.company_state,
            authorized_capital: quote.authorized_capital,
            quote_number: quote.quote_number
          })
        });

        if (n8nResponse.ok) {
          workflowTriggered = true;
          const result = await n8nResponse.json();
          if (result.success !== false && result.whatsapp_sent === true) {
            handoffStatus = 'sent';
            n8nSessionId = result.sessionID;
          } else {
            handoffError = 'n8n did not confirm WhatsApp delivery';
          }
        } else {
          handoffError = `n8n responded with ${n8nResponse.status}`;
        }
      } catch (e) {
        handoffError = e instanceof Error ? e.message : String(e);
      }
    } else {
      handoffError = 'n8n URL or secret not configured';
    }

    // 4. Update handoff status
    const { error: handoffSaveError } = await supabaseClient
      .from('quotations')
      .update({
        handoff_status: handoffStatus,
        handoff_error: handoffError,
        n8n_session_id: n8nSessionId,
        handoff_attempts: (quote.handoff_attempts || 0) + (n8nUrl && n8nSecret ? 1 : 0),
        ...(handoffStatus === 'sent' ? { whatsapp_handoff_at: new Date().toISOString() } : {})
      })
      .eq('id', quote.id);
    if (handoffError || handoffSaveError) {
      console.error('Quotation handoff needs attention', { quote_number, handoffError, handoffSaveError });
    }

    // 5. Always return success to frontend if accepted
    return new Response(
      JSON.stringify({ success: true, handoffStatus, workflowTriggered, handoffRecorded: !handoffSaveError }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: 'Unable to accept your quotation. Please try again.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
