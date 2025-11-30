import { setupCopy } from '/js/copy.js';
import { renderCommands } from './commands.js';

let currentUserId = null;
let currentUserToken = null;
let currentClipController = null;

export async function initClipsUI() {
  const toggleAuthBtn = document.getElementById('toggleAuthCode');
  const authCodeEl = document.getElementById('authCode');
  const regenAuthCodeBtn = document.getElementById('regenAuthCodeBtn');
  if (authCodeEl) authCodeEl.type = 'password';
  if (toggleAuthBtn && authCodeEl) {
    toggleAuthBtn.addEventListener('click', () => {
      const showing = authCodeEl.type === 'text';
      authCodeEl.type = showing ? 'password' : 'text';
      toggleAuthBtn.textContent = showing ? 'Mostrar' : 'Ocultar';
    });
  }
  if (regenAuthCodeBtn && authCodeEl) {
    regenAuthCodeBtn.addEventListener('click', async () => {
      const prev = regenAuthCodeBtn.textContent;
      regenAuthCodeBtn.disabled = true;
      try {
        if (currentClipController) currentClipController.abort();
        currentClipController = new AbortController();
        const resp = await fetch('/clips/me', { signal: currentClipController.signal });
        if (!resp.ok) throw new Error(await resp.text());
        const data = await resp.json();
        const code = data?.auth_code || '';
        if (code) {
          authCodeEl.value = code;
          const baseUrl = window.location.origin;
          renderCommands(baseUrl, code, currentUserId, currentUserToken);
          regenAuthCodeBtn.textContent = '¡Regenerado!';
          setTimeout(() => { regenAuthCodeBtn.textContent = prev; }, 1500);
        }
      } catch (_) {
        regenAuthCodeBtn.textContent = 'Error';
        setTimeout(() => { regenAuthCodeBtn.textContent = prev; }, 1500);
      } finally {
        regenAuthCodeBtn.disabled = false;
        currentClipController = null;
      }
    });
  }
  setupCopy('copyNightbotBtn','nightbotCommand');
  setupCopy('copyStreamlabsBtn','streamlabsCommand');
  setupCopy('copyStreamElementsBtn','streamElementsCommand');

  const form = document.getElementById('clips-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const resultDiv = document.getElementById('clipResult');
    const urlBlock = document.getElementById('clip-url-block');
    const channel = document.getElementById('clipChannel').value.trim();
    const submitBtn = document.querySelector('#clips-form button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    resultDiv.textContent = 'Creando clip...';
    resultDiv.style.display = 'block';
    urlBlock.style.display = 'none';
    try {
      if (currentClipController) currentClipController.abort();
      currentClipController = new AbortController();
      const url = channel ? `/api/clips/create?channel=${encodeURIComponent(channel)}` : '/api/clips/create';
      const resp = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' }, signal: currentClipController.signal });
      const text = await resp.text();
      if (!resp.ok) throw new Error(text || 'Error creando clip');
      resultDiv.textContent = '✅ ¡Clip creado exitosamente!';
      resultDiv.style.color = '#4ade80';
      const dataUrlMatch = text.match(/https?:\/\/clips\.twitch\.tv\/\S+/);
      const clipUrl = dataUrlMatch ? dataUrlMatch[0] : '';
      document.getElementById('clipUrl').textContent = clipUrl;
      document.getElementById('clipUrl').href = clipUrl;
      urlBlock.style.display = 'block';
    } catch (err) {
      resultDiv.textContent = `❌ Error: ${err.message}`;
      resultDiv.style.color = '#f87171';
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      currentClipController = null;
    }
  });

  try {
    const resp = await fetch('/clips/me');
    if (resp.ok) {
      const data = await resp.json();
      const authCode = data.auth_code;
      currentUserId = data.clips?.id || null;
      currentUserToken = data.clips?.access_token || null;
      const baseUrl = window.location.origin;
      renderCommands(baseUrl, authCode, currentUserId, currentUserToken);
      if (authCode && authCodeEl) authCodeEl.value = authCode;
    }
  } catch (_) {}
}