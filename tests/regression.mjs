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
  const source = readFileSync(`supabase/functions/${name}/index.ts`, 'utf8').replace(/^import .*;\r?\n/gm, '');
  const client = { rpc: async () => rpcResult, from: () => chain(results[calls++] || {}, (method, args) => { if (['insert', 'update'].includes(method)) writes.push(args[0]); }) };
  vm.runInNewContext(source, { serve: fn => handler = fn, createClient: () => client, Deno: { env: { get: key => env[key] } }, Request, Response, crypto, AbortSignal, console: { error() {} }, fetch: async (_url, options) => { sends++; payloads.push(JSON.parse(options.body)); return Response.json(webhook); } });
  return { call: body => handler(new Request('http://localhost', { method: 'POST', body: JSON.stringify(body) })), get sends() { return sends; }, writes, payloads };
}
const base = { entity: 'private_limited', director_count: 2, plan_code: 'basic', state: 'Kerala', name: 'Example', email: 'example@example.com', phone: '9876543210' };
for (const change of [{ phone: null }, { phone: '123' }, { email: 'bad' }, { director_count: 1.5 }, { director_count: -1 }, { plan_code: 'invalid' }, { name: '' }, { state: '' }]) {
  const fn = await edge('submit-quotation');
  check((await fn.call({ ...base, ...change })).status === 400, `Reject invalid input ${JSON.stringify(change)}`);
}
const issued = await edge('submit-quotation', { rpcResult: { data: { ...quote.quote, company_type: quote.quote.company_type, total: 12995, advance_amount: 3248.75, balance_amount: 9746.25 } }, results: [{ data: { value: 15 } }, { data: { quote_number: 'FB-test' } }] });
check((await issued.call(base)).status === 200, 'Valid quote succeeds');
check(issued.writes[0].phone === '919876543210', 'Phone normalized');
check(issued.writes[0].total === 12995 && issued.writes[0].quote.total === 12995, 'Database result saved unchanged');
check(!('company_type' in issued.writes[0]) && issued.writes[0].entity === 'private_limited' && issued.writes[0].company_state === 'Kerala' && issued.writes[0].plan_code === 'basic' && issued.writes[0].proposed_director_count === 2 && Date.parse(issued.writes[0].valid_until) > Date.now(), 'Required schema fields are saved');
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
  w.matchMedia = () => ({ matches: false, addEventListener() {} });
  w.setInterval = () => 0;
  w.supabase = { createClient: () => client || {} };
  for (const script of w.document.querySelectorAll('script:not([src])')) vm.runInContext(script.textContent, dom.getInternalVMContext());
  await new Promise(resolve => setTimeout(resolve, 20));
  return dom;
}
const dom = await page('index1.html');
const w = dom.window;
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
login.window.document.getElementById('loginForm').dispatchEvent(new login.window.Event('submit', { cancelable: true }));
await new Promise(resolve => setTimeout(resolve, 20));
check(login.window.document.getElementById('errorMsg').textContent.includes('administrator'), 'Login rejects non-admin');
login.window.close();
console.log(`${checks} regression checks passed (mocked database and webhook; no live requests).`);
