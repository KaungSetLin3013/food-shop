import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ============================================================
// Edit ONLY these two lines:
// Supabase Dashboard -> Settings -> API
// ============================================================
const SUPABASE_URL = 'https://xtcjbajcbcanuvcnkswz.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_k09ru9G1GsnXLHz5t4I6VQ_X0jbfPKK';
// ============================================================

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function getSettings() {
  const { data } = await sb.from('settings').select('key,value');
  const map = {};
  (data || []).forEach(r => { map[r.key] = r.value; });
  return map;
}

export async function saveSetting(key, value) {
  await sb.from('settings').upsert({ key, value }, { onConflict: 'key' });
}

export function fmt(price, currency) {
  currency = currency || 'Y';
  return currency + Number(price).toLocaleString();
}

export function timeAgo(iso) {
  var s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  return Math.floor(s / 3600) + 'h ago';
}

export function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function padNum(n) {
  return String(n).padStart(4, '0');
}

export function toast(msg, type, ms) {
  type = type || 'info';
  ms   = ms   || 3500;
  var area = document.getElementById('toast-area');
  if (!area) {
    area = document.createElement('div');
    area.id = 'toast-area';
    area.style.position  = 'fixed';
    area.style.bottom    = '20px';
    area.style.left      = '50%';
    area.style.transform = 'translateX(-50%)';
    area.style.zIndex    = '9999';
    area.style.display        = 'flex';
    area.style.flexDirection  = 'column';
    area.style.alignItems     = 'center';
    area.style.gap            = '8px';
    area.style.pointerEvents  = 'none';
    area.style.maxWidth       = '90vw';
    document.body.appendChild(area);
  }
  var colors = { success: '#22c55e', error: '#ef4444', info: '#f5c842', warning: '#f97316' };
  var el = document.createElement('div');
  el.style.background    = '#1b2340';
  el.style.color         = '#fff';
  el.style.border        = '1px solid rgba(255,255,255,.1)';
  el.style.borderLeft    = '4px solid ' + (colors[type] || colors.info);
  el.style.borderRadius  = '12px';
  el.style.padding       = '12px 20px';
  el.style.fontSize      = '14px';
  el.style.fontWeight    = '700';
  el.style.boxShadow     = '0 8px 32px rgba(0,0,0,.4)';
  el.style.pointerEvents = 'all';
  el.style.fontFamily    = 'Nunito, sans-serif';
  el.style.whiteSpace    = 'nowrap';
  el.textContent = msg;
  area.appendChild(el);
  el.animate(
    [{ opacity: '0', transform: 'translateY(8px)' }, { opacity: '1', transform: 'translateY(0)' }],
    { duration: 220, fill: 'forwards' }
  );
  setTimeout(function() {
    el.animate([{ opacity: '1' }, { opacity: '0' }], { duration: 220, fill: 'forwards' })
      .onfinish = function() { el.remove(); };
  }, ms);
}

export async function uploadFoodImage(file) {
  var ext  = file.name.split('.').pop();
  var path = 'food/' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.' + ext;
  var up   = await sb.storage.from('food-images').upload(path, file, { upsert: false });
  if (up.error) return { url: null, error: up.error.message };
  var pub = sb.storage.from('food-images').getPublicUrl(path);
  return { url: pub.data.publicUrl, error: null };
}

export function confirmDialog(msg) {
  return new Promise(function(resolve) {
    var old = document.getElementById('_cfg_confirm');
    if (old) old.remove();

    var overlay = document.createElement('div');
    overlay.id = '_cfg_confirm';
    overlay.style.position       = 'fixed';
    overlay.style.inset          = '0';
    overlay.style.background     = 'rgba(0,0,0,.65)';
    overlay.style.zIndex         = '9000';
    overlay.style.display        = 'flex';
    overlay.style.alignItems     = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.padding        = '16px';

    var box = document.createElement('div');
    box.style.background   = '#242E50';
    box.style.border       = '1px solid rgba(255,255,255,.12)';
    box.style.borderRadius = '20px';
    box.style.padding      = '28px';
    box.style.width        = '100%';
    box.style.maxWidth     = '380px';
    box.style.boxShadow    = '0 16px 48px rgba(0,0,0,.55)';
    box.style.fontFamily   = 'Nunito, sans-serif';

    var p = document.createElement('p');
    p.style.color        = '#9AA0C0';
    p.style.fontSize     = '.9rem';
    p.style.lineHeight   = '1.65';
    p.style.marginBottom = '22px';
    p.textContent = msg;

    var row = document.createElement('div');
    row.style.display        = 'flex';
    row.style.gap            = '10px';
    row.style.justifyContent = 'flex-end';

    var cancelBtn = document.createElement('button');
    cancelBtn.textContent      = 'Cancel';
    cancelBtn.style.padding    = '9px 20px';
    cancelBtn.style.borderRadius = '8px';
    cancelBtn.style.fontSize   = '.85rem';
    cancelBtn.style.fontWeight = '800';
    cancelBtn.style.cursor     = 'pointer';
    cancelBtn.style.border     = 'none';
    cancelBtn.style.background = 'rgba(255,255,255,.07)';
    cancelBtn.style.color      = '#9AA0C0';
    cancelBtn.style.fontFamily = 'Nunito, sans-serif';

    var okBtn = document.createElement('button');
    okBtn.textContent      = 'Confirm';
    okBtn.style.padding    = '9px 20px';
    okBtn.style.borderRadius = '8px';
    okBtn.style.fontSize   = '.85rem';
    okBtn.style.fontWeight = '800';
    okBtn.style.cursor     = 'pointer';
    okBtn.style.border     = 'none';
    okBtn.style.background = 'rgba(255,107,91,.2)';
    okBtn.style.color      = '#FF6B5B';
    okBtn.style.fontFamily = 'Nunito, sans-serif';

    row.appendChild(cancelBtn);
    row.appendChild(okBtn);
    box.appendChild(p);
    box.appendChild(row);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    function close(val) { overlay.remove(); resolve(val); }

    cancelBtn.onclick = function() { close(false); };
    okBtn.onclick     = function() { close(true); };
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) close(false);
    });
    function handler(e) {
      if (e.key === 'Escape') { close(false); document.removeEventListener('keydown', handler); }
      if (e.key === 'Enter')  { close(true);  document.removeEventListener('keydown', handler); }
    }
    document.addEventListener('keydown', handler);
  });
}
