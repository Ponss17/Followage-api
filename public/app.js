const form = document.getElementById('followage-form');
const viewerEl = document.getElementById('viewer');
const channelEl = document.getElementById('channel');
const langEl = document.getElementById('lang');
const formatEl = document.getElementById('format');
const resultEl = document.getElementById('result');
const urlBlockEl = document.getElementById('url-block');
const urlExampleEl = document.getElementById('urlExample');
const urlGenericBlockEl = document.getElementById('url-generic-block');
const urlGenericExampleEl = document.getElementById('urlGenericExample');
const urlPersonalLabelEl = document.getElementById('urlPersonalLabel');
const urlGenericLabelEl = document.getElementById('urlGenericLabel');
const authStatusEl = document.getElementById('authStatus');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const demoNotice = document.getElementById('demoNotice');
const channelAuthStatusEl = document.getElementById('channelAuthStatus');
const channelLoginBtn = document.getElementById('channelLoginBtn');
const channelLogoutBtn = document.getElementById('channelLogoutBtn');
const channelNotice = document.getElementById('channelNotice');
const moderatorIdEl = document.getElementById('moderatorId');
const channelTokenEl = document.getElementById('channelToken');
let isAuthenticated = false;
let isChannelAuthenticated = false;

// Ajuste para las etiquetas de URL
const i18n = {
  es: {
    urlPersonal: 'URL personalizada (solo follow del usuario):',
    urlGeneric: 'URL genérica (Nightbot; para cualquier usuario):'
  },
  en: {
    urlPersonal: "Personalized URL (returns only the specified user's follow):",
    urlGeneric: 'Generic URL (Nightbot; works for any user):'
  }
};

function updateUrlLabels() {
  const langEl = document.getElementById('lang');
  const urlPersonalLabelEl = document.getElementById('urlPersonalLabel');
  const urlGenericLabelEl = document.getElementById('urlGenericLabel');
  const lang = (langEl?.value || 'es');
  const dict = i18n[lang] || i18n.es;
  if (urlPersonalLabelEl) urlPersonalLabelEl.textContent = dict.urlPersonal;
  if (urlGenericLabelEl) urlGenericLabelEl.textContent = dict.urlGeneric;
}

function updateFormMode() {
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
      if (data.authenticated && data.user) {
        isAuthenticated = true;
        authStatusEl.textContent = `${dict.authStatusYesPrefix}${data.user.display_name || data.user.login}`;
        loginBtn.style.display = 'none';
        logoutBtn.style.display = '';
        if (viewerEl && !viewerEl.value) {
          viewerEl.value = data.user.login;
        }
        if (demoNotice) demoNotice.style.display = 'none';
      } else {
        isAuthenticated = false;
        authStatusEl.textContent = dict.authStatusNo;
        loginBtn.style.display = '';
        logoutBtn.style.display = 'none';
      }
    }
    updateFormMode();
  } catch (_) {
  }
}

if (loginBtn) {
  loginBtn.addEventListener('click', () => {
    window.location.href = '/auth/login';
  });
}
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    try {
      await fetch('/auth/logout', { method: 'POST' });
    } catch (_) {}
    window.location.reload();
  });
}

refreshAuth();

async function refreshChannelAuth() {
  try {
    const resp = await fetch('/channel/me');
    if (resp.ok) {
      const data = await resp.json();
      const dict = getDict();
      if (data.authenticated && data.channel) {
        isChannelAuthenticated = true;
        if (channelAuthStatusEl) channelAuthStatusEl.textContent = `${dict.channelAuthStatusYesPrefix}${data.channel.display_name || data.channel.channel_login}`;
        if (channelLoginBtn) channelLoginBtn.style.display = 'none';
        if (channelLogoutBtn) channelLogoutBtn.style.display = '';
        if (channelNotice) channelNotice.style.display = 'none';
        try {
          const ch = data.channel || {};
          const chId = ch.channel_id != null ? String(ch.channel_id) : '';
          const chToken = ch.access_token || '';
          if (moderatorIdEl && !moderatorIdEl.value && chId) {
            moderatorIdEl.value = chId;
          }
          if (channelTokenEl && !channelTokenEl.value && chToken) {
            channelTokenEl.value = chToken;
          }
        } catch (_) {}
      } else {
        isChannelAuthenticated = false;
        if (channelAuthStatusEl) channelAuthStatusEl.textContent = dict.channelAuthStatusNo;
        if (channelLoginBtn) channelLoginBtn.style.display = '';
        if (channelLogoutBtn) channelLogoutBtn.style.display = 'none';
        if (channelNotice) channelNotice.style.display = '';
      }
      updateFormMode();
    }
  } catch (_) {}
}

if (channelLoginBtn) {
  channelLoginBtn.addEventListener('click', () => {
    window.location.href = '/auth/channel/login';
  });
}
if (channelLogoutBtn) {
  channelLogoutBtn.addEventListener('click', async () => {
    try {
      await fetch('/auth/channel/logout', { method: 'POST' });
    } catch (_) {}
    window.location.reload();
  });
}

refreshChannelAuth();

// Seleccion de idioma
if (langEl) {
  langEl.addEventListener('change', () => {
    updateUrlLabels();
    refreshAuth();
    refreshChannelAuth();
  });
}
updateUrlLabels();

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  updateUrlLabels();
  const viewer = viewerEl.value.trim();
  const channel = channelEl.value.trim();
  const lang = langEl.value;
  const format = formatEl.value;
  const moderatorId = (moderatorIdEl?.value || '').trim();
  const channelToken = (channelTokenEl?.value || '').trim();

  const dict = getDict();

  if (!viewer || !channel) {
    resultEl.textContent = dict.completeBoth;
    return;
  }

  resultEl.textContent = dict.consulting;
  try {
    let resp;
    let usedGarret = false;
    let garretUrlForDisplay;
    let genericUrlForDisplay;
    {
      // URL base dinámico: usa el dominio actual (Vercel)
      const displayBase = window.location.origin;
      const displayUrl = new URL(`/twitch/followage/${encodeURIComponent(channel)}/${encodeURIComponent(viewer)}`, displayBase);
      displayUrl.searchParams.set('format', format === 'json' ? 'json' : 'ymdhis');
      displayUrl.searchParams.set('ping', 'false');
      displayUrl.searchParams.set('lang', lang);
      if (moderatorId) displayUrl.searchParams.set('moderatorId', moderatorId);
      if (channelToken) displayUrl.searchParams.set('token', channelToken);
      garretUrlForDisplay = displayUrl.toString();

      // URL genérica para Nightbot 
      const genericBase = 'https://followage-api.onrender.com';
      const genericUrl = new URL(`/twitch/followage/$(channel)/$(user)`, genericBase);
      genericUrl.searchParams.set('format', format === 'json' ? 'json' : 'ymdhis');
      genericUrl.searchParams.set('ping', 'false');
      genericUrl.searchParams.set('lang', lang);
      if (moderatorId) genericUrl.searchParams.set('moderatorId', moderatorId);
      if (channelToken) genericUrl.searchParams.set('token', channelToken);
      genericUrlForDisplay = genericUrl.toString();

      // URL local para consultar 
      const fetchUrl = new URL(`/twitch/followage/${encodeURIComponent(channel)}/${encodeURIComponent(viewer)}`, window.location.origin);
      fetchUrl.searchParams.set('format', format === 'json' ? 'json' : 'ymdhis');
      fetchUrl.searchParams.set('ping', 'false');
      fetchUrl.searchParams.set('lang', lang);
      if (moderatorId) fetchUrl.searchParams.set('moderatorId', moderatorId);
      if (channelToken) fetchUrl.searchParams.set('token', channelToken);
      const r = await fetch(fetchUrl);
      if (r.ok) {
        resp = r;
        usedGarret = true;
      }
    }
    if (!resp) {
      if (!isAuthenticated) {
        resultEl.textContent = dict.mustAuth;
        return;
      }
      const url = new URL('/api/followage', window.location.origin);
      url.searchParams.set('touser', viewer);
      url.searchParams.set('channel', channel);
      url.searchParams.set('lang', lang);
      url.searchParams.set('format', format);
      resp = await fetch(url);
    }
    if (!resp.ok) {
      if (resp.status === 401) {
        resultEl.textContent = dict.errorMustAuth;
      } else {
        const err = await resp.json().catch(() => ({ message: dict.unknownError }));
        resultEl.textContent = `${dict.errorPrefix}${err.message || resp.status}`;
      }
      return;
    }
    if (format === 'json') {
      const json = await resp.json();
      resultEl.textContent = JSON.stringify(json, null, 2);
    } else {
      const text = await resp.text();
      resultEl.textContent = text;
    }

    if (urlBlockEl && urlExampleEl && garretUrlForDisplay) {
      urlExampleEl.textContent = `$(urlfetch ${garretUrlForDisplay})`;
      urlBlockEl.style.display = '';
    }
    if (urlGenericBlockEl && urlGenericExampleEl && genericUrlForDisplay) {
      urlGenericExampleEl.textContent = `$(urlfetch ${genericUrlForDisplay})`;
      urlGenericBlockEl.style.display = '';
    }
  } catch (err) {
    const d = getDict();
    resultEl.textContent = `${d.errorPrefix}${err?.message || d.unknownError}`;
  }
});