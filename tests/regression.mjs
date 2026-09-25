import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const quote = { id: 'id', quote_number: 'FB-test', status: 'issued', phone: '919876543210', customer_name: '<img src=x onerror=alert(1)>', total: 12995, proposed_director_count: 2, company_state: 'Kerala', authorized_capital: 100000, created_at: new Date().toISOString(), handoff_status: 'failed', quote: { company_type: 'Private Limited Company', entity: 'private_limited', plan_code: 'basic', director_count: 2, state: 'Kerala', authorized_capital: 100000 } };
let checks = 0;
function check(condition, message) { assert.ok(condition, message); checks++; }
function chain(result, record) {
  const q = { then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); } };
  for (const method of ['select', 'eq', 'gte', 'order', 'limit', 'single', 'maybeSingle', 'update', 'insert']) q[method] = (...args) => { record?.(method, args); return q; };
  return q;
}
async function edge(name, { results = [], rpcResult = {}, webhook = { success: true, whatsapp_sent: true }, env = {} } = {}) {
  let handler, calls = 0, sends = 0;
  const writes = [], payloads = [];
  const source = readFileSync(`supabase/functions/${name}/index.ts`, 'utf8')
    .replace(/^import .*;\r?\n/gm, '')
    .replace(/:\s*(Request|Response|string|number|boolean|any|unknown|Record<[^>]+>|\{\s*\[key:\s*string\]:\s*any\s*\})(\s*\|\s*null)?/g, '');
  const client = { rpc: async () => rpcResult, from: () => chain(results[calls++] || {}, (method, args) => { if (['insert', 'update'].includes(method)) writes.push(args[0]); }) };
  vm.runInNewContext(source, { serve: fn => handler = fn, createClient: () => client, Deno: { env: { get: key => env[key] } }, Request, Response, crypto, AbortSignal, console: { error() {} }, fetch: async (_url, options) => { sends++; payloads.push(JSON.parse(options.body)); return Response.json(webhook); } });
  return { call: body => handler(new Request('http://localhost', { method: 'POST', body: JSON.stringify(body) })), get sends() { return sends; }, writes, payloads };
}
const base = { entity: 'private_limited', director_count: 2, authorized_capital: 100000, plan_code: 'basic', state: 'Kerala', name: 'Example', email: 'example@example.com', phone: '9876543210' };
for (const change of [{ phone: null }, { phone: '123' }, { email: 'bad' }, { director_count: 1.5 }, { director_count: -1 }, { authorized_capital: 0 }, { authorized_capital: 1.5 }, { authorized_capital: 'not a number' }, { plan_code: 'invalid' }, { name: '' }, { name: 'Abilash123' }, { name: '12345' }, { name: 'John@Doe' }, { name: 'John_123' }, { state: '' }]) {
  const fn = await edge('submit-quotation');
  check((await fn.call({ ...base, ...change })).status === 400, `Reject invalid input ${JSON.stringify(change)}`);
}
const submitRateExceeded = await edge('submit-quotation', { results: [{ data: Array(10).fill({ id: 'x' }) }] });
check((await submitRateExceeded.call(base)).status === 429, 'Submit-quotation rate limit enforced');
const issued = await edge('submit-quotation', { rpcResult: { data: { ...quote.quote, company_type: quote.quote.company_type, total: 12995, advance_amount: 3248.75, balance_amount: 9746.25 } }, results: [{ data: [] }, { data: { value: 15 } }, { data: { quote_number: 'FB-test' } }] });
check((await issued.call(base)).status === 200, 'Valid quote succeeds');
check(issued.writes[0].phone === '919876543210', 'Phone normalized');
check(issued.writes[0].authorized_capital === 100000 && issued.writes[0].quote.authorized_capital === 100000, 'Entered authorized capital saved in database row and quote JSON');
check(issued.writes[0].total === 12995 && issued.writes[0].quote.total === 12995, 'Database result saved unchanged');
check(!('company_type' in issued.writes[0]) && issued.writes[0].entity === 'private_limited' && issued.writes[0].company_state === 'Kerala' && issued.writes[0].plan_code === 'basic' && issued.writes[0].proposed_director_count === 2 && Date.parse(issued.writes[0].valid_until) > Date.now(), 'Required schema fields are saved');
const changedCapital = await edge('submit-quotation', { rpcResult: { data: { ...quote.quote, total: 12995, advance_amount: 3248.75, balance_amount: 9746.25 } }, results: [{ data: [] }, { data: { value: 15 } }, { data: { quote_number: 'FB-capital' } }] });
const changedCapitalResponse = await changedCapital.call({ ...base, authorized_capital: 750000 });
const changedCapitalBody = await changedCapitalResponse.json();
check(changedCapital.writes[0].authorized_capital === 750000 && changedCapital.writes[0].quote.authorized_capital === 750000, 'Changed authorized capital saved exactly');
check(changedCapitalBody.authorized_capital === 750000, 'Saved authorized capital returned to customer');
const env = { N8N_WEBHOOK_URL: 'https://example.com/webhook', FINBOOK_SECRET: 'test-only' };
for (const [label, row, rate, claim, expected, sends] of [
  ['expired', { ...quote, valid_until: '2020-01-01' }, { data: [] }, { data: { id: 'id' } }, 410, 0],
  ['accepted', { ...quote, status: 'accepted' }, { data: [] }, { data: { id: 'id' } }, 400, 0],
  ['daily cap', quote, { data: Array(5).fill({ id: 'x' }) }, { data: { id: 'id' } }, 429, 0],
  ['rate lookup failure', quote, { error: new Error('db') }, {}, 500, 0],
  ['concurrent accept', quote, { data: [] }, { data: null }, 409, 0],
  ['save failure', quote, { data: [] }, { error: new Error('db') }, 500, 0],
  ['successful acceptance', quote, { data: [] }, { data: { id: 'id' } }, 200, 1],
]) {
  const fn = await edge('accept-quotation', { results: [{ data: row }, rate, claim, {}], env });
  check((await fn.call({ quote_number: 'FB-test' })).status === expected, label);
  check(fn.sends === sends, `${label}: webhook count`);
  if (sends) check(fn.payloads[0].company_type === 'Private Limited Company' && fn.payloads[0].proposed_director_count === 2 && fn.payloads[0].company_state === 'Kerala', 'Webhook uses persisted schema fields and frozen company label');
}
for (const webhook of [{ whatsapp_sent: false }, {}, { success: false, whatsapp_sent: true }]) {
  const fn = await edge('accept-quotation', { results: [{ data: quote }, { data: [] }, { data: { id: 'id' } }, {}], env, webhook });
  check((await (await fn.call({ quote_number: 'FB-test' })).json()).handoffStatus === 'failed', 'Unconfirmed webhook is failed');
}

async function page(file, client) {
  const dom = new JSDOM(readFileSync(file, 'utf8'), { url: 'https://example.com/' + file, runScripts: 'outside-only' });
  const w = dom.window;
  w.fetch = globalThis.fetch;
  w.matchMedia = () => ({ matches: false, addEventListener() {} });
  w.setInterval = () => 0;
  w.supabase = { createClient: () => client || {} };
  for (const script of w.document.querySelectorAll('script')) {
    const src = script.getAttribute('src');
    if (src && !src.startsWith('http') && !src.startsWith('//')) {
      try {
        const code = readFileSync(src.replace(/^\//, ''), 'utf8');
        vm.runInContext(code, dom.getInternalVMContext());
      } catch(e) {}
    } else if (!src) {
      vm.runInContext(script.textContent, dom.getInternalVMContext());
    }
  }
  await new Promise(resolve => setTimeout(resolve, 20));
  return dom;
}
const dom = await page('index.html');
const w = dom.window;

// Test front-end field validation functions
const dockName = w.document.getElementById('dockName');
const dockNameErr = w.document.getElementById('dockNameError');
const dockPhone = w.document.getElementById('dockPhone');
const dockPhoneErr = w.document.getElementById('dockPhoneError');

if (dockName && dockNameErr) {
  dockName.value = 'Abilash123';
  w.validateNameInput(dockName, dockNameErr);
  check(dockNameErr.style.display === 'block' && dockNameErr.textContent.includes('Numbers and special characters'), 'dockName rejects invalid chars');

  dockName.value = 'Abilash OM';
  w.validateNameInput(dockName, dockNameErr);
  check(dockNameErr.style.display === 'none', 'dockName accepts valid name');
}

if (dockPhone && dockPhoneErr) {
  // Invalid examples
  dockPhone.value = '12345';
  w.validatePhoneInput(dockPhone, dockPhoneErr);
  check(dockPhoneErr.style.display === 'block' && dockPhoneErr.textContent.includes('valid 10-digit WhatsApp number'), 'dockPhone rejects 5-digit number');

  dockPhone.value = '987654321';
  w.validatePhoneInput(dockPhone, dockPhoneErr);
  check(dockPhoneErr.style.display === 'block' && dockPhoneErr.textContent.includes('valid 10-digit WhatsApp number'), 'dockPhone rejects 9-digit number');

  dockPhone.value = 'abcdefghij';
  w.validatePhoneInput(dockPhone, dockPhoneErr);
  check(dockPhoneErr.style.display === 'block' && dockPhoneErr.textContent.includes('valid 10-digit WhatsApp number'), 'dockPhone rejects non-numeric input');

  dockPhone.value = '98765abcde';
  w.validatePhoneInput(dockPhone, dockPhoneErr);
  check(dockPhoneErr.style.display === 'block' && dockPhoneErr.textContent.includes('valid 10-digit WhatsApp number'), 'dockPhone rejects alphanumeric input');

  // Valid examples & automatic sanitization
  dockPhone.value = '9876543210';
  w.validatePhoneInput(dockPhone, dockPhoneErr);
  check(dockPhoneErr.style.display === 'none', 'dockPhone accepts 9876543210');

  dockPhone.value = '9123456789';
  w.validatePhoneInput(dockPhone, dockPhoneErr);
  check(dockPhoneErr.style.display === 'none', 'dockPhone accepts 9123456789');

  dockPhone.value = '+919876543210';
  w.validatePhoneInput(dockPhone, dockPhoneErr);
  check(dockPhone.value === '9876543210' && dockPhoneErr.style.display === 'none', 'dockPhone strips +91 and accepts 10 digits');

  dockPhone.value = '98765432101';
  w.validatePhoneInput(dockPhone, dockPhoneErr);
  check(dockPhone.value === '9876543210' && dockPhoneErr.style.display === 'none', 'dockPhone truncates extra digits past 10');
}

const dirInput = w.document.createElement('input');
const dirErr = w.document.createElement('span');
dirInput.value = '150';
w.validateDirectorsInput(dirInput, dirErr);
check(dirErr.textContent.includes('between 0 and 100'), 'qbDirectors rejects > 100');

const capInput = w.document.createElement('input');
const capErr = w.document.createElement('span');
capInput.value = '0';
w.validateCapitalInput(capInput, capErr);
check(capErr.textContent.includes('at least ₹1'), 'capitalAmount rejects < 1');

const locInput = w.document.createElement('input');
const locErr = w.document.createElement('span');
locInput.value = '12345';
w.validateLocationInput(locInput, locErr);
check(locErr.textContent.includes('exactly 6 digits'), 'officeLocation rejects 5-digit PIN');

locInput.value = '682024';
w.validateLocationInput(locInput, locErr);
const validResult = await w.validateLocationInputAsync(locInput, locErr);
check(validResult === true, 'officeLocation accepts valid Indian 6-digit PIN (682024)');
check(locErr.textContent.includes('Kerala'), 'officeLocation auto-retrieves state info for valid PIN');

locInput.value = '999999';
const invalidResult = await w.validateLocationInputAsync(locInput, locErr);
check(invalidResult === false, 'officeLocation rejects non-existent 6-digit PIN (999999)');
check(locErr.textContent.includes('Please enter a valid Indian PIN code.'), 'officeLocation displays "Please enter a valid Indian PIN code." for fake PIN');

let frontendSubmitPayload;
w.fetch = async (_url, options) => {
  frontendSubmitPayload = JSON.parse(options.body);
  return new Response(JSON.stringify({ quote_number: 'FB-capital', authorized_capital: 750000 }), { headers: { 'Content-Type': 'application/json' } });
};
vm.runInContext(`demoCustomer = { name: 'Example', phone: '9876543210', directors: 2, capital: 750000, location: 'Kerala' }; selectedType = 'Private Limited Company'; selectedPackage = { id: 'basic', name: 'Basic', price: 2499 };`, dom.getInternalVMContext());
await w.saveQuotationToDatabase();
check(frontendSubmitPayload.authorized_capital === 750000, 'Customer form submits the edited authorized capital');

vm.runInContext(`customerDetails = { name: 'Example', state: 'Kerala', director_count: 2 }; currentQuote = { quote_number: 'FB-test', line_items: [], to_confirm: [], total: 100, advance_amount: 25, balance_amount: 75 }; showQuote();`, dom.getInternalVMContext());
check(w.document.querySelectorAll('.flow-progress li')[1].classList.contains('active'), 'Review progress selected');
w.showDetails();
check(w.document.getElementById('qbName').value === 'Example', 'Edit preserves name');
check(w.document.getElementById('qbDirectors').value === '2', 'Edit preserves directors');
w.showHandoff('failed');
check(w.document.getElementById('flow-content').textContent.includes('could not confirm'), 'Failed handoff is truthful');
w.showHandoff('sent');
check(w.document.getElementById('flow-content').textContent.includes('We’ve sent'), 'Confirmed handoff succeeds');
check(!w.document.body.textContent.includes('Razorpay'), 'No payment gateway promise');
dom.window.close();

let reads = 0;
const denied = await page('admin/dashboard.html', { auth: { getSession: async () => ({ data: { session: {} } }), signOut: async () => ({}) }, rpc: async () => ({ data: false }), from: () => { reads++; return chain({ data: [] }); } });
check(reads === 0, 'Non-admin cannot load dashboard data');
check(denied.window.document.querySelector('.main-content').style.display === 'none', 'Non-admin dashboard remains hidden');
denied.window.close();
const admin = await page('admin/dashboard.html', { auth: { getSession: async () => ({ data: { session: {} } }) }, rpc: async () => ({ data: true }), from: table => chain({ data: table === 'quotations' ? [quote] : [] }) });
check(admin.window.document.getElementById('quotationsBody').textContent.includes('919876543210'), 'Admin shows saved phone');
check(admin.window.document.getElementById('quotationsBody').textContent.includes('1,00,000'), 'Admin shows saved authorized capital');
check(admin.window.document.getElementById('quotationsBody').textContent.includes('12,995'), 'Admin shows saved total');
check(!admin.window.document.getElementById('quotationsBody').querySelector('img'), 'Customer content escaped');
admin.window.close();
const priceWrites = [];
const pricing = await page('admin/dashboard.html', {
  auth: { getSession: async () => ({ data: { session: {} } }) }, rpc: async () => ({ data: true }),
  from: table => chain({ data: table === 'plans' ? [{ id: 'plan1', name: 'Basic', code: 'basic', entity: 'private_limited', price: 2499, active: true }] : table === 'fee_items' ? [{ id: 'fee1', name: 'DSC', basis: 'per_director', category: 'dsc', amount: 2500, active: true, gst_applies: false }] : [] }, (method, args) => { if (method === 'update') priceWrites.push({ table, value: args[0] }); })
});
check(pricing.window.document.getElementById('plan_plan1').value === '2499', 'Plan uses price');
check(pricing.window.document.getElementById('plan_active_plan1').checked, 'Plan uses active');
check(pricing.window.document.getElementById('fee_active_fee1').checked, 'Fee uses active');
check(pricing.window.document.getElementById('feesGrid').textContent.includes('Per Director'), 'Fee uses basis');
await pricing.window.updatePlan('plan1');
await pricing.window.updateFee('fee1');
check(priceWrites[0].value.price === 2499 && priceWrites[0].value.active === true && !('amount' in priceWrites[0].value), 'Plan updates schema columns');
check(priceWrites[1].value.amount === 2500 && priceWrites[1].value.active === true && !('is_active' in priceWrites[1].value), 'Fee updates schema columns');
pricing.window.close();
const login = await page('admin/login.html', { auth: { getSession: async () => ({ data: {} }), signInWithPassword: async () => ({ data: {}, error: null }), signOut: async () => ({}) }, rpc: async () => ({ data: false }) });
login.window.document.getElementById('email').value = 'invalid-email';
login.window.document.getElementById('password').value = '123';
login.window.document.getElementById('loginForm').dispatchEvent(new login.window.Event('submit', { cancelable: true }));
check(login.window.document.getElementById('errorMsg').textContent.includes('valid email address'), 'Login rejects invalid email format');

login.window.document.getElementById('email').value = 'admin@finbook.com';
login.window.document.getElementById('loginForm').dispatchEvent(new login.window.Event('submit', { cancelable: true }));
check(login.window.document.getElementById('errorMsg').textContent.includes('6 characters'), 'Login rejects short password');

login.window.document.getElementById('password').value = 'secret123';
login.window.document.getElementById('loginForm').dispatchEvent(new login.window.Event('submit', { cancelable: true }));
await new Promise(resolve => setTimeout(resolve, 20));
check(login.window.document.getElementById('errorMsg').textContent.includes('administrator'), 'Login rejects non-admin');
login.window.close();
console.log(`${checks} regression checks passed (mocked database and webhook; no live requests).`);
