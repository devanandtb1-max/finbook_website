import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
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
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { quotation_id, quote_number, customer_name, phone, service_requested, state, pincode } = body;
    if (!quotation_id && !quote_number) {
      return new Response(
        JSON.stringify({ error: 'Missing quotation_id or quote_number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Fetch quotation record from Supabase
    let query = supabaseClient.from('quotations').select('*');
    if (quotation_id) {
      query = query.eq('id', quotation_id);
    } else {
      query = query.eq('quote_number', quote_number);
    }

    const { data: quote, error: fetchError } = await query.maybeSingle();

    if (fetchError || (!quote && !customer_name)) {
      return new Response(
        JSON.stringify({ error: 'Quotation record not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Prevent duplicate callback requests for the same quotation within 24 hours (only if notification was successfully sent)
    if (quote?.id) {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: existingRequests } = await supabaseClient
        .from('callback_requests')
        .select('id, created_at')
        .eq('quotation_id', quote.id)
        .eq('notification_sent', true)
        .gte('created_at', twentyFourHoursAgo);

      if (existingRequests && existingRequests.length > 0) {
        return new Response(
          JSON.stringify({
            error: 'A callback request has already been submitted for this quotation within the last 24 hours.',
            duplicate: true
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 3. Read support_phone dynamically from settings table FIRST (always prioritize DB over env)
    let rawSupportPhone = '';
    let dbSettings: any[] | null = null;

    try {
      const { data } = await supabaseClient.from('settings').select('key, value');
      dbSettings = data;
      if (dbSettings && Array.isArray(dbSettings)) {
        const keys = ['support_whatsapp', 'support_phone', 'company_phone'];
        for (const k of keys) {
          const found = dbSettings.find(s => s.key === k && s.value);
          if (found && String(found.value).trim()) {
            rawSupportPhone = String(found.value).trim();
            break;
          }
        }
      }
    } catch (e) {
      console.error("Error querying settings table for support phone:", e);
    }

    if (!rawSupportPhone) {
      rawSupportPhone = Deno.env.get('SUPPORT_WHATSAPP') || Deno.env.get('SUPPORT_PHONE') || '918129056276';
    }

    let supportPhone = rawSupportPhone.replace(/\D/g, '');
    if (supportPhone.length === 10) {
      supportPhone = '91' + supportPhone;
    }
    if (!supportPhone) {
      supportPhone = '918129056276';
    }

    // 3b. Read support_email dynamically from settings table FIRST (always prioritize DB over env)
    let rawSupportEmail = '';
    try {
      if (dbSettings && Array.isArray(dbSettings)) {
        const emailSetting = dbSettings.find(s => ['support_email', 'company_email'].includes(s.key) && s.value);
        if (emailSetting && emailSetting.value) {
          rawSupportEmail = String(emailSetting.value).trim();
        }
      }
    } catch (_e) {}

    if (!rawSupportEmail) {
      rawSupportEmail = Deno.env.get('SUPPORT_EMAIL') || 'abilashom6@gmail.com';
    }
    const supportEmail = rawSupportEmail.trim();

    // Extract customer & quotation fields
    const finalCustomerName = customer_name || quote?.customer_name || quote?.name || 'Valued Customer';
    let finalPhone = String(phone || quote?.phone || '').replace(/\D/g, '');
    if (finalPhone.length === 10) {
      finalPhone = '91' + finalPhone;
    }

    const finalServiceRequested = service_requested ||
      (quote?.entity ? (quote.entity === 'private_limited' ? 'Private Limited Company Incorporation' : quote.entity === 'llp' ? 'LLP Incorporation' : quote.entity === 'opc' ? 'OPC Incorporation' : 'Company Incorporation') : 'Private Limited Company Incorporation');

    const finalQuoteNumber = quote_number || quote?.quote_number || 'FB-2026-1005';
    const finalState = state || quote?.company_state || quote?.state || 'Kerala';
    const finalPincode = pincode || quote?.pincode || (quote?.quote && quote.quote.pincode) || '695001';

    const finalRequestMessage = `Customer requested a callback regarding company capital & director requirements. Quote #: ${finalQuoteNumber}`;

    // 4. Build exact Meta-compatible WhatsApp template payload structure with aligned parameters
    const payload: Record<string, any> = {
      "messaging_product": "whatsapp",
      "recipient_type": "individual",
      "to": supportPhone,
      "type": "template",
      "template": {
        "name": "customer_callback_request",
        "language": {
          "code": "en"
        },
        "components": [
          {
            "type": "body",
            "parameters": [
              {
                "type": "text",
                "text": finalServiceRequested
              },
              {
                "type": "text",
                "text": finalCustomerName
              },
              {
                "type": "text",
                "text": finalPhone
              },
              {
                "type": "text",
                "text": finalRequestMessage
              }
            ]
          }
        ]
      },
      "pincode": finalPincode
    };

    // 5. Read environment variables for WAAU API
    const whatsappApiUrl = Deno.env.get("WHATSAPP_API_URL") || "https://crmapi.waau.in/api/meta/v19.0/1324931340699483/messages";
    const whatsappApiToken = Deno.env.get("WHATSAPP_API_TOKEN") || Deno.env.get("FINBOOK_SECRET") || "";

    console.log("WhatsApp API URL:", whatsappApiUrl);
    console.log("WhatsApp Payload:", JSON.stringify(payload, null, 2));

    let responseStatus: number | null = null;
    let responseText = "";
    let responseData: any = null;
    let apiSuccess = false;

    if (whatsappApiUrl) {
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json"
        };
        if (whatsappApiToken) {
          headers["Authorization"] = `Bearer ${whatsappApiToken}`;
          headers["x-api-key"] = whatsappApiToken;
          headers["apikey"] = whatsappApiToken;
        }

        let targetUrl = whatsappApiUrl;
        if (whatsappApiToken && !targetUrl.includes('access_token=')) {
          targetUrl += (targetUrl.includes('?') ? '&' : '?') + 'access_token=' + encodeURIComponent(whatsappApiToken);
        }

        const res = await fetch(targetUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(payload)
        });

        responseStatus = res.status;
        responseText = await res.text();

        console.log("WhatsApp Response Status:", responseStatus);
        console.log("WhatsApp Response:", responseText);

        try {
          responseData = JSON.parse(responseText);
        } catch (_e) {
          responseData = { raw: responseText };
        }

        // Response Validation: Treat as successful if HTTP Status is 200/ok AND contains Meta message ID or WAAU queue ID / queued status
        const hasMetaMessageId = Array.isArray(responseData?.messages) && responseData.messages.length > 0 && !!responseData.messages[0]?.id;
        const hasWaauQueueId = !!responseData?.message?.queue_id || responseData?.message?.message_status === 'queued';
        const isConfirmedSuccess = responseData?.success === true || responseData?.whatsapp_sent === true || hasWaauQueueId || hasMetaMessageId;
        apiSuccess = res.ok && isConfirmedSuccess;

      } catch (err: any) {
        console.error("Error sending WhatsApp API request:", err);
        responseData = { error: err.message || "Fetch failed" };
        apiSuccess = false;
      }
    } else {
      console.warn("WHATSAPP_API_URL is not configured.");
      responseData = { error: "WhatsApp API URL missing" };
      apiSuccess = false;
    }

    // 5b. Dispatch Email Notification alongside WhatsApp
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');
    const mailgunApiKey = Deno.env.get('MAILGUN_API_KEY');
    const mailgunDomain = Deno.env.get('MAILGUN_DOMAIN');
    const emailWebhookUrl = Deno.env.get('EMAIL_WEBHOOK_URL') || Deno.env.get('N8N_WEBHOOK_URL') || 'https://n8n.srv1691210.hstgr.cloud/webhook/finface-payment-success';
    const emailSecret = Deno.env.get('N8N_WEBHOOK_SECRET') || Deno.env.get('FINBOOK_SECRET');

    const emailSubject = `🚨 New Callback Request: ${finalCustomerName} (${finalQuoteNumber})`;
    const emailHtmlBody = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #12356b;">
        <h2 style="color: #12356b;">🚨 New Expert Callback Request</h2>
        <table style="border-collapse: collapse; width: 100%; max-width: 600px; font-size: 14px;">
          <tr><td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #e2e8f0; background: #f8fafc; width: 35%;">Company / Service:</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${finalServiceRequested}</td></tr>
          <tr><td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #e2e8f0; background: #f8fafc;">Customer Name:</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${finalCustomerName}</td></tr>
          <tr><td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #e2e8f0; background: #f8fafc;">Customer Phone:</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><a href="tel:+${finalPhone}">+${finalPhone}</a></td></tr>
          <tr><td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #e2e8f0; background: #f8fafc;">Quotation Reference:</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><b>${finalQuoteNumber}</b></td></tr>
          <tr><td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #e2e8f0; background: #f8fafc;">Location:</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${finalState} (${finalPincode})</td></tr>
          <tr><td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #e2e8f0; background: #f8fafc;">Request Note:</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Customer requested a callback regarding company capital & director requirements.</td></tr>
        </table>
        <p style="margin-top: 20px; font-size: 12px; color: #64748b;">This notification was automatically sent by FinBook System.</p>
      </div>
    `;

    let emailSent = false;
    let emailProviderUsed = 'none';

    // Provider 1: Resend API (resend.com)
    if (resendApiKey) {
      try {
        const resendResp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'FinBook Support <onboarding@resend.dev>',
            to: [supportEmail],
            subject: emailSubject,
            html: emailHtmlBody
          })
        });
        if (resendResp.ok) {
          emailSent = true;
          emailProviderUsed = 'resend';
        } else {
          console.error("Resend API response:", resendResp.status, await resendResp.text());
        }
      } catch (err) {
        console.error("Resend Email error:", err);
      }
    }

    // Provider 2: SendGrid API (sendgrid.com)
    if (!emailSent && sendgridApiKey) {
      try {
        const sgResp = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sendgridApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: supportEmail }] }],
            from: { email: 'support@finbook.in', name: 'FinBook Support' },
            subject: emailSubject,
            content: [{ type: 'text/html', value: emailHtmlBody }]
          })
        });
        if (sgResp.ok || sgResp.status === 202) {
          emailSent = true;
          emailProviderUsed = 'sendgrid';
        }
      } catch (err) {
        console.error("SendGrid Email error:", err);
      }
    }

    // Provider 3: Mailgun API (mailgun.com)
    if (!emailSent && mailgunApiKey && mailgunDomain) {
      try {
        const formData = new URLSearchParams();
        formData.append('from', `FinBook Support <mailgun@${mailgunDomain}>`);
        formData.append('to', supportEmail);
        formData.append('subject', emailSubject);
        formData.append('html', emailHtmlBody);

        const mgResp = await fetch(`https://api.mailgun.net/v3/${mailgunDomain}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa('api:' + mailgunApiKey),
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: formData.toString()
        });
        if (mgResp.ok) {
          emailSent = true;
          emailProviderUsed = 'mailgun';
        }
      } catch (err) {
        console.error("Mailgun Email error:", err);
      }
    }

    // Provider 4: Webhook / n8n email handler
    if (!emailSent && emailWebhookUrl) {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (emailSecret) headers['x-finbook-secret'] = emailSecret;
        await fetch(emailWebhookUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: 'callback_request_email',
            to_email: supportEmail,
            subject: emailSubject,
            html: emailHtmlBody,
            customer_name: finalCustomerName,
            customer_phone: finalPhone,
            service_requested: finalServiceRequested,
            quote_number: finalQuoteNumber
          })
        });
        emailSent = true;
        emailProviderUsed = 'webhook';
      } catch (err) {
        console.error("Email Webhook error:", err);
      }
    }

    // 6. Record in callback_requests table if quotation exists
    if (quote?.id) {
      await supabaseClient.from('callback_requests').insert({
        quotation_id: quote.id,
        application_reference: finalQuoteNumber,
        customer_name: finalCustomerName,
        phone: finalPhone,
        email: quote.email || null,
        business_type: finalServiceRequested,
        quotation_amount: quote.total ? Number(quote.total) : 0,
        status: 'pending',
        notification_sent: apiSuccess
      });
    }

    // 7. Return response
    if (apiSuccess) {
      return new Response(
        JSON.stringify({
          success: true,
          message: '✓ Callback Request Submitted. Our incorporation specialist will contact you shortly.',
          support_phone: supportPhone,
          quote_number: finalQuoteNumber,
          whatsapp_message_id: responseData?.message?.queue_id || responseData?.messages?.[0]?.id || 'queued'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.log("WhatsApp Token Info:", {
        token_present: !!whatsappApiToken,
        token_length: whatsappApiToken ? whatsappApiToken.length : 0,
        token_is_url: whatsappApiToken ? whatsappApiToken.startsWith('http') : false
      });

      return new Response(
        JSON.stringify({
          error: 'Unable to submit callback request. Please try again later.',
          details: responseData,
          status: responseStatus
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (err: any) {
    console.error("Unhandled request-callback error:", err);
    return new Response(
      JSON.stringify({ error: 'Unable to process callback request. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

