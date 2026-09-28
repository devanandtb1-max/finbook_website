const APP_CONFIG = window.APP_CONFIG || {};
const SUPABASE_URL = APP_CONFIG.SUPABASE_URL || (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) || 'https://nuiflptifdkexotxnxcp.supabase.co';
const SUPABASE_ANON_KEY = APP_CONFIG.SUPABASE_ANON_KEY || (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) || 'sb_publishable_GfhZQfgUfhaiszDCu5JBZw_2c5zcNoG';
const N8N_WEBHOOK_URL = APP_CONFIG.N8N_WEBHOOK_URL || (typeof process !== 'undefined' && process.env?.VITE_N8N_WEBHOOK_URL) || 'https://n8n.srv1691210.hstgr.cloud/webhook/finface-payment-success';


let systemSettings = {
  support_phone: '+919876543210',
  support_whatsapp: '+919876543210',
  support_email: 'support@finbook.in',
  business_hours: 'Mon-Sat, 9:00 AM - 6:00 PM',
  advance_percent: 25,
  gst_rate_percent: 18,
  quotation_valid_days: 15,
  default_authorized_capital: 100000
};

function updateAdvancePercentUI() {
  if (typeof document === 'undefined' || !document.querySelectorAll) return;
  const advPct = getAdvancePercent();
  const balPct = 100 - advPct;
  document.querySelectorAll('.adv-pct-text').forEach(el => el.textContent = String(advPct));
  document.querySelectorAll('.bal-pct-text').forEach(el => el.textContent = String(balPct));
}

async function loadSystemSettings() {
  try {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      if (sb && typeof sb.from === 'function') {
        const { data, error } = await sb.from('settings').select('key, value');
        if (!error && data && Array.isArray(data)) {
          data.forEach(item => {
            if (item.key && item.value !== undefined && item.value !== null) {
              const val = item.value;
              systemSettings[item.key] = (!isNaN(Number(val)) && item.key !== 'support_phone' && item.key !== 'support_whatsapp') ? Number(val) : String(val);
            }
          });
          updateAdvancePercentUI();
          return systemSettings;
        }
      }
    }
    if (typeof fetch !== 'undefined') {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/settings?select=key,value`, {
        headers: { 'apikey': SUPABASE_ANON_KEY }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          data.forEach(item => {
            if (item.key && item.value !== undefined && item.value !== null) {
              const val = item.value;
              systemSettings[item.key] = (!isNaN(Number(val)) && item.key !== 'support_phone' && item.key !== 'support_whatsapp') ? Number(val) : String(val);
            }
          });
          updateAdvancePercentUI();
        }
      }
    }
  } catch (e) {
    console.warn('Could not fetch settings from Supabase, using defaults:', e);
  }
  updateAdvancePercentUI();
  return systemSettings;
}

function updateContactModalUI() {
  const phone = systemSettings.support_phone || '+919876543210';
  const whatsapp = systemSettings.support_whatsapp || phone;
  const email = systemSettings.support_email || '';
  const hours = systemSettings.business_hours || 'Mon-Sat, 9:00 AM - 6:00 PM';

  const cleanPhone = phone.replace(/\D/g, '');
  const cleanWhatsapp = whatsapp.replace(/\D/g, '');

  const phoneEl = document.getElementById('modalSupportPhone');
  if (phoneEl) phoneEl.textContent = phone;

  const waEl = document.getElementById('modalWhatsAppPhone');
  if (waEl) waEl.textContent = whatsapp;

  const emailRow = document.getElementById('modalEmailRow');
  const emailEl = document.getElementById('modalSupportEmail');
  if (emailRow && emailEl) {
    if (email) {
      emailEl.textContent = email;
      emailRow.style.display = 'flex';
    } else {
      emailRow.style.display = 'none';
    }
  }

  const hoursEl = document.getElementById('modalBusinessHours');
  if (hoursEl) hoursEl.textContent = hours;

  const btnCall = document.getElementById('btnCallNow');
  if (btnCall) btnCall.href = `tel:+${cleanPhone}`;

  const btnWa = document.getElementById('btnWhatsApp');
  if (btnWa) btnWa.href = `https://wa.me/${cleanWhatsapp}`;
}

async function openContactModal() {
  await loadSystemSettings();
  updateContactModalUI();
  const modal = document.getElementById('contactModal');
  if (modal) {
    if (typeof modal.showModal === 'function') {
      modal.showModal();
    } else {
      modal.setAttribute('open', '');
    }
  }
}

function closeContactModal() {
  const modal = document.getElementById('contactModal');
  if (modal) {
    if (typeof modal.close === 'function') {
      modal.close();
    } else {
      modal.removeAttribute('open');
    }
  }
  const toast = document.getElementById('contactCopyToast');
  if (toast) toast.style.display = 'none';
}

async function copyContactNumber() {
  const phone = systemSettings.support_phone || '+919876543210';
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(phone);
    } else {
      const ta = document.createElement('textarea');
      ta.value = phone;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    const toast = document.getElementById('contactCopyToast');
    if (toast) {
      toast.textContent = '✓ Phone number copied successfully.';
      toast.style.display = 'block';
      setTimeout(() => { toast.style.display = 'none'; }, 3000);
    }
  } catch (e) {
    const toast = document.getElementById('contactCopyToast');
    if (toast) {
      toast.textContent = 'Phone number: ' + phone;
      toast.style.display = 'block';
    }
  }
}

let previousFocus;
function toggleMenu(button){const open=document.querySelector('nav.links').classList.toggle('menu-open');button.setAttribute('aria-expanded',String(open));}
function closeMobileMenu(){const nav=document.querySelector('nav.links');if(nav){nav.classList.remove('menu-open');const btn=document.querySelector('.menu-toggle');if(btn)btn.setAttribute('aria-expanded','false');}}
function openDock(){document.getElementById('quote').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});const field=document.querySelector('#flow-content input, #flow-content button');field?.focus({preventScroll:true});}
function closeDock(){document.getElementById('dockPanel').classList.remove('open');document.getElementById('dockPanel').inert=true;document.getElementById('overlay').classList.remove('show');document.body.style.overflow='';previousFocus?.focus();}
function validateNameInput(inputEl, errorEl) {
  if (!inputEl) return false;
  const val = inputEl.value;
  const trimmed = val.trim();
  let msg = '';
  if (!val || !trimmed) {
    msg = 'Please enter your name.';
  } else if (/[^A-Za-z .'-]/.test(val)) {
    msg = 'Numbers and special characters are not allowed. Please use letters, spaces, dots or hyphens.';
  } else if (trimmed.length < 2) {
    msg = 'Name must be at least 2 characters long.';
  }

  if (msg) {
    inputEl.setCustomValidity(msg);
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.style.display = 'block';
    }
    inputEl.reportValidity();
    return false;
  }
  inputEl.setCustomValidity('');
  if (errorEl) { errorEl.style.display = 'none'; errorEl.textContent = ''; }
  return true;
}

function validatePhoneInput(inputEl, errorEl) {
  if (!inputEl) return false;

  let rawVal = inputEl.value;
  let digits = rawVal.replace(/\D/g, '');

  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }

  if (digits.length > 10) {
    digits = digits.slice(0, 10);
  }

  if (inputEl.value !== digits) {
    inputEl.value = digits;
  }

  let msg = '';
  if (!digits || digits.length < 10) {
    msg = 'Please enter a valid 10-digit WhatsApp number.';
  } else if (/^0+$/.test(digits)) {
    msg = 'Please enter a valid 10-digit WhatsApp number.';
  }

  if (msg) {
    inputEl.setCustomValidity(msg);
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.style.color = '#e53e3e';
      errorEl.style.display = 'block';
    }
    inputEl.reportValidity();
    return false;
  }
  inputEl.setCustomValidity('');
  if (errorEl) { errorEl.style.display = 'none'; errorEl.textContent = ''; }
  return true;
}

function validateDirectorsInput(inputEl, errorEl) {
  if (!inputEl) return false;
  const val = inputEl.value.trim();
  let msg = '';
  if (val === '') {
    msg = 'Please enter the number of proposed directors/partners.';
  } else {
    const num = Number(val);
    if (isNaN(num) || !Number.isInteger(num) || num < 0 || num > 100) {
      msg = 'Number of directors must be an integer between 0 and 100.';
    }
  }

  if (msg) {
    inputEl.setCustomValidity(msg);
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.style.display = 'block';
    }
    inputEl.reportValidity();
    return false;
  }
  inputEl.setCustomValidity('');
  if (errorEl) { errorEl.style.display = 'none'; errorEl.textContent = ''; }
  return true;
}

function validateCapitalInput(inputEl, errorEl, labelName) {
  if (!inputEl) return false;
  const val = inputEl.value.trim();
  const label = labelName || 'Capital amount';
  let msg = '';
  if (val === '') {
    msg = `Please enter ${label.toLowerCase()}.`;
  } else {
    const num = Number(val);
    if (!Number.isSafeInteger(num) || num < 1) {
      msg = `${label} must be at least ₹1.`;
    }
  }

  if (msg) {
    inputEl.setCustomValidity(msg);
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.style.display = 'block';
    }
    inputEl.reportValidity();
    return false;
  }
  inputEl.setCustomValidity('');
  if (errorEl) { errorEl.style.display = 'none'; errorEl.textContent = ''; }
  return true;
}

function getStateFromPincodePrefix(pincode) {
  if (!/^\d{6}$/.test(pincode)) return null;
  const prefix2 = pincode.slice(0, 2);
  const map = {
    '11': { state: 'Delhi', district: 'New Delhi' },
    '12': { state: 'Haryana', district: 'Gurugram' },
    '13': { state: 'Haryana', district: 'Faridabad' },
    '14': { state: 'Punjab', district: 'Ludhiana' },
    '15': { state: 'Punjab', district: 'Amritsar' },
    '16': { state: 'Chandigarh', district: 'Chandigarh' },
    '17': { state: 'Himachal Pradesh', district: 'Shimla' },
    '18': { state: 'Jammu and Kashmir', district: 'Jammu' },
    '19': { state: 'Jammu and Kashmir', district: 'Srinagar' },
    '20': { state: 'Uttar Pradesh', district: 'Noida' },
    '21': { state: 'Uttar Pradesh', district: 'Allahabad' },
    '22': { state: 'Uttar Pradesh', district: 'Lucknow' },
    '23': { state: 'Uttar Pradesh', district: 'Varanasi' },
    '24': { state: 'Uttar Pradesh', district: 'Bareilly' },
    '25': { state: 'Uttar Pradesh', district: 'Meerut' },
    '26': { state: 'Uttarakhand', district: 'Dehradun' },
    '27': { state: 'Uttar Pradesh', district: 'Gorakhpur' },
    '28': { state: 'Uttar Pradesh', district: 'Agra' },
    '30': { state: 'Rajasthan', district: 'Jaipur' },
    '31': { state: 'Rajasthan', district: 'Udaipur' },
    '32': { state: 'Rajasthan', district: 'Kota' },
    '33': { state: 'Rajasthan', district: 'Bikaner' },
    '34': { state: 'Rajasthan', district: 'Jodhpur' },
    '36': { state: 'Gujarat', district: 'Rajkot' },
    '37': { state: 'Gujarat', district: 'Kutch' },
    '38': { state: 'Gujarat', district: 'Ahmedabad' },
    '39': { state: 'Gujarat', district: 'Surat' },
    '40': { state: 'Maharashtra', district: 'Mumbai' },
    '41': { state: 'Maharashtra', district: 'Pune' },
    '42': { state: 'Maharashtra', district: 'Nashik' },
    '43': { state: 'Maharashtra', district: 'Aurangabad' },
    '44': { state: 'Maharashtra', district: 'Nagpur' },
    '45': { state: 'Madhya Pradesh', district: 'Indore' },
    '46': { state: 'Madhya Pradesh', district: 'Bhopal' },
    '47': { state: 'Madhya Pradesh', district: 'Gwalior' },
    '48': { state: 'Madhya Pradesh', district: 'Jabalpur' },
    '49': { state: 'Chhattisgarh', district: 'Raipur' },
    '50': { state: 'Telangana', district: 'Hyderabad' },
    '51': { state: 'Andhra Pradesh', district: 'Tirupati' },
    '52': { state: 'Andhra Pradesh', district: 'Vijayawada' },
    '53': { state: 'Andhra Pradesh', district: 'Visakhapatnam' },
    '56': { state: 'Karnataka', district: 'Bengaluru' },
    '57': { state: 'Karnataka', district: 'Mysuru' },
    '58': { state: 'Karnataka', district: 'Hubballi' },
    '59': { state: 'Karnataka', district: 'Belagavi' },
    '60': { state: 'Tamil Nadu', district: 'Chennai' },
    '61': { state: 'Tamil Nadu', district: 'Thanjavur' },
    '62': { state: 'Tamil Nadu', district: 'Madurai' },
    '63': { state: 'Tamil Nadu', district: 'Vellore' },
    '64': { state: 'Tamil Nadu', district: 'Coimbatore' },
    '67': { state: 'Kerala', district: 'Kozhikode' },
    '68': { state: 'Kerala', district: 'Ernakulam' },
    '69': { state: 'Kerala', district: 'Thiruvananthapuram' },
    '70': { state: 'West Bengal', district: 'Kolkata' },
    '71': { state: 'West Bengal', district: 'Howrah' },
    '72': { state: 'West Bengal', district: 'Hooghly' },
    '73': { state: 'West Bengal', district: 'Kharagpur' },
    '74': { state: 'West Bengal', district: 'Siliguri' },
    '75': { state: 'Odisha', district: 'Bhubaneswar' },
    '76': { state: 'Odisha', district: 'Cuttack' },
    '77': { state: 'Odisha', district: 'Rourkela' },
    '78': { state: 'Assam', district: 'Guwahati' },
    '79': { state: 'Arunachal Pradesh', district: 'Itanagar' },
    '80': { state: 'Bihar', district: 'Patna' },
    '81': { state: 'Bihar', district: 'Gaya' },
    '82': { state: 'Bihar', district: 'Bhagalpur' },
    '83': { state: 'Jharkhand', district: 'Ranchi' },
    '84': { state: 'Jharkhand', district: 'Dhanbad' },
    '85': { state: 'Bihar', district: 'Muzaffarpur' }
  };
  return map[prefix2] || null;
}

const pincodeCache = new Map();

async function verifyPincode(pincode) {
  if (!/^\d{6}$/.test(pincode)) {
    return { valid: false, exists: false, message: 'PIN code must be exactly 6 digits (e.g. 682024).' };
  }
  if (pincodeCache.has(pincode)) {
    return pincodeCache.get(pincode);
  }
  const instantInfo = getStateFromPincodePrefix(pincode);
  const fetchFn = typeof fetch !== 'undefined' ? fetch : (typeof window !== 'undefined' ? window.fetch : null);
  if (!fetchFn) {
    return { valid: true, exists: true, isUnverifiedFallback: true, state: instantInfo ? instantInfo.state : 'Kerala', district: instantInfo ? instantInfo.district : '' };
  }
  try {
    const res = await fetchFn(`https://api.postalpincode.in/pincode/${pincode}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data[0]) {
        if (data[0].Status === 'Success' && Array.isArray(data[0].PostOffice) && data[0].PostOffice.length > 0) {
          const po = data[0].PostOffice[0];
          const result = {
            valid: true,
            exists: true,
            pincode: pincode,
            state: po.State || (instantInfo ? instantInfo.state : ''),
            district: po.District || (instantInfo ? instantInfo.district : ''),
            postOffice: po.Name || '',
            locationString: `${po.District ? po.District + ', ' : ''}${po.State || ''}`.trim()
          };
          pincodeCache.set(pincode, result);
          return result;
        } else if (data[0].Status === 'Error') {
          if (instantInfo) {
            const result = { valid: true, exists: true, pincode: pincode, state: instantInfo.state, district: instantInfo.district, locationString: `${instantInfo.district}, ${instantInfo.state}` };
            pincodeCache.set(pincode, result);
            return result;
          }
          const result = { valid: false, exists: false, message: 'Please enter a valid Indian PIN code.' };
          pincodeCache.set(pincode, result);
          return result;
        }
      }
    }
  } catch (err) {
    console.warn('Postal PIN Code API error, trying fallback:', err);
  }

  try {
    const fallbackRes = await fetchFn(`https://api.zippopotam.us/in/${pincode}`);
    if (fallbackRes.ok) {
      const data = await fallbackRes.json();
      if (data && data.places && data.places.length > 0) {
        const place = data.places[0];
        const result = {
          valid: true,
          exists: true,
          pincode: pincode,
          state: place.state || (instantInfo ? instantInfo.state : ''),
          district: place['place name'] || (instantInfo ? instantInfo.district : ''),
          locationString: `${place['place name'] ? place['place name'] + ', ' : ''}${place.state || ''}`.trim()
        };
        pincodeCache.set(pincode, result);
        return result;
      }
    } else if (fallbackRes.status === 404) {
      if (instantInfo) {
        const result = { valid: true, exists: true, pincode: pincode, state: instantInfo.state, district: instantInfo.district, locationString: `${instantInfo.district}, ${instantInfo.state}` };
        pincodeCache.set(pincode, result);
        return result;
      }
      const result = { valid: false, exists: false, message: 'Please enter a valid Indian PIN code.' };
      pincodeCache.set(pincode, result);
      return result;
    }
  } catch (fallbackErr) {
    console.warn('Fallback PIN Code API error:', fallbackErr);
  }

  const fallbackResult = { valid: true, exists: true, pincode: pincode, isUnverifiedFallback: true, state: instantInfo ? instantInfo.state : 'Kerala', district: instantInfo ? instantInfo.district : '', locationString: instantInfo ? `${instantInfo.district}, ${instantInfo.state}` : 'Kerala' };
  pincodeCache.set(pincode, fallbackResult);
  return fallbackResult;
}

function autoFillLocationFields(info) {
  if (!info) return;
  const pincodeField = document.getElementById('officeLocation') || document.getElementById('qbPincode');
  const districtField = document.getElementById('qbDistrict') || document.getElementById('district');
  const stateField = document.getElementById('qbState') || document.getElementById('state');
  if (districtField && info.district) districtField.value = info.district;
  if (stateField && info.state) stateField.value = info.state;
  if (typeof demoCustomer !== 'undefined' && demoCustomer) {
    if (info.pincode || (info.locationString && info.locationString.match(/\d{6}/))) {
      demoCustomer.pincode = info.pincode || info.locationString.match(/\d{6}/)[0];
    }
    if (info.state) demoCustomer.state = info.state;
    if (info.district) demoCustomer.district = info.district;
    if (info.locationString) demoCustomer.locationDetails = info.locationString;
  }
}

function validateLocationInput(inputEl, errorEl) {
  if (!inputEl) return false;
  const val = inputEl.value.trim();
  let msg = '';
  if (!val) {
    msg = 'Enter a six-digit PIN code or state name.';
  } else if (/^\d+$/.test(val)) {
    if (!/^\d{6}$/.test(val)) {
      msg = 'PIN code must be exactly 6 digits (e.g. 682024).';
    }
  } else if (val.length < 2 || !/^[A-Za-z\s,.-]+$/.test(val)) {
    msg = 'State name must be at least 2 characters and contain letters only.';
  }

  if (msg) {
    inputEl.setCustomValidity(msg);
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.style.color = '#e53e3e';
      errorEl.style.display = 'block';
    }
    inputEl.reportValidity();
    return false;
  }

  if (/^\d{6}$/.test(val)) {
    const instant = getStateFromPincodePrefix(val);
    if (instant) {
      autoFillLocationFields({ pincode: val, state: instant.state, district: instant.district, locationString: `${instant.district}, ${instant.state}` });
    }
    if (pincodeCache.has(val)) {
      const cached = pincodeCache.get(val);
      if (!cached.exists) {
        const invalidMsg = 'Please enter a valid Indian PIN code.';
        inputEl.setCustomValidity(invalidMsg);
        if (errorEl) {
          errorEl.textContent = invalidMsg;
          errorEl.style.color = '#e53e3e';
          errorEl.style.display = 'block';
        }
        inputEl.reportValidity();
        return false;
      } else {
        inputEl.setCustomValidity('');
        if (errorEl) {
          if (cached.locationString) {
            errorEl.textContent = `✓ Verified: ${cached.locationString}`;
            errorEl.style.color = '#12356B';
            errorEl.style.display = 'block';
          } else {
            errorEl.style.display = 'none';
            errorEl.textContent = '';
          }
        }
        autoFillLocationFields(cached);
        return true;
      }
    } else {
      inputEl.setCustomValidity('');
      if (errorEl) {
        errorEl.textContent = instant ? `✓ Verified: ${instant.district}, ${instant.state}` : 'Verifying PIN code...';
        errorEl.style.color = '#12356B';
        errorEl.style.display = 'block';
      }
      verifyPincode(val).then(res => {
        if (inputEl.value.trim() !== val) return;
        if (!res.exists) {
          const invalidMsg = res.message || 'Please enter a valid Indian PIN code.';
          inputEl.setCustomValidity(invalidMsg);
          if (errorEl) {
            errorEl.textContent = invalidMsg;
            errorEl.style.color = '#e53e3e';
            errorEl.style.display = 'block';
          }
          inputEl.reportValidity();
        } else {
          inputEl.setCustomValidity('');
          if (errorEl) {
            if (res.locationString) {
              errorEl.textContent = `✓ Verified: ${res.locationString}`;
              errorEl.style.color = '#12356B';
              errorEl.style.display = 'block';
            } else {
              errorEl.style.display = 'none';
              errorEl.textContent = '';
            }
          }
          autoFillLocationFields(res);
        }
      });
      return true;
    }
  }

  inputEl.setCustomValidity('');
  if (errorEl) { errorEl.style.display = 'none'; errorEl.textContent = ''; }
  return true;
}

async function validateLocationInputAsync(inputEl, errorEl) {
  if (!inputEl) return false;
  const val = inputEl.value.trim();
  const formatValid = validateLocationInput(inputEl, errorEl);
  if (!formatValid) return false;

  if (/^\d{6}$/.test(val)) {
    const res = await verifyPincode(val);
    if (!res.exists) {
      const invalidMsg = res.message || 'Please enter a valid Indian PIN code.';
      inputEl.setCustomValidity(invalidMsg);
      if (errorEl) {
        errorEl.textContent = invalidMsg;
        errorEl.style.color = '#e53e3e';
        errorEl.style.display = 'block';
      }
      inputEl.reportValidity();
      return false;
    }
    inputEl.setCustomValidity('');
    if (errorEl) {
      if (res.locationString) {
        errorEl.textContent = `✓ Verified: ${res.locationString}`;
        errorEl.style.color = '#12356B';
        errorEl.style.display = 'block';
      } else {
        errorEl.style.display = 'none';
        errorEl.textContent = '';
      }
    }
    autoFillLocationFields(res);
    return true;
  }
  return true;
}

async function goChat(name,phone){
  let box=document.querySelector('.dock-panel.open .dock-inner')||document.getElementById('quote');
  let status=box.querySelector('.form-status');
  if(!status){
    status=document.createElement('p');
    status.className='form-status';
    status.setAttribute('role','status');
    box.append(status);
  }
  const dockNameEl=document.getElementById('dockName');
  const dockNameErrorEl=document.getElementById('dockNameError');
  const dockPhoneEl=document.getElementById('dockPhone');
  const dockPhoneErrorEl=document.getElementById('dockPhoneError');

  const nameValid = validateNameInput(dockNameEl, dockNameErrorEl);
  const phoneValid = validatePhoneInput(dockPhoneEl, dockPhoneErrorEl);

  if (!nameValid || !phoneValid) {
    if (!nameValid && dockNameEl) dockNameEl.reportValidity();
    else if (!phoneValid && dockPhoneEl) dockPhoneEl.reportValidity();
    status.textContent='Please fix validation errors before submitting.';
    return;
  }

  const digits=phone.replace(/\D/g,'');
  status.textContent='Sending JSON to n8n workflow...';
  const proposed='';
  const payload={action:'initial_inquiry',customer_name:name,phone:digits,proposed_company_name:proposed,timestamp:new Date().toISOString()};
  try{
    await fetch('https://n8n.srv1691210.hstgr.cloud/webhook/finface-payment-success',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    status.textContent='✓ Details sent to n8n! FinBot will initiate chat directly to +'+digits;
  }catch(e){
    status.textContent='✓ Webhook triggered! FinBot will initiate chat directly to +'+digits;
  }
}

function startChat(){goChat(document.getElementById('dockName').value.trim(),document.getElementById('dockPhone').value.trim());}
function startChatInline(){goChat(document.getElementById('qbName').value.trim(),document.getElementById('qbPhone').value.trim());}
document.addEventListener('keydown',e=>{const panel=document.getElementById('dockPanel');if(!panel.classList.contains('open'))return;if(e.key==='Escape')closeDock();if(e.key==='Tab'){const nodes=panel.querySelectorAll('button,input,a[href]');const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
function updateClock(){document.getElementById('istClock').textContent=new Date().toLocaleTimeString('en-IN',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit'})+' IST · Built around your schedule';}updateClock();setInterval(updateClock,60000);

const examples={
 structure:{title:'Find a structure that fits your plans.',desc:'Explore the questions that matter before choosing a company or LLP.',question:'What’s actually different between a Private Limited company and LLP, in simple terms?',answer:'Let’s compare the points that matter to you — how you plan to grow, bring in investors, manage ownership and handle ongoing compliance.',heading:'YOUR DECISION, BROKEN DOWN',rows:[['↗ Growth plans','Investors & funding'],['⇄ Ownership','Shareholders or partners'],['☷ Ongoing requirements','Filings & running costs']],follow:'And what about liability protection and annual filings?',take:'Ask follow-up questions.',detail:'Explore each topic in plain language before deciding on your structure.'},
 cost:{title:'See what goes into your estimate.',desc:'A few basic details help FinBot break down incorporation costs in the website chat.',question:'I’m considering a Private Limited company in Kerala. Can you show me the estimated cost?',answer:'Share your company type, the number of directors needing a digital signature, and your registered office state or PIN code.',heading:'EXAMPLE FROM THE SUPPLIED CHAT',rows:[['Professional fee','₹2,499'],['DSC · 0 directors','₹0'],['MCA fee','₹1,000'],['Kerala stamp duty','₹3,025'],['INC-20A','₹472'],['GST registration · launch offer','₹0 (free)']],total:'₹6,996',follow:'Which one is cheaper to run every year?',take:'Understand setup and ongoing costs.',detail:'This is a historical example from your screenshot, not a current quotation. Your estimate depends on your details.'},
 details:{title:'One question. One step closer.',desc:'Finbot turns company and director details into a guided conversation.',question:'What basic company details do you need from me?',answer:'Start with your office address, two preferred company names, what the business will do, and its email and mobile number.',heading:'FROM CHAT TO A CLEAR CHECKLIST',rows:[['01 · Company','Names & business activity'],['02 · Office','Address & PIN code'],['03 · Contact','Company email & mobile'],['04 · People','Directors & ownership']],follow:'Can you guide me through the director and ownership details too?',take:'Pick up where you left off.',detail:'The supplied chat shows Finbot collecting details, asking follow-ups and tracking each person’s progress.'}
};
function showExample(topic,scroll=false){const e=examples[topic];document.getElementById('example-title').textContent=e.title;document.getElementById('example-desc').textContent=e.desc;document.getElementById('example-takeaway').innerHTML='<b>'+e.take+'</b>'+e.detail;document.getElementById('example-panel').innerHTML='<div class="bubble sent">'+e.question+'<span class="message-meta">You · ✓✓</span></div><div class="bubble received">'+e.answer+'<span class="message-meta">Finbot</span></div><div class="mini-infographic"><h4>'+e.heading+'</h4>'+e.rows.map(r=>'<div class="info-line"><span>'+r[0]+'</span><b>'+r[1]+'</b></div>').join('')+(e.total?'<div class="info-total"><span>Total amount (example)</span><b>'+e.total+'</b></div>':'')+'</div><div class="bubble sent">'+e.follow+'<span class="message-meta">You · ✓✓</span></div>';document.getElementById('example-panel').setAttribute('aria-labelledby','tab-'+topic);document.querySelectorAll('.topic-tabs [role=tab]').forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.topic===topic));b.tabIndex=b.dataset.topic===topic?0:-1;});if(scroll)document.getElementById('conversation-examples').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
document.querySelectorAll('[data-topic]').forEach(b=>b.addEventListener('click',()=>showExample(b.dataset.topic,b.classList.contains('question-card'))));
document.querySelector('.topic-tabs').addEventListener('keydown',e=>{const tabs=[...document.querySelectorAll('.topic-tabs [role=tab]')];let i=tabs.indexOf(document.activeElement);if(i<0)return;if(e.key==='ArrowRight')i=(i+1)%3;else if(e.key==='ArrowLeft')i=(i+2)%3;else if(e.key==='Home')i=0;else if(e.key==='End')i=2;else return;e.preventDefault();tabs[i].focus();showExample(tabs[i].dataset.topic);});showExample('structure');


// Local design prototype: no live pricing, payment or n8n calls.
let demoCustomer={},demoGst=false,selectedType='',selectedPackage=null; let customerDetails=demoCustomer, currentQuote={quote_number:'FB-demo',line_items:[],to_confirm:[],total:0,advance_amount:0,balance_amount:0};
const flowRoot=document.getElementById('flow-content');
const companyTypes=['Private Limited Company','One Person Company','Limited Liability Partnership','Public Limited Company'];
const packages=[
  {id:'basic',name:'Basic registration',kind:'registration',price:2499,description:'Company incorporation with complimentary GST registration'},
  {id:'standard',name:'Standard registration',kind:'registration',price:3999,description:'Basic registration plus annual filing support'},
  {id:'premium',name:'Premium registration',kind:'registration',price:7999,description:'Standard registration plus MSME and Startup India support'}
];
let livePlansMap = {};
let liveStampDutyMap = {};
let currentEntityKey = 'private';

async function fetchDynamicFeeItems() {
  if (typeof fetch === "undefined") return;
  try {
    const url = typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL ? SUPABASE_URL : 'https://nuiflptifdkexotxnxcp.supabase.co';
    const key = typeof SUPABASE_ANON_KEY !== 'undefined' && SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY : 'sb_publishable_GfhZQfgUfhaiszDCu5JBZw_2c5zcNoG';
    const res = await fetch(`${url}/rest/v1/fee_items?select=*&active=eq.true&category=eq.stamp_duty`, {
      headers: { 'apikey': key }
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        data.forEach(item => {
          if (item.state && item.amount !== undefined) {
            liveStampDutyMap[String(item.state).trim().toLowerCase()] = Number(item.amount);
          }
        });
      }
    }
  } catch (e) {
    console.log('Dynamic fee_items fallback:', e);
  }
}

function getStampDutyForState(stateName) {
  if (!stateName) return 3025;
  const key = String(stateName).trim().toLowerCase();
  if (liveStampDutyMap[key] !== undefined) {
    return liveStampDutyMap[key];
  }
  const defaultMap = {
    'karnataka': 10020,
    'kerala': 3025,
    'tamil nadu': 720,
    'maharashtra': 100,
    'delhi': 410,
    'gujarat': 1320,
    'andhra pradesh': 1520,
    'telangana': 1520,
    'punjab': 10025,
    'madhya pradesh': 7550,
    'rajasthan': 1010,
    'uttar pradesh': 1010,
    'west bengal': 370
  };
  return defaultMap[key] !== undefined ? defaultMap[key] : 3025;
}


async function fetchDynamicPlans(){ if (typeof fetch === "undefined") return;
  try{
    const res = await fetch('https://nuiflptifdkexotxnxcp.supabase.co/rest/v1/plans?select=*&active=eq.true', {
      headers: { 'apikey': 'sb_publishable_GfhZQfgUfhaiszDCu5JBZw_2c5zcNoG' }
    });
    if(res.ok){
      const data = await res.json();
      data.forEach(p => {
        const key = p.entity === 'private_limited' ? 'private' : p.entity;
        if(!livePlansMap[key]) livePlansMap[key] = {};
        livePlansMap[key][p.code] = Number(p.price);
      });
      renderRegistrationPlans(currentEntityKey);
    }
  }catch(e){
    console.log('Dynamic plans fallback:', e);
  }
}
function getPlanPrice(entityKey, code, defaultPrice){
  if(livePlansMap[entityKey] && typeof livePlansMap[entityKey][code] === 'number'){
    return livePlansMap[entityKey][code];
  }
  return defaultPrice;
}
function setStage(n){document.querySelectorAll('.flow-progress li').forEach((x,i)=>x.classList.toggle('active',i===n));}
function safeText(t){return String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function serviceGreeting(){return `<div class="flow-message"><b>FinBot</b>Hi, I’m FinBot. I’ll help you with your quotation.<br><strong class="question-number">1) What do you need help with?</strong><div class="company-type-options"><button type="button" onclick="chooseService('registration')"><b>Registration</b><small>Set up a new business</small></button><button type="button" onclick="chooseService('tax')"><b>Tax &amp; Accounting</b><small>Talk through your ongoing requirements</small></button></div></div>`;}
function greeting(){return `<div class="flow-message"><b>FinBot</b>Let’s prepare your registration quotation.<br><strong class="question-number">2) Select the business structure</strong><div class="company-type-options">${companyTypes.map((t,i)=>`<button type="button" aria-pressed="${selectedType===t}" onclick="chooseType(${i})">${t}</button>`).join('')}</div></div>`;}
function getPlanPreviewHTML(entityKey, planId){
  const structure = pricingStructures[entityKey] || pricingStructures.private;
  const p = packages.find(pkg => pkg.id === planId) || packages[0];
  const dynamicPrice = getPlanPrice(entityKey, p.id, p.price);
  const summaryText = p.id === 'premium' ? 'Registration, annual filings and launch support in one plan.' : p.id === 'standard' ? 'Registration with applicable annual filing support.' : 'The essential filing support for this structure.';
  const rawItems = structure[p.id] || [];
  const items = rawItems.concat(['GST registration (complimentary)']);
  return `<div class="preview-header"><div class="preview-title-wrap"><h4 class="preview-plan-name">${safeText(p.name)}</h4><p class="preview-plan-sub">${safeText(structure.label)}</p></div><div class="preview-price-wrap"><span class="preview-price-amount">${money(dynamicPrice)}</span><span class="preview-price-tag">one-time · Inclusive of GST</span></div></div><div class="preview-divider"></div><ul class="preview-items-list">${items.map(item=>`<li><span class="preview-check-icon">✓</span><span>${safeText(item)}</span></li>`).join('')}</ul><div class="preview-footer-note"><span class="preview-info-icon">i</span><div><strong>Best for</strong><p>${safeText(summaryText)}</p></div></div>`;
}
function updatePlanPreview(entityKey, planId){
  const box = document.getElementById('step-plan-preview-box');
  if(box){
    box.innerHTML = getPlanPreviewHTML(entityKey, planId);
    box.style.display = 'block';
  }
}
function hidePlanPreview(){
  const box = document.getElementById('step-plan-preview-box');
  if(box){
    box.style.display = 'none';
  }
}
function planChoice(){
  const entityKey = (selectedType === 'One Person Company' || selectedType === 'One Person Company (OPC)') ? 'opc' : (selectedType === 'Limited Liability Partnership' || selectedType === 'Limited Liability Partnership (LLP)') ? 'llp' : 'private';
  return `<div class="flow-message"><b>FinBot</b>Great choice: <strong>${safeText(selectedType)}</strong>.<br><strong class="question-number">3) Choose your registration plan</strong><div class="company-type-options" onmouseleave="hidePlanPreview()">${packages.map((p,i)=>{const dynamicPrice=getPlanPrice(entityKey,p.id,p.price);return `<button type="button" aria-pressed="${selectedPackage&&selectedPackage.id===p.id}" onclick="choosePackage(${i})" onmouseenter="updatePlanPreview('${entityKey}','${p.id}')" onmouseleave="hidePlanPreview()" onfocus="updatePlanPreview('${entityKey}','${p.id}')" onblur="hidePlanPreview()"><b>${p.name}</b><small>${money(dynamicPrice)} one-time</small></button>`;}).join('')}</div><div class="dedicated-plan-preview" id="step-plan-preview-box" role="region" aria-live="polite" style="display:none;"></div></div>`;
}
const pricingStructures={
  private:{label:'Private Limited Company',basic:['Name reservation','SPICe+ incorporation filing','DIN application','Standard MOA and AOA','PAN / TAN application','Bank-account assistance','Certificate of incorporation and INC-20A filing'],standard:['Everything in Basic registration','Annual filing support: MGT-7 and AOC-4','MSME / Udyam registration'],premium:['Everything in Standard registration','Startup India (DPIIT) recognition support','Priority incorporation support']},
  opc:{label:'One Person Company (OPC)',basic:['Name reservation','SPICe+ incorporation filing','DIN application','Standard e-MOA and e-AOA','PAN / TAN application','Bank-account assistance and INC-20A filing'],standard:['Everything in Basic registration','Annual filing support: MGT-7 and AOC-4','MSME / Udyam registration'],premium:['Everything in Standard registration','Nominee appointment guidance','Startup India (DPIIT) recognition support','Priority incorporation support']},
  llp:{label:'Limited Liability Partnership (LLP)',basic:['Name reservation','FiLLiP incorporation filing','DPIN application where required','LLP agreement draft and filing support','PAN / TAN application','Incorporation certificate and bank-account assistance'],standard:['Everything in Basic registration','Annual filing support: Form 8 and Form 11','MSME / Udyam registration'],premium:['Everything in Standard registration','LLP agreement review and filing priority','Startup India (DPIIT) recognition support','Priority incorporation support']}
};
function scopeList(items){return items.map(item=>`<li>${item}</li>`).join('');}
function renderRegistrationPlans(key){currentEntityKey=key;const root=document.getElementById('registration-plan-cards');if(!root)return;if(key==='public'){root.innerHTML=`<div class="price-card public-expert-card"><div class="price-card-header"><p class="plan-name">Public Limited Company</p><span class="price-tag">Tailored incorporation</span></div><p class="plan-summary">Public company incorporation needs a discussion around capital, directors and compliance before a scope and price can be confirmed.</p><button class="plan-action" type="button" onclick="startPublicExpert()">Talk to an expert →</button></div>`;return;}const structure=pricingStructures[key];root.innerHTML=packages.map(p=>{const premium=p.id==='premium';const planTitle=p.id[0].toUpperCase()+p.id.slice(1);const dynamicPrice=getPlanPrice(key,p.id,p.price);return `<div class="price-card ${premium?'featured':''}"><div class="price-card-header"><p class="plan-name">${safeText(structure.label)} · ${planTitle}</p><span class="price-tag">${premium?'Most complete':p.id==='standard'?'Annual filing support':'GST offer · ₹999 value'}</span></div><p class="price-amount">${money(dynamicPrice)}</p><p class="price-inclusive">Inclusive of GST</p><p class="price-period">One-time professional fee</p><p class="price-offer">Complimentary GST registration <span>₹999 value</span></p><p class="plan-summary">${premium?'Registration, annual filings and launch support in one plan.':p.id==='standard'?'Registration with applicable annual filing support.':'The essential filing support for this structure.'}</p><ul class="price-list">${scopeList(structure[p.id])}<li><b>GST complimentary</b> <span class="field-hint">₹999 value</span></li></ul><button class="plan-action" type="button" onclick="startRegistrationQuote('${key}','${p.id}')">Choose ${planTitle} →</button></div>`;}).join('');}
function startRegistrationQuote(key,planId){selectedType=pricingStructures[key].label;const basePackage=packages.find(p=>p.id===planId)||{id:planId,name:planId};const dynamicPrice=getPlanPrice(key,planId,basePackage.price||2499);selectedPackage={...basePackage,price:dynamicPrice};demoCustomer={};document.getElementById('quote').scrollIntoView({behavior:'smooth',block:'start'});showDetails();}
function startPublicExpert(){selectedType='Public Limited Company';selectedPackage=null;document.getElementById('quote').scrollIntoView({behavior:'smooth',block:'start'});showPublicExpert();}
function startExpertService(name,price){selectedType='';const code=name==='Accounting + GST'?'gst_accounting':'accounting';const dynamicPrice=getPlanPrice('tax_accounting',code,price);selectedPackage={name,price:dynamicPrice,id:code};document.getElementById('quote').scrollIntoView({behavior:'smooth',block:'start'});showExpertCall();}
function showPublicExpert(){flowRoot.innerHTML=`<div class="flow-message"><b>FinBot</b>For a <strong>Public Limited Company</strong>, an expert will first understand your proposed capital, directors and compliance needs.</div><div class="handoff-card"><div class="flow-icon">☎</div><h3>Talk to an expert</h3><p>We’ll help you choose the right incorporation path and confirm a tailored quotation before any payment is requested.</p><button class="flow-action" type="button" onclick="showExpertCallStatus()">Talk to an expert ☎</button><p id="expert-call-status" class="flow-error" role="status"></p></div><button class="flow-back" onclick="resetFlow()">Choose another structure</button>`;}
function resetFlow(){demoCustomer={};demoGst=false;selectedType='';selectedPackage=null;setStage(0);flowRoot.innerHTML=serviceGreeting()+`<p class="flow-note"></p>`;}
function chooseService(service){demoCustomer={};selectedType='';selectedPackage=null;setStage(0);if(service==='registration'){flowRoot.innerHTML=greeting();return;}selectedPackage={id:'tax-accounting',name:'Tax & Accounting'};showExpertCall();}
function choosePackage(i){selectedPackage=packages[i];setStage(0);showDetails();}
function chooseType(i){selectedType=companyTypes[i];selectedPackage=null;demoCustomer={};setStage(0);if(selectedType==='Public Limited Company'){showPublicExpert();return;}flowRoot.innerHTML=planChoice();}
async function saveQuotationToDatabase(){
  try {
    const authorizedCapital = Number(demoCustomer.capital);
    if (!Number.isSafeInteger(authorizedCapital) || authorizedCapital < 1) {
      throw new Error('Enter a valid authorized capital of at least ₹1.');
    }
    const entityMap = {
      'Private Limited Company': 'private_limited',
      'One Person Company': 'opc',
      'One Person Company (OPC)': 'opc',
      'Limited Liability Partnership': 'llp',
      'Limited Liability Partnership (LLP)': 'llp',
      'Public Limited Company': 'public_limited'
    };
    const entity = entityMap[selectedType] || 'private_limited';
    const plan_code = (selectedPackage && selectedPackage.id && ['basic', 'standard', 'premium'].includes(selectedPackage.id)) ? selectedPackage.id : 'basic';
    const pinInput = document.getElementById('officeLocation') || document.getElementById('qbPincode');
    const distInput = document.getElementById('qbDistrict');
    const stateInput = document.getElementById('qbState');

    const pinVal = (pinInput?.value || demoCustomer.pincode || demoCustomer.location || customerDetails.pincode || '').trim();
    const distVal = (distInput?.value || demoCustomer.district || customerDetails.district || '').trim();
    const stInputVal = (stateInput?.value || demoCustomer.state || customerDetails.state || '').trim();

    let stateVal = stInputVal;
    if (!stateVal || /^\d{6}$/.test(stateVal)) {
      if (/^\d{6}$/.test(pinVal)) {
        const pincodeRes = await verifyPincode(pinVal);
        if (pincodeRes && pincodeRes.state) {
          stateVal = pincodeRes.state;
          demoCustomer.state = stateVal;
          if (!distVal && pincodeRes.district) demoCustomer.district = pincodeRes.district;
        }
      }
    }
    if (!stateVal) stateVal = 'Kerala';

    const payload = {
      entity: entity,
      state: stateVal,
      pincode: pinVal,
      district: distVal,
      director_count: Number.isFinite(Number(demoCustomer.directors)) ? Number(demoCustomer.directors) : 2,
      authorized_capital: authorizedCapital,
      plan_code: plan_code,
      name: demoCustomer.name,
      email: demoCustomer.email || null,
      phone: demoCustomer.phone
    };

    if (typeof SUPABASE_URL === 'undefined' || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Quotation saving is not configured. Please contact support.');
    }
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/submit-quotation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(payload)
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data.error || 'Unable to save your quotation. Please try again.');
    if (!data || !data.quote_number) throw new Error('The quotation was not saved. Please try again.');
    if (Number(data.authorized_capital) !== authorizedCapital) {
      throw new Error('The saved quotation does not match the capital entered. Please try again.');
    }
    currentQuote = data;
    console.log('Quotation successfully saved to database:', data.quote_number);
    return data;
  } catch (err) {
    console.error('Failed to save quotation to database:', err);
    const form = document.getElementById('lead-form');
    let saveError = document.getElementById('quotationSaveError');
    if (!saveError && form) {
      saveError = document.createElement('p');
      saveError.id = 'quotationSaveError';
      saveError.className = 'flow-error';
      saveError.setAttribute('role', 'alert');
      form.prepend(saveError);
    }
    if (saveError) saveError.textContent = err instanceof Error ? err.message : 'Unable to save your quotation. Please try again.';
    const submitBtn = form && form.querySelector('.flow-action');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Get my quotation →';
    }
    return null;
  }
}
function showDetails(){const isLlp=selectedType==='Limited Liability Partnership';const capitalLabel=isLlp?'Total proposed contribution':'Authorised capital';const nameVal=demoCustomer.name||customerDetails.name||'';const phoneVal=demoCustomer.phone||customerDetails.phone||'';const dirVal=demoCustomer.directors??customerDetails.director_count??customerDetails.directors??'';const capVal=demoCustomer.capital||customerDetails.capital||systemSettings.default_authorized_capital||100000;const pinVal=demoCustomer.pincode||demoCustomer.location||customerDetails.pincode||customerDetails.location||'';const distVal=demoCustomer.district||customerDetails.district||'';const stateVal=demoCustomer.state||customerDetails.state||'';flowRoot.innerHTML=`<div class="flow-message"><b>FinBot</b>Preparing a <strong>${safeText(selectedPackage ? selectedPackage.name : 'Registration')}</strong> quotation for <strong>${safeText(selectedType)}</strong>.</div><div class="details-chat-box"><div class="details-chat-title"><b>FinBot</b><h3>4) Tell me a little more</h3><p>You can alter the ${capitalLabel.toLowerCase()} to update the applicable government-fee estimate.</p></div><form class="flow-form" id="lead-form"><label>Your name<input id="qbName" autocomplete="name" maxlength="80" pattern="[A-Za-z .'-]+" title="Please enter a valid name" value="${safeText(nameVal)}" required><span id="qbNameError" class="field-error" style="color:#e53e3e; font-size:11px; display:none; margin-top:4px;"></span></label><label>Your WhatsApp number<div class="phone-input-wrapper" style="display:flex; align-items:center; border:1px solid #d6dfec; border-radius:9px; background:white; overflow:hidden; margin-top:6px;"><span class="phone-prefix" style="padding:12px 14px; background:#f0f4f9; color:#12356b; font-weight:600; font-size:14px; border-right:1px solid #d6dfec; user-select:none; white-space:nowrap;">+91</span><input id="qbPhone" type="tel" autocomplete="tel" maxlength="10" value="${safeText(phoneVal)}" required style="border:none !important; outline:none !important; margin-top:0 !important; border-radius:0 !important; flex:1; min-width:0; padding:12px;"></div><span id="qbPhoneError" class="field-error" style="color:#e53e3e; font-size:11px; display:none; margin-top:4px;"></span></label><label>${isLlp?'Number of proposed designated partners without DSC':'Number of proposed directors without DSC'}<span class="field-hint">DSC = Digital Signature Certificate</span><input id="qbDirectors" name="directorCount" type="number" min="0" max="100" step="1" value="${safeText(dirVal)}" required><span id="qbDirectorsError" class="field-error" style="color:#e53e3e; font-size:11px; display:none; margin-top:4px;"></span></label><label>${capitalLabel}<span class="field-hint">Editable</span><input id="capitalAmount" type="number" min="1" step="1" value="${safeText(capVal)}" required><span id="capitalAmountError" class="field-error" style="color:#e53e3e; font-size:11px; display:none; margin-top:4px;"></span></label><label>PIN code of proposed office<span class="field-hint">Auto-fetches district & state</span><input id="officeLocation" maxlength="6" pattern="\\d{6}" value="${safeText(pinVal)}" required><span id="officeLocationError" class="field-error" style="color:#e53e3e; font-size:11px; display:none; margin-top:4px;"></span></label><div style="display:flex; gap:12px; margin-top:4px;"><label style="flex:1;">District<input id="qbDistrict" maxlength="80" value="${safeText(distVal)}" required></label><label style="flex:1;">State of proposed office<input id="qbState" maxlength="80" value="${safeText(stateVal)}" required></label></div><button class="flow-action" type="submit">Get my quotation →</button><p class="flow-note">Preview only: stamp duty and DSC charges remain illustrative.</p></form></div>`;const n=document.getElementById('qbName'),nErr=document.getElementById('qbNameError');const ph=document.getElementById('qbPhone'),phErr=document.getElementById('qbPhoneError');const d=document.getElementById('qbDirectors'),dErr=document.getElementById('qbDirectorsError');const c=document.getElementById('capitalAmount'),cErr=document.getElementById('capitalAmountError');const l=document.getElementById('officeLocation'),lErr=document.getElementById('officeLocationError');const distIn=document.getElementById('qbDistrict'),stIn=document.getElementById('qbState');if(n){n.oninput=()=>validateNameInput(n,nErr);n.onblur=()=>validateNameInput(n,nErr);}if(ph){ph.oninput=()=>validatePhoneInput(ph,phErr);ph.onblur=()=>validatePhoneInput(ph,phErr);}if(d){d.oninput=()=>validateDirectorsInput(d,dErr);d.onblur=()=>validateDirectorsInput(d,dErr);}if(c){c.oninput=()=>validateCapitalInput(c,cErr,capitalLabel);c.onblur=()=>validateCapitalInput(c,cErr,capitalLabel);}if(l){l.oninput=()=>validateLocationInput(l,lErr);l.onblur=()=>validateLocationInput(l,lErr);}document.getElementById('lead-form').onsubmit=async e=>{e.preventDefault();const v1=validateNameInput(n,nErr);const v2=validatePhoneInput(ph,phErr);const v3=validateDirectorsInput(d,dErr);const v4=validateCapitalInput(c,cErr,capitalLabel);const v5=await validateLocationInputAsync(l,lErr);if(!v1||!v2||!v3||!v4||!v5){if(!v1&&n)n.reportValidity();else if(!v2&&ph)ph.reportValidity();else if(!v3&&d)d.reportValidity();else if(!v4&&c)c.reportValidity();else if(!v5&&l)l.reportValidity();return;}const submitBtn=e.target.querySelector('.flow-action');if(submitBtn){submitBtn.disabled=true;submitBtn.textContent='Generating quote...';}demoCustomer={name:n.value.trim(),phone:ph.value.replace(/\D/g,''),directors:Number(d.value),capital:Number(c.value),location:l.value.trim(),pincode:l.value.trim(),district:distIn?distIn.value.trim():'',state:stIn?stIn.value.trim():''};customerDetails=demoCustomer;const res=await saveQuotationToDatabase();if(res)showQuote();};}
function showExpertCall(){const isGst=selectedPackage&&selectedPackage.id==='gst-accounting';const hasPrice=selectedPackage&&Number.isFinite(selectedPackage.price);const serviceName=selectedPackage?selectedPackage.name:'Tax & Accounting';flowRoot.innerHTML=`<div class="flow-message"><b>FinBot</b>Let’s connect you with an expert for <strong>${safeText(serviceName)}</strong>.</div><div class="handoff-card"><div class="flow-icon">☎</div><h3>Talk to an expert</h3><p>${isGst?'GST and accounting support is tailored to your filing cycle, transaction volume and business structure.':'We’ll understand your accounting, GST and reporting requirements, then confirm the right scope and price.'}</p>${hasPrice?`<div class="payment-split"><div><span>Service</span><b>${safeText(serviceName)}</b></div><div><span>Starting price</span><b>${money(selectedPackage?selectedPackage.price:0)}/month</b></div></div>`:''}<p class="flow-note">An expert will confirm the scope and final price before any payment is requested.</p><button class="flow-action" type="button" onclick="showExpertCallStatus()">Talk to an expert ☎</button><p id="expert-call-status" class="flow-error" role="status"></p></div><button class="flow-back" onclick="resetFlow()">Choose another service</button>`;}
async function showExpertCallStatus(){openContactModal();const statusEl=document.getElementById('expert-call-status');if(statusEl)statusEl.textContent='Sending JSON to n8n workflow...';const name=demoCustomer?.name||customerDetails?.name||'Customer';const phone=demoCustomer?.phone||customerDetails?.phone||'';const digits=phone.replace(/\D/g,'');const serviceName=selectedPackage?selectedPackage.name:'Consultant Call';const payload={action:'expert_consultation_request',customer_name:name,phone:digits,service_name:serviceName,timestamp:new Date().toISOString()};try{await fetch('https://n8n.srv1691210.hstgr.cloud/webhook/finface-payment-success',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(statusEl)statusEl.textContent='✓ Details sent to n8n! FinBot will message +'+(digits||'your number')+' on WhatsApp.';}catch(e){if(statusEl)statusEl.textContent='✓ Webhook triggered! FinBot will message your number on WhatsApp.';}}
function showServiceQuote(){const overLimit=demoCustomer.transactions>150||demoCustomer.accounts>2;const gst=selectedPackage.id==='gst-accounting';const scope=gst?['Monthly bookkeeping and ledgers','GSTR-1 and GSTR-3B filing','GSTR-2B input tax credit reconciliation','GST payable review and reminders','Up to 150 transactions · two bank accounts · one GSTIN']:['Monthly bookkeeping and ledgers','Bank reconciliation for up to two accounts','Customer, vendor and expense tracking','Monthly P&L, balance sheet and cash summary','Up to 150 transactions each month'];flowRoot.innerHTML=`<div class="customer-answer">${safeText(selectedPackage ? selectedPackage.name : 'Registration')}<br><small>${safeText(demoCustomer.name)} · ${safeText(demoCustomer.business)}<br>${demoCustomer.transactions} monthly transactions · ${demoCustomer.accounts} bank account${demoCustomer.accounts===1?'':'s'}</small></div><div class="flow-message quote-in-chat"><b>FinBot</b>Here is your monthly quotation.<div class="quote-summary"><h3>${safeText(selectedPackage ? selectedPackage.name : 'Registration')}</h3><p class="flow-note">${overLimit?'Your details are above the included plan limit. This is a starting estimate; an expert will confirm the final monthly quote.':'Your details fit within the standard included scope.'}</p><div class="info-line"><span>Monthly professional fee</span><b>Starts at ${money(selectedPackage?selectedPackage.price:0)}</b></div><div class="info-line"><span>Included scope</span><b>Up to 150 transactions</b></div>${scope.map(x=>`<div class="info-line"><span>${x}</span><b>Included</b></div>`).join('')}</div></div><button class="flow-action" onclick="showServiceHandoff()">Request final quote from an expert →</button><span class="flow-note">A consultant will confirm your scope and the final monthly price before onboarding.</span></div><button class="flow-back" onclick="showServiceDetails()">Edit details</button>`;}
function showServiceHandoff(){setStage(2);flowRoot.innerHTML=`<div class="flow-message"><b>FinBot · Next step</b>Your ${safeText(selectedPackage ? selectedPackage.name : 'Registration')} request is ready for an expert review.</div><div class="handoff-card"><div class="flow-icon">✓</div><h3>We’ll confirm your final quote</h3><p>Continue on WhatsApp to share any supporting details and confirm your monthly scope with an expert.</p><div class="payment-split"><div><span>Selected plan</span><b>${safeText(selectedPackage ? selectedPackage.name : 'Registration')}</b></div><div><span>Starting monthly fee</span><b>${money(selectedPackage?selectedPackage.price:0)}</b></div></div><button class="flow-action" onclick="explainHandoff()">Chat with FinBot on WhatsApp ↗</button><p class="flow-note">Demo only. No request has been sent.</p><p id="handoff-status" class="flow-error" role="status"></p></div><button class="flow-back" onclick="showServiceQuote()">Back to quotation</button>`;}
function money(n){return '₹'+n.toLocaleString('en-IN',{minimumFractionDigits:Number.isInteger(n)?0:2,maximumFractionDigits:2});}
function companyFormFee(capital){if(capital<=100000)return 200;if(capital<500000)return 300;if(capital<2500000)return 400;if(capital<10000000)return 500;return 600;}
function llpFormFee(contribution){if(contribution<=100000)return 50;if(contribution<=500000)return 100;if(contribution<=1000000)return 150;if(contribution<=2500000)return 200;if(contribution<=10000000)return 400;return 600;}

function fillipFee(contribution){if(contribution<=100000)return 500;if(contribution<=500000)return 2000;if(contribution<=1000000)return 4000;if(contribution<=2500000)return 5000;if(contribution<=10000000)return 10000;return 25000;}
function quoteBreakdown(){
  const capital=Number(demoCustomer.capital)||(systemSettings.default_authorized_capital||100000);
  const directorCount=Number.isFinite(Number(demoCustomer.directors))?Number(demoCustomer.directors):(Number.isFinite(Number(customerDetails.directors))?Number(customerDetails.directors):0);
  const isLlp=selectedType==='Limited Liability Partnership';
  const stateName=demoCustomer.state||demoCustomer.location||customerDetails.state||customerDetails.location||'Kerala';
  
  if (currentQuote && Array.isArray(currentQuote.line_items) && currentQuote.line_items.length > 0) {
    const profItems = currentQuote.line_items.filter(item => item.code === 'professional_fee');
    const govtItems = currentQuote.line_items.filter(item => item.code !== 'professional_fee');

    const profLines = profItems.map(item => `
      <div class="info-line">
        <span>${safeText(item.name)}</span>
        <b>${money(Number(item.amount) || 0)}</b>
      </div>
    `).join('');

    const govtLines = govtItems.map(item => `
      <div class="info-line">
        <span>${safeText(item.name)}</span>
        <b>${money(Number(item.amount) || 0)}</b>
      </div>
    `).join('');

    const originalTotal = Number(currentQuote.original_total) || Number(currentQuote.subtotal) || 0;
    const discountAmount = Number(currentQuote.discount_amount) || 0;
    const finalTotal = Number(currentQuote.total) || 0;

    const entityTitle = isLlp ? 'LLP' : (selectedType.includes('One Person Company') ? 'OPC' : 'Private Limited');
    const note = `Quotation for ${entityTitle} / ${safeText(currentQuote.state || stateName)} with ${directorCount} ${isLlp ? 'designated partner' + (directorCount === 1 ? '' : 's') : 'director' + (directorCount === 1 ? '' : 's')} without DSC and ${isLlp ? 'total contribution' : 'authorised capital'} of ${money(capital)}.`;
    
    return { profLines, govtLines, originalTotal, discountAmount, finalTotal, note };
  }

  const stampDuty = getStampDutyForState(stateName);
  const dscFee = 2500 * directorCount;
  const annual = selectedPackage && selectedPackage.id !== 'basic';
  const profFee = selectedPackage ? selectedPackage.price : 2200;

  const profLines = `
    <div class="info-line"><span>Professional fee · inclusive of GST</span><b>${money(profFee)}</b></div>
  `;

  if (isLlp) {
    const formFee = llpFormFee(capital), fillip = fillipFee(capital), annualTotal = annual ? formFee * 2 : 0;
    const govtLines = `
      <div class="info-line"><span>DSC · ${directorCount} designated partner${directorCount === 1 ? '' : 's'} (₹2,500/each)</span><b>${money(dscFee)}</b></div>
      <div class="info-line"><span>RUN-LLP name reservation</span><b>₹200</b></div>
      <div class="info-line"><span>FiLLiP incorporation fee</span><b>${money(fillip)}</b></div>
      <div class="info-line"><span>Form 3 · LLP Agreement filing</span><b>${money(formFee)}</b></div>
      <div class="info-line"><span>LLP Agreement stamp duty · ${safeText(stateName)}</span><b>${money(stampDuty)}</b></div>
      <div class="info-line"><span>GST Registration fee</span><b>₹999</b></div>
      ${annual ? `<div class="info-line"><span>Form 8 government fee</span><b>${money(formFee)}</b></div><div class="info-line"><span>Form 11 government fee</span><b>${money(formFee)}</b></div>` : ''}
    `;
    const govtExtra = 200 + fillip + formFee + stampDuty + annualTotal + dscFee + 999;
    const originalTotal = profFee + govtExtra;
    const discountAmount = 999;
    const finalTotal = originalTotal - discountAmount;
    return {
      profLines,
      govtLines,
      originalTotal,
      discountAmount,
      finalTotal,
      note: `Quotation for LLP / ${safeText(stateName)} with ${directorCount} ${directorCount === 1 ? 'partner' : 'partners'} needing DSC and total contribution of ${money(capital)}.`
    };
  }

  const formFee = companyFormFee(capital), annualTotal = annual ? formFee * 2 : 0;
  const govtLines = `
    <div class="info-line"><span>DSC · ${directorCount} director${directorCount === 1 ? '' : 's'} (₹2,500/each)</span><b>${money(dscFee)}</b></div>
    <div class="info-line"><span>SPICe+ / e-MOA / e-AOA fee · up to ₹15 lakh capital</span><b>₹0</b></div>
    <div class="info-line"><span>PAN and TAN</span><b>₹131</b></div>
    <div class="info-line"><span>Stamp duty · ${safeText(stateName)}</span><b>${money(stampDuty)}</b></div>
    <div class="info-line"><span>INC-20A fee</span><b>₹472</b></div>
    <div class="info-line"><span>GST Registration fee</span><b>₹999</b></div>
    <div class="info-line"><span>Reserve Unique Name (MCA Fee)</span><b>₹1,000</b></div>
    ${annual ? `<div class="info-line"><span>MGT-7 government fee</span><b>${money(formFee)}</b></div><div class="info-line"><span>AOC-4 government fee</span><b>${money(formFee)}</b></div>` : ''}
  `;
  const govtExtra = 131 + stampDuty + 472 + 1000 + annualTotal + dscFee + 999;
  const originalTotal = profFee + govtExtra;
  const discountAmount = 999;
  const finalTotal = originalTotal - discountAmount;
  return {
    profLines,
    govtLines,
    originalTotal,
    discountAmount,
    finalTotal,
    note: `Quotation for ${selectedType.includes('One Person Company') ? 'OPC' : 'Private Limited'} / ${safeText(stateName)} with ${directorCount} director${directorCount === 1 ? '' : 's'} needing DSC and authorised capital of ${money(capital)}.`
  };
}
function demoTotal(){
  if (currentQuote && Number.isFinite(Number(currentQuote.total)) && Number(currentQuote.total) > 0) {
    return Number(currentQuote.total);
  }
  return quoteBreakdown().finalTotal;
}
function getAdvancePercent(){const val=Number(systemSettings.advance_percent);return (Number.isFinite(val)&&val>=0&&val<=100)?val:25;}
function advancePaise(){return Math.round(demoTotal()*(getAdvancePercent()/100)*100);}
function advanceAmount(){
  if (currentQuote && Number.isFinite(Number(currentQuote.advance_amount)) && Number(currentQuote.advance_amount) > 0) {
    return Number(currentQuote.advance_amount);
  }
  return advancePaise()/100;
}
function balanceAmount(){
  if (currentQuote && Number.isFinite(Number(currentQuote.balance_amount)) && Number(currentQuote.balance_amount) > 0) {
    return Number(currentQuote.balance_amount);
  }
  return (Math.round(demoTotal()*100)-advancePaise())/100;
}
function showQuote(){
  const pModal=document.getElementById('payment-preview');
  if(pModal){try{if(typeof pModal.close==='function')pModal.close();else pModal.removeAttribute('open');}catch(e){}}
  const quote=quoteBreakdown();
  const advPct=getAdvancePercent();
  const balPct=100-advPct;
  setStage(1);
  flowRoot.innerHTML=`<div class="customer-answer">${safeText(selectedPackage ? selectedPackage.name : 'Registration')} · ${safeText(selectedType)}<br><small>${safeText(demoCustomer.name)} · ${safeText(demoCustomer.location)}<br>${selectedType==='Limited Liability Partnership'?'Total contribution':'Authorised capital'}: ${money(demoCustomer.capital||systemSettings.default_authorized_capital||100000)}</small></div><div class="flow-message quote-in-chat"><b>FinBot</b>Thank you. Here’s how your quotation will appear.<div class="quote-summary"><h3>${safeText(selectedPackage ? selectedPackage.name : 'Registration')} quotation</h3><p class="flow-note">${quote.note}</p><div class="quote-section-title" style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:#12356b; margin:16px 0 8px; padding-bottom:4px; border-bottom:1px solid #dbe3ef;">Professional Fee</div>${quote.profLines}<div class="quote-section-title" style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:#12356b; margin:18px 0 8px; padding-bottom:4px; border-bottom:1px solid #dbe3ef;">Government &amp; Statutory Fees</div>${quote.govtLines}<div class="quotation-breakdown-card" style="margin-top:16px; padding:12px 14px; background:#f0f4f9; border-radius:8px; border:1px solid #d6dfec;"><div class="info-line" style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:12px; color:#4a5568;"><span>Total price (before GST offer)</span><b>${money(quote.originalTotal)}</b></div><div class="info-line" style="display:flex; justify-content:space-between; font-size:12px; color:#059669; font-weight:600;"><span>GST registration · launch offer</span><b>- ${money(quote.discountAmount)} (Free)</b></div></div><div class="quotation-grand-total" style="margin-top:14px; display:flex; justify-content:space-between; align-items:center; background:#12356b; color:white; padding:14px 18px; border-radius:10px; font-size:16px; font-weight:600;"><span>Total amount</span><b id="demo-total" style="font-size:22px; color:white;">${money(quote.finalTotal)}</b></div><div class="payment-split" style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:14px; padding:12px; background:#f8fafc; border-radius:10px; border:1px solid #e2e8f0; font-size:12px;"><div><span style="color:#64748b; display:block; font-size:11px;">${advPct}% advance · payable now</span><b id="advance-amount" style="font-size:15px; color:#12356b;">${money(advanceAmount())}</b></div><div><span style="color:#64748b; display:block; font-size:11px;">${balPct}% balance · at process completion</span><b id="balance-amount" style="font-size:15px; color:#334155;">${money(balanceAmount())}</b></div></div></div><button class="flow-action" onclick="showPayment()" id="advance-pay-button">Pay ${advPct}% advance · ${money(advanceAmount())} →</button><span class="flow-note">Payment preview · only the ${advPct}% advance is due now. No charges will be made in this demo.</span><div class="quote-expert-support"><h4>Need help before payment?</h4><p>Get your doubts clarified by our team.</p><button type="button" class="btn-expert-call" onclick="openContactModal()">📞 Talk to an Expert</button></div></div><button class="flow-back" onclick="showDetails()">Edit details</button>`;}
function showPayment(){const advPct=getAdvancePercent();const balPct=100-advPct;setStage(1);let modal=document.getElementById('payment-preview');if(!modal){modal=document.createElement('dialog');modal.id='payment-preview';modal.className='payment-dialog';modal.setAttribute('aria-labelledby','payment-title');document.body.append(modal);modal.addEventListener('cancel',()=>setStage(0));}modal.innerHTML=`<button class="payment-close" aria-label="Close payment preview" onclick="closePayment()">×</button><span class="demo-pill">PAYMENT · PAYMENT PREVIEW</span><div class="flow-icon">₹</div><h2 id="payment-title">Pay your ${advPct}% advance</h2><p>Amount payable now · quotation summary</p><div class="checkout-amount">${money(advanceAmount())}</div><div class="payment-summary"><span>Total amount</span><b>${money(demoTotal())}</b><span>${advPct}% advance · now</span><b>${money(advanceAmount())}</b><span>${balPct}% balance · at completion</span><b>${money(balanceAmount())}</b><span>Customer</span><b>${safeText(demoCustomer.name)}</b><span>GST registration</span><b>Included free · ₹999 value</b></div><p class="flow-note">Payment is not connected in this preview. In the live version, checkout will collect only the ${advPct}% advance. The remaining ${balPct}% is payable at the end of the incorporation process.</p><button class="flow-action" onclick="previewConfirmation()">Simulate confirmation — demo only</button><button class="flow-back" onclick="showQuote()">Return to quotation</button>`;modal.showModal();}
function closePayment(){document.getElementById('payment-preview').close();setStage(0);}
function previewConfirmation(){document.getElementById('payment-preview').close();showHandoff();}
function showHandoff(status){const advPct=getAdvancePercent();const balPct=100-advPct;setStage(2);const isFailed=status==='failed';const sent=status==='sent';const msgText=sent?'We’ve sent you a WhatsApp message from FinFace — reply to continue your application.':(isFailed?'Your quotation is accepted, but we could not confirm that your WhatsApp message was sent. Please contact us with your quotation number.':'After your '+advPct+'% advance is confirmed, we’ll continue your incorporation on WhatsApp.');flowRoot.innerHTML=`<div class="flow-message"><b>FinBot · Confirmation</b>${msgText}</div><div class="handoff-card"><div class="flow-icon">✓</div><h3>You’re ready for the next step</h3><p>Your application reference, quotation and advance-payment record will carry over to WhatsApp.</p><div class="payment-split"><div><span>${advPct}% advance</span><b>${money(advanceAmount())}</b></div><div><span>${balPct}% due at process completion</span><b>${money(balanceAmount())}</b></div></div><ol><li>Open WhatsApp using the button below.</li><li>Send your prefilled application reference.</li><li>FinBot starts collecting documents and company details.</li></ol><button class="flow-action" onclick="explainHandoff()">Chat with FinBot on WhatsApp ↗</button><p class="flow-note">Clicking the button opens WhatsApp directly with your prefilled details.</p><p id="handoff-status" class="flow-error" role="status"></p></div><button class="flow-back" onclick="showQuote()">Back to quotation</button>`;}
async function explainHandoff(){const statusEl=document.getElementById('handoff-status');const btn=document.querySelector('.handoff-card button.flow-action');if(btn){btn.disabled=true;btn.textContent='Saving lead & notifying FinBot...';}if(statusEl){statusEl.style.color='#12356b';statusEl.textContent='Saving quotation to database...';}const name=demoCustomer?.name||customerDetails?.name||'Customer';const phone=demoCustomer?.phone||customerDetails?.phone||'';const digits=phone.replace(/\D/g,'');const plan=selectedPackage?selectedPackage.name:'Registration';const type=selectedType||'Company';const quoteNo=currentQuote?.quote_number||('FB-'+Math.floor(100000+Math.random()*900000));const adv=typeof advanceAmount==='function'?money(advanceAmount()):'';const tot=typeof demoTotal==='function'?money(demoTotal()):'';const payload={action:'quotation_submission',quote_number:quoteNo,customer_name:name,phone:digits,company_type:type,selected_plan:plan,advance_amount:adv,total_amount:tot,proposed_director_count:demoCustomer?.directors||customerDetails?.director_count||2,authorized_capital:demoCustomer?.capital||systemSettings.default_authorized_capital||100000,office_location:demoCustomer?.location||customerDetails?.state||'',timestamp:new Date().toISOString()};let dbSaved=false;try{if(typeof SUPABASE_URL!=='undefined'&&SUPABASE_URL&&SUPABASE_ANON_KEY){const dbResp=await fetch(`${SUPABASE_URL}/functions/v1/accept-quotation`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${SUPABASE_ANON_KEY}`},body:JSON.stringify({quote_number:quoteNo,payload:payload})});if(dbResp.ok)dbSaved=true;}}catch(e){console.log('Database save notice:',e);}let n8nTriggered=false;try{if(statusEl)statusEl.textContent='Notifying FinBot workflow...';const resp=await fetch(N8N_WEBHOOK_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(resp.ok){n8nTriggered=true;try{const resData=await resp.json();if(resData.reply||resData.message)console.log('n8n bot reply:',resData.reply||resData.message);}catch(e){}}}catch(e){console.log('n8n webhook notice:',e);}if(btn){btn.disabled=false;btn.textContent=n8nTriggered?'Trigger FinBot Workflow ↗':'Retry FinBot Workflow ↗';}if(statusEl){if(n8nTriggered||dbSaved){statusEl.style.color='#12356b';statusEl.textContent='✓ Quotation accepted & sent to n8n workflow! FinBot will initiate chat directly to WhatsApp number '+digits+'.';}else{statusEl.style.color='#c0392b';statusEl.textContent='⚠️ Workflow notification failed. Click retry to connect with FinBot on WhatsApp.';}}}
loadSystemSettings().then(()=>{ updateContactModalUI(); updateAdvancePercentUI(); renderRegistrationPlans('private'); fetchDynamicPlans(); fetchDynamicFeeItems(); resetFlow(); });