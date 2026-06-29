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

/* ── Modal system ─────────────────────────────────────────── */
let _modalResolve = null;

export function openModal(title, bodyHTML, buttons = []) {
  return new Promise(resolve => {
    _modalResolve = resolve;
    let bg = document.getElementById('_modal_bg');
    if (!bg) {
      bg = document.createElement('div');
      bg.id = '_modal_bg';
      bg.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:800;display:flex;align-items:center;justify-content:center;padding:16px';
      bg.innerHTML = `<div id="_modal_box" style="background:#242E50;border:1px solid rgba(255,255,255,.1);border-radius:24px;padding:28px;width:100%;max-width:520px;max-height:90dvh;overflow-y:auto;box-shadow:0 16px 48px rgba(0,0,0,.5)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
          <span id="_modal_title" style="font-family:'Fredoka',sans-serif;font-size:1.2rem;font-weight:700;color:#F5C842"></span>
          <button id="_modal_x" style="background:rgba(255,255,255,.08);color:#9AA0C0;border-radius:8px;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:.9rem;cursor:pointer;border:none">✕</button>
        </div>
        <div id="_modal_body"></div>
        <div id="_modal_foot" style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px"></div>
      </div>`;
      document.body.appendChild(bg);
      bg.addEventListener('click', e => { if (e.target === bg) closeModal(null); });
      document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(null); });
    }
    document.getElementById('_modal_title').textContent = title;
    document.getElementById('_modal_body').innerHTML = bodyHTML;
    document.getElementById('_modal_x').onclick = () => closeModal(null);

    const foot = document.getElementById('_modal_foot');
    foot.innerHTML = '';
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
    setTimeout(() => document.querySelector('#_modal_body input,#_modal_body textarea')?.focus(), 80);
  });
}

export function closeModal(result) {
  const bg = document.getElementById('_modal_bg');
  if (bg) bg.style.display = 'none';
  _modalResolve?.(result);
  _modalResolve = null;
}

export function confirmDialog(msg) {
  return openModal('Confirm', `<p style="color:#9AA0C0;line-height:1.6;font-size:.9rem">${esc(msg)}</p>`, [
    { label:'Cancel',  style:'background:rgba(255,255,255,.07);color:#9AA0C0', action: ()=>{ closeModal(false); return false; } },
    { label:'Confirm', style:'background:rgba(255,107,91,.2);color:#FF6B5B',   action: ()=>true },
  ]);
}
