# Build brief: Finbook incorporation website — Supabase backend, quote flow, WhatsApp handoff, admin panel

Paste this whole file to Claude Code as your first message in this project. It has everything decided so far — don't re-ask me the questions it already answers.

## What already exists — don't rebuild these

- `C:/Users/devanand/Downloads/edt/finbook_website/index.html` — a responsive frontend prototype (desktop/tablet/mobile in one file), already tested at 11 screen widths from 320px to 1920px with no horizontal overflow. It currently shows a **sample, hardcoded** Kerala quotation — that's a placeholder, not real pricing.
- A Supabase project has been (or is about to be) set up, with `finbook_supabase_schema.sql` already run in its SQL Editor. That script created every table, type, and function referenced below — do not recreate them, just use them. If a table or function mentioned here doesn't exist, stop and tell me rather than inventing your own schema for it.
- A separate n8n workflow (WhatsApp bot "FinFace") already exists and is NOT part of this build. It exposes a webhook called `Payment Success Webhook` that:
  - requires a header `x-finbook-secret` with a shared-secret value (Header Auth credential),
  - accepts POST JSON: `{ phone, company_type, proposed_director_count, company_state, authorized_capital?, quote_number? }`,
  - `phone` must be digits only with country code, no `+`, no spaces (e.g. `919876543210`),
  - `company_type` must be EXACTLY one of: `"Private Limited Company"`, `"One Person Company (OPC)"`, `"Limited Liability Partnership (LLP)"`, `"Public Limited Company"`,
  - responds `{ success, sessionID, quote_number, whatsapp_sent }`.
  This webhook is the ONLY way this build talks to the WhatsApp bot. Never call it from the browser — only from a server-side Edge Function, because it carries a secret.

## Decisions already made — do not re-litigate these

1. **Backend: Supabase.** Postgres + Auth + Edge Functions. No other backend.
2. **No payment gateway yet.** Payment is on hold until a provider is chosen. Do NOT integrate Razorpay or any payment gateway. Build the flow so a payment step can be dropped in later without restructuring anything (see "Quote → accept flow" below).
3. **The WhatsApp bot (n8n) stays independent of Supabase during development.** It keeps quoting from its own prompt, not from the database. Do not add any call from n8n to Supabase, and do not change the n8n workflow at all — treat its webhook as a fixed external API.
4. **Pricing must exactly match what the WhatsApp bot quotes**, because customers may compare notes between the website and WhatsApp. The rules are already encoded in the database — call the database function, never re-implement the pricing math in JavaScript. See "Pricing" below.
5. **Prices must be admin-editable without a code change** — that's why they live in the database, not in the website's code.
6. **Existing quotations must keep their originally-quoted price forever**, even after an admin changes prices later. This is already handled: `calculate_quote()` is called once and its full JSON output is frozen into the `quotations.quote` column at the moment the quote is created.
7. **GST is a per-fee on/off switch**, currently off everywhere (`fee_items.gst_applies = false`, `plans.gst_applies = false`), matching the bot. Don't hardcode 18% anywhere in the frontend — read `gst_applies` and the `gst_amount` the database already computed.
8. Two plans exist per company type: **Basic** (₹2,499) and **Standard** (₹7,499). Offer both as a choice on the website (radio buttons or cards) — the customer picks one before their quote is generated. Standard's exact inclusions aren't finalized yet; use `plans.inclusions` (currently empty) if you need placeholder copy, and don't invent a price difference beyond what's in the `plans` table.

## Pricing — how to get a quote (never compute it yourself)

Call the Postgres function `calculate_quote(p_entity, p_state, p_director_count, p_authorized_capital, p_plan_code)` via Supabase's RPC call (`supabase.rpc('calculate_quote', {...})`). It's already granted to the `anon` role, so the browser can call it directly for a live preview if you want one, but the price that actually gets saved to a quotation must be computed **again, server-side, inside the Edge Function** in step 2 of the flow below — never trust a total the browser sends you.

- `p_entity` is one of the enum values: `'private_limited'`, `'opc'`, `'llp'`, `'public_limited'`. Map the customer's plain-English choice to these.
- `p_state` is a free-text Indian state name (matched case-insensitively against a fixed list of 35 — see the function body in the schema file if you need the exact list for a dropdown).
- `p_director_count` is a whole number ≥ 0.
- `p_authorized_capital` — omit it (or pass null) to use the default ₹1,00,000. Don't ask the customer for this on the website; the bot doesn't ask for it either at this stage.
- `p_plan_code` is `'basic'` or `'standard'`.

The function returns JSON like:
```json
{
  "entity": "private_limited",
  "company_type": "Private Limited Company",
  "state": "Kerala",
  "director_count": 2,
  "authorized_capital": 100000,
  "plan_code": "basic",
  "line_items": [ { "code": "...", "name": "...", "category": "...", "qty": 1, "unit_amount": 2499, "amount": 2499 }, ... ],
  "subtotal": 12995,
  "gst_amount": 0,
  "total": 12995,
  "advance_amount": 3248.75,
  "balance_amount": 9746.25,
  "to_confirm": []
}
```
- `company_type` is the exact label the n8n webhook expects — use this value verbatim when you call it later, don't reformat it.
- `advance_amount`/`balance_amount` are pre-split at the `advance_percent` setting (currently 25%) even though there's no payment step yet — display them as "payable now" / "payable later" so the copy doesn't need to change when a gateway is added.
- `to_confirm` is a list of plain-English strings for anything the database couldn't price confidently (e.g. LLP stamp duty, an unrecognised state, capital above ₹50 lakh). If it's non-empty, show those lines under the quote exactly as worded, don't suppress them.

## The quote → accept flow (this is the main thing to build)

Replace the sample Kerala quotation in `index.html` with this real flow. No payment step — end with a Yes/No question and a Continue button, per the decision above.

**Screen 1 — company basics.** A short form: company type (4 options), number of proposed directors (plain number), registered office state (dropdown or free text), name, email, phone (collect it in whatever format is natural to type, but normalize to digits-with-country-code before sending anywhere — strip spaces/`+`/dashes, and if it doesn't start with a country code, assume India and prepend `91`).

**Screen 2 — the quote.** On submit, call a new Supabase Edge Function `submit-quotation` (you build this) with the form data. That function must, server-side:
1. Validate the input (entity is a real enum value, director count ≥ 0, phone matches `^[1-9][0-9]{9,14}$` after normalizing, email looks like an email).
2. Call `calculate_quote(...)` itself using the service-role client — never trust a total from the browser.
3. Insert a row into `quotations` with `status = 'issued'`, the customer's details, and the full quote JSON in the `quote` column (the table's `total`/`advance_amount`/`balance_amount` columns get the matching numbers from that JSON — the schema already has a check constraint `total = advance_amount + balance_amount`, so make sure what you insert satisfies it).
4. Return the quote (line items, total, the two split amounts, `to_confirm`, and the generated `quote_number`) to the browser.

Render the breakdown as a plain itemised list (matches how the bot presents it over WhatsApp — no tables, just line, amount, line, amount, total). Below it, ask: **"Would you like to proceed with the registration at this cost?"** with **Yes** / **No** buttons.

- **No** → let them adjust the form and re-quote. Don't punish or nag them.
- **Yes** → reveal a single **Continue** button (don't auto-continue on Yes — Yes and Continue are two separate, deliberate clicks, so nobody proceeds by accident).

**Screen 3 — Continue clicked.** Call a second Edge Function `accept-quotation` with the `quote_number` (or the quotation id you got back in step 2). That function must, server-side:
1. Look up the quotation, confirm it's still `status = 'issued'` and not expired (`valid_until`).
2. Update it to `status = 'accepted'`.
3. Call the n8n `Payment Success Webhook` with the `x-finbook-secret` header (read the secret from an Edge Function environment secret — see "Secrets" below — never from a request the browser sent) and body `{ phone, company_type, proposed_director_count, company_state, authorized_capital, quote_number }`, using the values already stored on the quotation row, not values re-sent by the browser.
4. On a successful call, set `handoff_status = 'sent'`, `n8n_session_id` from the response's `sessionID`, `whatsapp_handoff_at = now()`. On failure (network error, non-2xx, or `whatsapp_sent: false` in the response), set `handoff_status = 'failed'`, increment `handoff_attempts`, and store the error in `handoff_error` — but still return success to the browser if the row itself saved correctly, so the customer isn't shown a scary error for something that's fixable on your end. Log it clearly enough that it's easy to notice and retry by hand later; don't build a retry queue yet, that's future work.
5. Return a simple confirmation to the browser.

Show a final screen: something like *"You're all set! We've sent you a WhatsApp message from FinFace — reply to continue your application."* Don't imply payment happened.

**Rate-limit `accept-quotation` by phone number** (e.g. reject a second accept for the same phone within a short window, or cap accepts per phone per day) — with no payment gate, this endpoint is the only thing stopping someone from spamming real WhatsApp template sends (which cost money per message) or flooding the n8n applications table with test rows. A simple check against existing `quotations` rows for that phone/day is enough for now; don't over-build this.

## Admin panel

A small set of pages (e.g. `admin/login.html` + `admin/dashboard.html`, or a single admin app — your call on structure) that:
- Log in with Supabase Auth (email + password). Only users present in `admin_users` should see anything — after login, check `is_admin()` (or query `admin_users` for the logged-in user's id) before showing the dashboard; sign out and show an error otherwise.
- List and edit `plans`: price, active on/off, per row.
- List and edit `fee_items`: amount, active on/off, `gst_applies` on/off, per row. Group by category (dsc / government / stamp_duty / service) so a state stamp-duty table of 35 rows doesn't read as a wall.
- Show a read-only table of `quotations`: quote number, customer name, phone, company type, total, status, handoff_status, created_at — newest first, with basic search/filter by phone or quote number. This is how Allen will notice a `handoff_status = 'failed'` row that needs manual attention.
- All of this works because the schema's RLS policies already grant full read/write on `plans`, `fee_items`, and read on `quotations` to any authenticated user who passes `is_admin()` — use the authenticated Supabase client (not the service-role key) for every admin-panel read/write, so RLS actually applies. Never put the service-role key in any page the browser loads, admin included.

## Secrets — what goes where

- **Frontend (`index.html`, admin pages):** only the Supabase Project URL and the **anon public key**. Both are safe to embed in client-side code — RLS is what actually protects the data, not keeping these secret.
- **Edge Functions only, set via `supabase secrets set` (never committed to a file, never sent to the browser):**
  - `SUPABASE_SERVICE_ROLE_KEY` — for `submit-quotation` and `accept-quotation` to bypass RLS and write `quotations`.
  - `N8N_WEBHOOK_URL` — the production URL of the n8n `Payment Success Webhook`. Not available yet — use a placeholder and a clearly marked TODO; I'll provide the real one once the n8n workflow is switched over.
  - `N8N_WEBHOOK_SECRET` — the `x-finbook-secret` value. Also not available yet — same treatment.

## Testing checklist before calling this done

- Quote a Kerala Private Limited company with 2 directors, Basic plan → total should be exactly ₹12,995 (this matches the bot's own worked example, so it's a good sanity check).
- Quote an LLP, or a state not in the list (e.g. Sikkim) → `to_confirm` should be non-empty and shown to the customer, and the total should still make sense without a stamp-duty line.
- Submit the form with an invalid phone (e.g. too short) → `submit-quotation` should reject it with a clear error, not silently save a bad number.
- Click Yes, then Continue, twice in a row on the same phone quickly → the second accept should be blocked by the rate limit, not send two WhatsApp messages.
- Re-check the site at a few widths (it was previously verified at 320px–1920px) to confirm the new quote flow doesn't break that.
- Log into the admin panel, change a price, confirm a freshly generated quote reflects it — and confirm a quotation created *before* the change still shows its original frozen price when viewed in the admin quotations list.
- Confirm nobody who isn't in `admin_users` can load the admin dashboard, even if they guess the URL.

## What NOT to do

- Don't touch the n8n workflow — it's finished and out of scope here.
- Don't add any payment gateway code, even as a stub — just the Yes/No/Continue flow described above.
- Don't have the browser call the n8n webhook directly, ever.
- Don't recompute pricing in JavaScript — always go through `calculate_quote()`.
- Don't invent database columns or tables beyond what `finbook_supabase_schema.sql` already defines — ask if something seems to be missing.
