// ============================================================
// supabase-config.js  — Edit ONLY the two lines below
// Supabase Dashboard → Settings → API
// ============================================================
const SUPABASE_URL = 'https://xtcjbajcbcanuvcnkswz.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_k09ru9G1GsnXLHz5t4I6VQ_X0jbfPKK';
// ============================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ── Settings ─────────────────────────────────────────────── */
export async function getSettings() {
  const { data } = await sb.from('settings').select('key,value');
  const map = {};
  (data || []).forEach(r => { map[r.key] = r.value; });
  return map;
}
export async function saveSetting(key, value) {
  await sb.from('settings').upsert({ key, value }, { onConflict: 'key' });
}

/* ── Formatting ───────────────────────────────────────────── */
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
export function padNum(n) {
  return String(n).padStart(4, '0');
}

/* ── Toast ────────────────────────────────────────────────── */
export function toast(msg, type = 'info', ms = 3500) {
  let area = document.getElementById('toast-area');
  if (!area) {
    area = document.createElement('div');
    area.id = 'toast-area';
    area.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none;width:max-content;max-width:90vw';
    document.body.appendChild(area);
  }
  const colors = { success:'#22c55e', error:'#ef4444', info:'#f5c842', warning:'#f97316' };
  const el = document.createElement('div');
  el.style.cssText = `background:#1b2340;color:#fff;border:1px solid rgba(255,255,255,.1);border-left:4px solid ${colors[type]||colors.info};border-radius:12px;padding:12px 20px;font-size:14px;font-weight:700;box-shadow:0 8px 32px rgba(0,0,0,.4);pointer-events:all;font-family:'Nunito',sans-serif;white-space:nowrap`;
  el.textContent = msg;
  area.appendChild(el);
  el.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:220,fill:'forwards'});
  setTimeout(()=>{
    el.animate([{opacity:1},{opacity:0}],{duration:220,fill:'forwards'}).onfinish = ()=>el.remove();
  }, ms);
}

/* ── Image upload to Supabase Storage ────────────────────── */
export async function uploadFoodImage(file) {
  const ext  = file.name.split('.').pop();
  const path = `food/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await sb.storage.from('food-images').upload(path, file, { upsert: false });
  if (error) return { url: null, error: error.message };
  const { data } = sb.storage.from('food-images').getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

/* ── Confirm dialog ───────────────────────────────────────── *
 * Completely self-contained — builds its own overlay element
 * with a unique ID so it never conflicts with the admin page's
 * own modal system.
 * ─────────────────────────────────────────────────────────── */
export function confirmDialog(msg) {
  return new Promise(resolve => {
    // Remove any stale instance
    document.getElementById('_cfg_confirm')?.remove();

    const overlay = document.createElement('div');
    overlay.id = '_cfg_confirm';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px';

    overlay.innerHTML = `
      <div style="background:#242E50;border:1px solid rgba(255,255,255,.12);border-radius:20px;padding:28px;width:100%;max-width:380px;box-shadow:0 16px 48px rgba(0,0,0,.55);font-family:'Nunito',sans-serif">
        <p style="color:#9AA0C0;font-size:.9rem;line-height:1.65;margin-bottom:22px">${esc(msg)}</p>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button id="_cfg_cancel" style="padding:9px 20px;border-radius:8px;font-size:.85rem;font-weight:800;cursor:pointer;border:none;background:rgba(255,255,255,.07);color:#9AA0C0;font-family:'Nunito',sans-serif">Cancel</button>
          <button id="_cfg_ok"     style="padding:9px 20px;border-radius:8px;font-size:.85rem;font-weight:800;cursor:pointer;border:none;background:rgba(255,107,91,.2);color:#FF6B5B;font-family:'Nunito',sans-serif">Confirm</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    const close = (val) => { overlay.remove(); resolve(val); };

    overlay.querySelector('#_cfg_cancel').onclick = () => close(false);
    overlay.querySelector('#_cfg_ok').onclick     = () => close(true);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(false); });
    document.addEventListener('keydown', function handler(e) {
      if (e.key === 'Escape') { close(false); document.removeEventListener('keydown', handler); }
      if (e.key === 'Enter')  { close(true);  document.removeEventListener('keydown', handler); }
    });
  });
}

/* ── openModal (used by index.html only, not admin.html) ───── */
let _modalResolve = null;

export function openModal(title, bodyHTML, buttons = []) {
  return new Promise(resolve => {
    _modalResolve = resolve;

    // Always wipe and rebuild the inner structure to avoid stale IDs
    let bg = document.getElementById('_sb_modal_bg');
    if (!bg) {
      bg = document.createElement('div');
      bg.id = '_sb_modal_bg';
      bg.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:800;display:flex;align-items:center;justify-content:center;padding:16px';
      document.body.appendChild(bg);
      bg.addEventListener('click', e => { if (e.target === bg) closeModal(null); });
    }

    bg.innerHTML = `
      <div style="background:#242E50;border:1px solid rgba(255,255,255,.1);border-radius:24px;padding:28px;width:100%;max-width:520px;max-height:90dvh;overflow-y:auto;box-shadow:0 16px 48px rgba(0,0,0,.5);font-family:'Nunito',sans-serif">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
          <span id="_sb_modal_title" style="font-family:'Fredoka',sans-serif;font-size:1.2rem;font-weight:700;color:#F5C842">${esc(title)}</span>
          <button id="_sb_modal_x" style="background:rgba(255,255,255,.08);color:#9AA0C0;border-radius:8px;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:.9rem;cursor:pointer;border:none">✕</button>
        </div>
        <div id="_sb_modal_body">${bodyHTML}</div>
        <div id="_sb_modal_foot" style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px"></div>
      </div>`;

    bg.querySelector('#_sb_modal_x').onclick = () => closeModal(null);

    const foot = bg.querySelector('#_sb_modal_foot');
    buttons.forEach((b, i) => {
      const btn = document.createElement('button');
      btn.textContent = b.label;
      btn.style.cssText = `padding:9px 20px;border-radius:8px;font-size:.85rem;font-weight:800;cursor:pointer;border:none;font-family:'Nunito',sans-serif;transition:all .15s;${b.style||'background:#2E3C64;color:#9AA0C0'}`;
      btn.onclick = async () => {
        const result = await b.action?.();
        if (result !== false) closeModal(i);
      };
      foot.appendChild(btn);
    });

    bg.style.display = 'flex';
    setTimeout(() => bg.querySelector('input,textarea')?.focus(), 80);

    // Escape key
    const escHandler = e => {
      if (e.key === 'Escape') { closeModal(null); document.removeEventListener('keydown', escHandler); }
    };
    document.addEventListener('keydown', escHandler);
  });
}

export function closeModal(result) {
  const bg = document.getElementById('_sb_modal_bg');
  if (bg) bg.style.display = 'none';
  _modalResolve?.(result);
  _modalResolve = null;
}
