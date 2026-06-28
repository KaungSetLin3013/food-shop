// ============================================================
// supabase-config.js  — Edit ONLY these two lines
// ============================================================
// Find them in: Supabase Dashboard → Settings → API
//   • Project URL  (looks like https://xxxx.supabase.co)
//   • anon public key (long JWT string)
// ============================================================

const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_PUBLIC_KEY_HERE';

// ============================================================
// Do NOT edit below this line
// ============================================================
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helpers
export async function getSettings() {
  const { data } = await sb.from('settings').select('key,value');
  const map = {};
  (data || []).forEach(r => { map[r.key] = r.value; });
  return map;
}

export async function saveSetting(key, value) {
  await sb.from('settings').upsert({ key, value }, { onConflict: 'key' });
}

export function fmt(price, currency = '¥') {
  return currency + Number(price).toLocaleString();
}

export function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60)   return s + 's ago';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  return Math.floor(s / 3600) + 'h ago';
}

export function esc(str) {
  return String(str ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export function toast(msg, type = 'info', ms = 3500) {
  let area = document.getElementById('toast-area');
  if (!area) {
    area = document.createElement('div');
    area.id = 'toast-area';
    area.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none';
    document.body.appendChild(area);
  }
  const el = document.createElement('div');
  const colors = { success:'#22c55e', error:'#ef4444', info:'#f5c842', warning:'#f97316' };
  el.style.cssText = `background:#1b2340;color:#fff;border:1px solid rgba(255,255,255,0.1);border-left:4px solid ${colors[type]||colors.info};border-radius:12px;padding:12px 20px;font-size:14px;font-weight:700;box-shadow:0 8px 32px rgba(0,0,0,0.4);pointer-events:all;font-family:'Nunito',sans-serif`;
  el.textContent = msg;
  area.appendChild(el);
  el.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:220,fill:'forwards'});
  setTimeout(() => {
    el.animate([{opacity:1},{opacity:0}],{duration:220,fill:'forwards'}).onfinish = () => el.remove();
  }, ms);
}
