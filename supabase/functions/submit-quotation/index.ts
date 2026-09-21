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
    if (!body || typeof body !== 'object') {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { entity, state, director_count, plan_code, name, email, phone } = body;

    // Validate Input
    if (!['private_limited', 'opc', 'llp', 'public_limited'].includes(entity)) {
      return new Response(JSON.stringify({ error: 'Invalid entity type' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!Number.isSafeInteger(director_count) || director_count < 0) {
      return new Response(JSON.stringify({ error: 'Invalid director count' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    if (typeof name !== 'string' || !name.trim() || name.length > 200 ||
        typeof state !== 'string' || !state.trim() || state.length > 100 ||
        typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
        typeof phone !== 'string' || phone.length > 30 ||
        (plan_code !== undefined && !['basic', 'standard'].includes(plan_code))) {
      return new Response(JSON.stringify({ error: 'Please provide a valid name, email, state, phone and plan.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    let normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.length === 10) {
      normalizedPhone = '91' + normalizedPhone;
    }
    if (!/^[1-9][0-9]{9,14}$/.test(normalizedPhone)) {
      return new Response(JSON.stringify({ error: 'Invalid phone number' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Call calculate_quote via RPC
    const { data: quoteResult, error: rpcError } = await supabaseClient.rpc('calculate_quote', {
      p_entity: entity,
      p_state: state.trim(),
      p_director_count: director_count,
      p_authorized_capital: 100000,
      p_plan_code: plan_code || 'basic'
    });

    if (rpcError || !quoteResult) {
      console.error("RPC Error:", rpcError);
      return new Response(JSON.stringify({ error: 'Failed to calculate quote' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: validity, error: validityError } = await supabaseClient
      .from('settings').select('value').eq('key', 'quotation_valid_days').single();
    const validDays = Number(validity?.value);
    if (validityError || !Number.isFinite(validDays) || validDays <= 0 || validDays > 3650) {
      throw new Error('Quotation validity setting is missing or invalid');
    }
    const valid_until = new Date(Date.now() + validDays * 86400000).toISOString();

    const { data: savedQuote, error: insertError } = await supabaseClient
      .from('quotations')
      .insert({
        customer_name: name.trim(),
        phone: normalizedPhone,
        email: email.trim(),
        entity: quoteResult.entity,
        company_state: quoteResult.state,
        plan_code: quoteResult.plan_code,
        proposed_director_count: quoteResult.director_count,
        authorized_capital: quoteResult.authorized_capital,
        valid_until,
        status: 'issued',
        total: quoteResult.total,
        advance_amount: quoteResult.advance_amount,
        balance_amount: quoteResult.balance_amount,
        quote: quoteResult
      }).select('quote_number').single();

    if (insertError || !savedQuote) {
      console.error("Insert Error:", insertError);
      return new Response(JSON.stringify({ error: 'Failed to save quotation' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(
      JSON.stringify({ success: true, ...quoteResult, quote_number: savedQuote.quote_number, valid_until }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: 'Unable to generate your quotation. Please try again.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
