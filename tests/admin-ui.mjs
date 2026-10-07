import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
const bundlePath = existsSync('admin/assets/admin-ui.js')
  ? 'admin/assets/admin-ui.js'
  : 'admin/assets/js/admin-ui.js';
const bundle = readFileSync(bundlePath, 'utf8');
const pause = () => new Promise(resolve => setTimeout(resolve,50));
function query() { const q={then: r => Promise.resolve({data:[]}).then(r)}; for(const k of ['select','order','limit'])q[k]=()=>q; return q; }
const dom=new JSDOM(readFileSync('admin/dashboard.html','utf8'),{url:'http://localhost/admin/dashboard.html',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window;
w.matchMedia=q=>({matches:q.includes('reduced-motion'),addEventListener(){},removeEventListener(){}});
w.scrollTo=()=>{};
w.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{user:{email:'admin@example.com'}}}})},rpc:async()=>({data:true}),from:query})};
vm.runInContext(bundle,dom.getInternalVMContext());
assert.equal(w.document.querySelector('.admin-navbar'),null,'No UI mounts before authorization');
for(const s of w.document.querySelectorAll('script:not([src])'))vm.runInContext(s.textContent,dom.getInternalVMContext());
await pause(); await pause();
assert.ok(w.document.querySelector('.admin-navbar'),'UI mounts after admin authorization');
assert.ok(w.document.querySelector('.outline-pill').textContent.includes('admin@example.com'));
function click(text){[...w.document.querySelectorAll('button')].find(b=>b.textContent===text).click();}
click('Review quotations'); await pause();
assert.ok(w.document.getElementById('quotations').classList.contains('active'));
assert.equal(w.document.querySelector('.admin-hero'),null);
click('Pricing'); await pause();
assert.ok(w.document.getElementById('pricing').classList.contains('active'));
assert.ok(!w.document.getElementById('quotations').classList.contains('active'));
click('Callbacks'); await pause();
assert.ok(w.document.getElementById('callbacks').classList.contains('active'));
assert.ok(!w.document.getElementById('pricing').classList.contains('active'));
click('Home'); await pause();
assert.ok(w.document.querySelector('.admin-hero'));
assert.equal(w.document.querySelector('.section.active'),null);
w.document.querySelector('.hamburger').click(); await pause();
assert.equal(w.document.querySelector('.hamburger').getAttribute('aria-expanded'),'true');
w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await pause();
assert.equal(w.document.querySelector('.hamburger').getAttribute('aria-expanded'),'false');
assert.equal(w.document.activeElement,w.document.querySelector('.hamburger'));
dom.window.close();
console.log('Admin UI checks passed: auth gate, email, navigation, home, menu, Escape and focus.');
