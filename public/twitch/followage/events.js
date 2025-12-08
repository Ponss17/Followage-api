import { currentLang, getDict, labelForState, updateUrlLabels } from '/js/i18n.js';
import { copyToClipboard, setupCopy } from '/js/copy.js';
import { buildFollowageUrls } from './commands.js';

let isAuthenticated = false;
let isChannelAuthenticated = false;
let lastAuthLogin = '';
let lastChannelLogin = '';

function updateRevealButtonsLabel() {
  const mBtn = document.getElementById('toggleModeratorId');
  const mEl = document.getElementById('moderatorId');
  const cBtn = document.getElementById('toggleChannelToken');
  const cEl = document.getElementById('channelToken');
  const aBtn = document.getElementById('toggleAuthCode');
  const aEl = document.getElementById('authCode');
  if (mBtn && mEl) mBtn.textContent = labelForState(mEl.type === 'password');
  if (cBtn && cEl) cBtn.textContent = labelForState(cEl.type === 'password');
  if (aBtn && aEl) aBtn.textContent = labelForState(aEl.type === 'password');
}
function updateFormMode() {
  const viewerEl = document.getElementById('viewer');
  const demoNotice = document.getElementById('demoNotice');
  const channelNotice = document.getElementById('channelNotice');
  if (isChannelAuthenticated) {
    if (viewerEl) viewerEl.readOnly = false;
    if (demoNotice) demoNotice.style.display = 'none';
    if (channelNotice) channelNotice.style.display = 'none';
  } else {
    if (viewerEl) viewerEl.readOnly = true;
    if (!isAuthenticated && demoNotice) demoNotice.style.display = '';
  }
}
async function refreshAuth() {
  try {
    const resp = await fetch('/me');
    if (resp.ok) {
      const data = await resp.json();
      const dict = getDict();
      const authStatusEl = document.getElementById('authStatus');
      const loginBtn = document.getElementById('loginBtn');
      const logoutBtn = document.getElementById('logoutBtn');
      const viewerEl = document.getElementById('viewer');
      if (data.authenticated && data.user) {
        isAuthenticated = true;
        lastAuthLogin = data.user.display_name || data.user.login;
        authStatusEl.textContent = `${dict.authStatusYesPrefix}${lastAuthLogin}`;
        loginBtn.style.display = 'none';
        logoutBtn.style.display = '';
        if (viewerEl && !viewerEl.value) viewerEl.value = data.user.login;
        const demoNotice = document.getElementById('demoNotice');
        if (demoNotice) demoNotice.style.display = 'none';
      } else {
        isAuthenticated = false;
        authStatusEl.textContent = dict.authStatusNo;
        loginBtn.style.display = '';
        logoutBtn.style.display = 'none';
      }
    }
    updateFormMode();
  } catch (_) { }
}
async function refreshChannelAuth() {
  try {
    const resp = await fetch('/channel/me');
    const channelAuthStatusEl = document.getElementById('channelAuthStatus');
    const channelLoginBtn = document.getElementById('channelLoginBtn');
    const channelLogoutBtn = document.getElementById('channelLogoutBtn');
    const channelNotice = document.getElementById('channelNotice');
    const linkTypeContainer = document.getElementById('linkTypeContainer');
    if (resp.ok) {
      const data = await resp.json();
      const dict = getDict();
      if (data.authenticated && data.channel) {
        isChannelAuthenticated = true;
        lastChannelLogin = data.channel.display_name || data.channel.channel_login;
        channelAuthStatusEl.textContent = `${dict.channelAuthStatusYesPrefix}${lastChannelLogin}`;
        channelLoginBtn.style.display = 'none';
        channelLogoutBtn.style.display = '';
        channelNotice.style.display = 'none';
        linkTypeContainer.style.display = '';
        const ch = data.channel || {};
        const chId = ch.channel_id != null ? String(ch.channel_id) : (ch.id != null ? String(ch.id) : '');
        const chToken = ch.access_token || '';
        const moderatorIdEl = document.getElementById('moderatorId');
        const channelTokenEl = document.getElementById('channelToken');
        const authCodeEl = document.getElementById('authCode');
        if (moderatorIdEl) { if (chId) moderatorIdEl.value = chId; moderatorIdEl.type = 'password'; }
        if (channelTokenEl && chToken) channelTokenEl.value = chToken;
        if (authCodeEl && data.auth_code) authCodeEl.value = data.auth_code;
        updateRevealButtonsLabel();
      } else {
        isChannelAuthenticated = false;
        channelAuthStatusEl.textContent = dict.channelAuthStatusNo;
        channelLoginBtn.style.display = '';
        channelLogoutBtn.style.display = 'none';
        channelNotice.style.display = '';
        linkTypeContainer.style.display = 'none';
      }
      updateFormMode();
    }
  } catch (_) { }
}
let currentFetchController = null;
export async function initFollowageUI() {
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const channelLoginBtn = document.getElementById('channelLoginBtn');
  const channelLogoutBtn = document.getElementById('channelLogoutBtn');
  if (loginBtn) loginBtn.addEventListener('click', () => { window.location.href = new URL('/auth/login', window.location.origin).toString(); });
  if (logoutBtn) logoutBtn.addEventListener('click', async () => {
    try { await fetch('/auth/logout', { method: 'POST' }); } catch (_) { }
    isAuthenticated = false;
    const d = getDict();
    const authStatusEl = document.getElementById('authStatus');
    const loginBtn2 = document.getElementById('loginBtn');
    const logoutBtn2 = document.getElementById('logoutBtn');
    if (authStatusEl) authStatusEl.textContent = d.authStatusNo;
    if (loginBtn2) loginBtn2.style.display = '';
    if (logoutBtn2) logoutBtn2.style.display = 'none';
    updateFormMode();
  });
  if (channelLoginBtn) channelLoginBtn.addEventListener('click', () => { window.location.href = new URL('/auth/channel/login', window.location.origin).toString(); });
  if (channelLogoutBtn) channelLogoutBtn.addEventListener('click', async () => {
    try { await fetch('/auth/channel/logout', { method: 'POST' }); } catch (_) { }
    isChannelAuthenticated = false;
    const d = getDict();
    const channelAuthStatusEl = document.getElementById('channelAuthStatus');
    const channelLoginBtn2 = document.getElementById('channelLoginBtn');
    const channelLogoutBtn2 = document.getElementById('channelLogoutBtn');
    const channelNotice = document.getElementById('channelNotice');
    const linkTypeContainer = document.getElementById('linkTypeContainer');
    if (channelAuthStatusEl) channelAuthStatusEl.textContent = d.channelAuthStatusNo;
    if (channelLoginBtn2) channelLoginBtn2.style.display = '';
    if (channelLogoutBtn2) channelLogoutBtn2.style.display = 'none';
    if (channelNotice) channelNotice.style.display = '';
    if (linkTypeContainer) linkTypeContainer.style.display = 'none';
    const moderatorIdEl = document.getElementById('moderatorId');
    const channelTokenEl = document.getElementById('channelToken');
    const authCodeEl = document.getElementById('authCode');
    if (moderatorIdEl) { moderatorIdEl.value = ''; moderatorIdEl.type = 'password'; }
    if (channelTokenEl) { channelTokenEl.value = ''; channelTokenEl.type = 'password'; }
    if (authCodeEl) { authCodeEl.value = ''; authCodeEl.type = 'password'; }
    updateRevealButtonsLabel();
    updateFormMode();
  });

  const toggleModeratorBtn = document.getElementById('toggleModeratorId');
  const toggleChannelBtn = document.getElementById('toggleChannelToken');
  const toggleAuthBtn = document.getElementById('toggleAuthCode');
  const moderatorIdEl = document.getElementById('moderatorId');
  const channelTokenEl = document.getElementById('channelToken');
  const authCodeEl = document.getElementById('authCode');
  if (moderatorIdEl) moderatorIdEl.type = 'password';
  if (channelTokenEl) channelTokenEl.type = 'password';
  if (authCodeEl) authCodeEl.type = 'password';
  updateRevealButtonsLabel();
  if (toggleModeratorBtn && moderatorIdEl) toggleModeratorBtn.addEventListener('click', () => { moderatorIdEl.type = (moderatorIdEl.type === 'password') ? 'text' : 'password'; updateRevealButtonsLabel(); });
  if (toggleChannelBtn && channelTokenEl) toggleChannelBtn.addEventListener('click', () => { channelTokenEl.type = (channelTokenEl.type === 'password') ? 'text' : 'password'; updateRevealButtonsLabel(); });
  if (toggleAuthBtn && authCodeEl) toggleAuthBtn.addEventListener('click', () => { authCodeEl.type = (authCodeEl.type === 'password') ? 'text' : 'password'; updateRevealButtonsLabel(); });

  const copyUrlExampleBtn = document.getElementById('copyUrlExampleBtn');
  const copyUrlGenericBtn = document.getElementById('copyUrlGenericBtn');
  const copySeUrlExampleBtn = document.getElementById('copySeUrlExampleBtn');
  const copySeUrlGenericBtn = document.getElementById('copySeUrlGenericBtn');
  const urlExampleEl = document.getElementById('urlExample');
  const urlGenericExampleEl = document.getElementById('urlGenericExample');
  const seUrlExampleEl = document.getElementById('seUrlExample');
  const seUrlGenericExampleEl = document.getElementById('seUrlGenericExample');
  if (copyUrlExampleBtn && urlExampleEl) copyUrlExampleBtn.addEventListener('click', () => copyToClipboard(urlExampleEl.getAttribute('data-full-command') || urlExampleEl.textContent, copyUrlExampleBtn));
  if (copyUrlGenericBtn && urlGenericExampleEl) copyUrlGenericBtn.addEventListener('click', () => copyToClipboard(urlGenericExampleEl.getAttribute('data-full-command') || urlGenericExampleEl.textContent, copyUrlGenericBtn));
  if (copySeUrlExampleBtn && seUrlExampleEl) copySeUrlExampleBtn.addEventListener('click', () => copyToClipboard(seUrlExampleEl.getAttribute('data-full-command') || seUrlExampleEl.textContent, copySeUrlExampleBtn));
  if (copySeUrlGenericBtn && seUrlGenericExampleEl) copySeUrlGenericBtn.addEventListener('click', () => copyToClipboard(seUrlGenericExampleEl.getAttribute('data-full-command') || seUrlGenericExampleEl.textContent, copySeUrlGenericBtn));

  const form = document.getElementById('followage-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.querySelector('#followage-form button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    if (currentFetchController) currentFetchController.abort();
    currentFetchController = new AbortController();
    updateUrlLabels();
    const viewerEl = document.getElementById('viewer');
    const channelEl = document.getElementById('channel');
    const langEl = document.getElementById('lang');
    const formatEl = document.getElementById('format');
    const moderatorIdEl2 = document.getElementById('moderatorId');
    const channelTokenEl2 = document.getElementById('channelToken');
    const authCodeEl2 = document.getElementById('authCode');
    const resultEl = document.getElementById('result');
    const urlBlockEl = document.getElementById('url-block');
    const urlGenericBlockEl = document.getElementById('se-url-generic-block');
    const seUrlBlockEl = document.getElementById('se-url-block');
    const urlGenericBlockElNb = document.getElementById('url-generic-block');

    const viewer = viewerEl.value.trim();
    const channel = channelEl.value.trim();
    const lang = langEl.value;
    const format = formatEl.value;
    const moderatorId = (moderatorIdEl2?.value || '').trim();
    const channelToken = (channelTokenEl2?.value || '').trim();
    const authCode = (authCodeEl2?.value || '').trim();

    let linkType = 'secure';
    const linkTypeRadios = document.getElementsByName('linkType');
    for (const r of linkTypeRadios) { if (r.checked) { linkType = r.value; break; } }

    const dict = getDict();
    if (!viewer) { resultEl.textContent = dict.completeBoth; if (submitBtn) submitBtn.disabled = false; return; }

    if (!channel) {
      const urlsFull = buildFollowageUrls(viewer, channel, lang, format, moderatorId, channelToken, authCode, linkType);

      // Masking
      const authCodeMasked = authCode ? `${authCode.substring(0, 4)}...${authCode.substring(authCode.length - 4)}` : '';
      const moderatorIdMasked = moderatorId ? `${moderatorId.substring(0, 2)}...` : '';
      const channelTokenMasked = channelToken ? `${channelToken.substring(0, 4)}...` : '';
      const urlsMasked = buildFollowageUrls(viewer, channel, lang, format, moderatorIdMasked, channelTokenMasked, authCodeMasked, linkType);

      const urlGenericExampleEl = document.getElementById('urlGenericExample');
      const seUrlGenericExampleEl = document.getElementById('seUrlGenericExample');
      if (urlGenericExampleEl) {
        urlGenericExampleEl.textContent = `$(urlfetch ${urlsMasked.genericUrl})`;
        urlGenericExampleEl.setAttribute('data-full-command', `$(urlfetch ${urlsFull.genericUrl})`);
      }
      if (urlGenericBlockElNb) urlGenericBlockElNb.style.display = '';
      if (seUrlGenericExampleEl) {
        seUrlGenericExampleEl.textContent = `$(customapi ${urlsMasked.genericUrl})`;
        seUrlGenericExampleEl.setAttribute('data-full-command', `$(customapi ${urlsFull.genericUrl})`);
      }
      if (urlGenericBlockEl) urlGenericBlockEl.style.display = '';
      if (urlBlockEl) urlBlockEl.style.display = 'none';
      if (seUrlBlockEl) seUrlBlockEl.style.display = 'none';
      resultEl.textContent = '';
      if (submitBtn) submitBtn.disabled = false;
      return;
    }

    resultEl.textContent = dict.consulting;
    try {
      const urlsFull = buildFollowageUrls(viewer, channel, lang, format, moderatorId, channelToken, authCode, linkType);

      // Masking
      const authCodeMasked = authCode ? `${authCode.substring(0, 4)}...${authCode.substring(authCode.length - 4)}` : '';
      const moderatorIdMasked = moderatorId ? `${moderatorId.substring(0, 2)}...` : '';
      const channelTokenMasked = channelToken ? `${channelToken.substring(0, 4)}...` : '';
      const urlsMasked = buildFollowageUrls(viewer, channel, lang, format, moderatorIdMasked, channelTokenMasked, authCodeMasked, linkType);

      const r = await fetch(urlsFull.fetchUrl, { signal: currentFetchController.signal });
      let resp = r.ok ? r : null;
      const seUrlExampleEl2 = document.getElementById('seUrlExample');
      const seUrlGenericExampleEl2 = document.getElementById('seUrlGenericExample');
      if (seUrlBlockEl && seUrlExampleEl2 && urlsFull.displayUrl) {
        seUrlExampleEl2.textContent = `$(customapi ${urlsMasked.displayUrl})`;
        seUrlExampleEl2.setAttribute('data-full-command', `$(customapi ${urlsFull.displayUrl})`);
        seUrlBlockEl.style.display = '';
      }
      if (urlGenericBlockEl && seUrlGenericExampleEl2 && urlsFull.genericUrl) {
        seUrlGenericExampleEl2.textContent = `$(customapi ${urlsMasked.genericUrl})`;
        seUrlGenericExampleEl2.setAttribute('data-full-command', `$(customapi ${urlsFull.genericUrl})`);
        urlGenericBlockEl.style.display = '';
      }
      if (!resp) {
        if (!isAuthenticated) { resultEl.textContent = dict.mustAuth; return; }
        const apiUrl = new URL('/api/followage', window.location.origin);
        apiUrl.searchParams.set('touser', viewer); apiUrl.searchParams.set('channel', channel);
        apiUrl.searchParams.set('lang', lang); apiUrl.searchParams.set('format', format);
        resp = await fetch(apiUrl, { signal: currentFetchController.signal });
      }
      if (!resp.ok) {
        if (resp.status === 401) resultEl.textContent = dict.errorMustAuth;
        else {
          const err = await resp.json().catch(() => ({ message: dict.unknownError }));
          resultEl.textContent = `${dict.errorPrefix}${err.message || resp.status}`;
        }
        return;
      }
      if (format === 'json') { const json = await resp.json(); resultEl.textContent = JSON.stringify(json, null, 2); }
      else { const text = await resp.text(); resultEl.textContent = text; }
      const urlExampleEl2 = document.getElementById('urlExample');
      const urlGenericExampleEl2 = document.getElementById('urlGenericExample');
      const urlGenericBlockEl2 = document.getElementById('url-generic-block');
      if (urlBlockEl && urlExampleEl2 && urlsFull.displayUrl) {
        urlExampleEl2.textContent = `$(urlfetch ${urlsMasked.displayUrl})`;
        urlExampleEl2.setAttribute('data-full-command', `$(urlfetch ${urlsFull.displayUrl})`);
        urlBlockEl.style.display = '';
      }
      if (urlGenericBlockEl2 && urlGenericExampleEl2 && urlsFull.genericUrl) {
        urlGenericExampleEl2.textContent = `$(urlfetch ${urlsMasked.genericUrl})`;
        urlGenericExampleEl2.setAttribute('data-full-command', `$(urlfetch ${urlsFull.genericUrl})`);
        urlGenericBlockEl2.style.display = '';
      }
    } catch (err) {
      const d = getDict();
      resultEl.textContent = `${d.errorPrefix}${err?.message || d.unknownError}`;
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      currentFetchController = null;
    }
  });

  const langEl = document.getElementById('lang');
  if (langEl) langEl.addEventListener('change', () => {
    updateUrlLabels();
    updateRevealButtonsLabel();
    const d = getDict();
    const authStatusEl = document.getElementById('authStatus');
    const channelAuthStatusEl = document.getElementById('channelAuthStatus');
    if (authStatusEl) authStatusEl.textContent = isAuthenticated ? `${d.authStatusYesPrefix}${lastAuthLogin}` : d.authStatusNo;
    if (channelAuthStatusEl) channelAuthStatusEl.textContent = isChannelAuthenticated ? `${d.channelAuthStatusYesPrefix}${lastChannelLogin}` : d.channelAuthStatusNo;
  });

  const linkTypeRadios = document.getElementsByName('linkType');
  for (const r of linkTypeRadios) {
    r.addEventListener('change', () => {
      const viewerEl = document.getElementById('viewer');
      const channelEl = document.getElementById('channel');
      const form = document.getElementById('followage-form');
      if (form.checkValidity() && channelEl.value) {
        if (typeof form.requestSubmit === 'function') {
          form.requestSubmit();
        } else {
          const submitBtn = document.querySelector('#followage-form button[type="submit"]');
          if (submitBtn) submitBtn.click();
        }
      } else {
        updateUrlLabels();
      }
    });
  }

  const regenAuthCodeBtn = document.getElementById('regenAuthCodeBtn');
  const authCodeEl3 = document.getElementById('authCode');
  if (regenAuthCodeBtn && authCodeEl3) {
    regenAuthCodeBtn.addEventListener('click', async () => {
      const prev = regenAuthCodeBtn.textContent;
      regenAuthCodeBtn.disabled = true;
      try {
        let resp = await fetch('/channel/me');
        if (resp.status === 401) resp = await fetch('/clips/me');
        if (!resp.ok) throw new Error(await resp.text());
        const data = await resp.json();
        const code = data?.auth_code || '';
        if (!code) throw new Error('no_code');
        authCodeEl3.value = code;
        regenAuthCodeBtn.textContent = (currentLang() === 'en') ? 'Regenerated' : '¡Regenerado!';
        setTimeout(() => { regenAuthCodeBtn.textContent = prev; }, 1500);
        const viewer = (document.getElementById('viewer')?.value || '').toString().trim();
        const channel = (document.getElementById('channel')?.value || '').toString().trim();
        const lang = currentLang();
        const format = (document.getElementById('format')?.value || 'ymdhis').toString();
        const moderatorId = (document.getElementById('moderatorId')?.value || '').toString().trim();
        const channelToken = (document.getElementById('channelToken')?.value || '').toString().trim();
        const linkTypeRadios2 = document.getElementsByName('linkType');
        let linkType2 = 'secure'; for (const r of linkTypeRadios2) { if (r.checked) { linkType2 = r.value; break; } }
        const urlsFull = buildFollowageUrls(viewer, channel, lang, format, moderatorId, channelToken, code, linkType2);

        // Masking
        const authCodeMasked = code ? `${code.substring(0, 4)}...${code.substring(code.length - 4)}` : '';
        const moderatorIdMasked = moderatorId ? `${moderatorId.substring(0, 2)}...` : '';
        const channelTokenMasked = channelToken ? `${channelToken.substring(0, 4)}...` : '';
        const urlsMasked = buildFollowageUrls(viewer, channel, lang, format, moderatorIdMasked, channelTokenMasked, authCodeMasked, linkType2);

        if (!channel) {
          const urlGenericExampleEl = document.getElementById('urlGenericExample');
          const seUrlGenericExampleEl = document.getElementById('seUrlGenericExample');
          const urlBlockEl2 = document.getElementById('url-block');
          const seUrlBlockEl2 = document.getElementById('se-url-block');
          const nbBlock = document.getElementById('url-generic-block');
          if (urlGenericExampleEl) {
            urlGenericExampleEl.textContent = `$(urlfetch ${urlsMasked.genericUrl})`;
            urlGenericExampleEl.setAttribute('data-full-command', `$(urlfetch ${urlsFull.genericUrl})`);
          }
          if (nbBlock) nbBlock.style.display = '';
          if (seUrlGenericExampleEl) {
            seUrlGenericExampleEl.textContent = `$(customapi ${urlsMasked.genericUrl})`;
            seUrlGenericExampleEl.setAttribute('data-full-command', `$(customapi ${urlsFull.genericUrl})`);
          }
          const seGenBlock = document.getElementById('se-url-generic-block');
          if (seGenBlock) seGenBlock.style.display = '';
          if (urlBlockEl2) urlBlockEl2.style.display = 'none';
          if (seUrlBlockEl2) seUrlBlockEl2.style.display = 'none';
        } else {
          const urlExampleEl = document.getElementById('urlExample');
          const urlGenericExampleEl = document.getElementById('urlGenericExample');
          const seUrlExampleEl = document.getElementById('seUrlExample');
          const seUrlBlockEl = document.getElementById('se-url-block');
          const seUrlGenericExampleEl = document.getElementById('seUrlGenericExample');
          const seUrlGenericBlockEl = document.getElementById('se-url-generic-block');
          if (urlExampleEl) {
            urlExampleEl.textContent = `$(urlfetch ${urlsMasked.displayUrl})`;
            urlExampleEl.setAttribute('data-full-command', `$(urlfetch ${urlsFull.displayUrl})`);
          }
          if (urlGenericExampleEl) {
            urlGenericExampleEl.textContent = `$(urlfetch ${urlsMasked.genericUrl})`;
            urlGenericExampleEl.setAttribute('data-full-command', `$(urlfetch ${urlsFull.genericUrl})`);
          }
          if (seUrlExampleEl) {
            seUrlExampleEl.textContent = `$(customapi ${urlsMasked.displayUrl})`;
            seUrlExampleEl.setAttribute('data-full-command', `$(customapi ${urlsFull.displayUrl})`);
          }
          if (seUrlBlockEl) seUrlBlockEl.style.display = '';
          if (seUrlGenericExampleEl) {
            seUrlGenericExampleEl.textContent = `$(customapi ${urlsMasked.genericUrl})`;
            seUrlGenericExampleEl.setAttribute('data-full-command', `$(customapi ${urlsFull.genericUrl})`);
          }
          if (seUrlGenericBlockEl) seUrlGenericBlockEl.style.display = '';
        }
      } catch (_) {
        regenAuthCodeBtn.textContent = (currentLang() === 'en') ? 'Error' : 'Error';
        setTimeout(() => { regenAuthCodeBtn.textContent = prev; }, 1500);
      } finally {
        regenAuthCodeBtn.disabled = false;
      }
    });
  }

  await refreshAuth();
  await refreshChannelAuth();
  updateUrlLabels();
  updateRevealButtonsLabel();
}