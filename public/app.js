const form = document.getElementById('followage-form');
const viewerEl = document.getElementById('viewer');
const channelEl = document.getElementById('channel');
const langEl = document.getElementById('lang');
const formatEl = document.getElementById('format');
const resultEl = document.getElementById('result');
const urlBlockEl = document.getElementById('url-block');
const urlExampleEl = document.getElementById('urlExample');
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
      if (data.authenticated && data.user) {
        isAuthenticated = true;
        authStatusEl.textContent = `Sesión: ${data.user.display_name || data.user.login}`;
        loginBtn.style.display = 'none';
        logoutBtn.style.display = '';
        if (viewerEl && !viewerEl.value) {
          viewerEl.value = data.user.login;
        }
        if (demoNotice) demoNotice.style.display = 'none';
      } else {
        isAuthenticated = false;
        authStatusEl.textContent = 'No autenticado';
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
      if (data.authenticated && data.channel) {
        isChannelAuthenticated = true;
        if (channelAuthStatusEl) channelAuthStatusEl.textContent = `Canal autenticado: ${data.channel.display_name || data.channel.channel_login}`;
        if (channelLoginBtn) channelLoginBtn.style.display = 'none';
        if (channelLogoutBtn) channelLogoutBtn.style.display = '';
        if (channelNotice) channelNotice.style.display = 'none';
      } else {
        isChannelAuthenticated = false;
        if (channelAuthStatusEl) channelAuthStatusEl.textContent = 'Canal no autenticado';
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

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const viewer = viewerEl.value.trim();
  const channel = channelEl.value.trim();
  const lang = langEl.value;
  const format = formatEl.value;
  const moderatorId = (moderatorIdEl?.value || '').trim();
  const channelToken = (channelTokenEl?.value || '').trim();
  if (!viewer || !channel) {
    resultEl.textContent = 'Completa usuario y canal.';
    return;
  }

  resultEl.textContent = 'Consultando...';
  try {
    let resp;
    let usedGarret = false;
    let garretUrlForDisplay;
    {
      const url = new URL(`/twitch/followage/${encodeURIComponent(channel)}/${encodeURIComponent(viewer)}`, window.location.origin);
      url.searchParams.set('format', format === 'json' ? 'json' : 'ymdhis');
      url.searchParams.set('ping', 'false');
      url.searchParams.set('lang', lang);
      if (moderatorId) url.searchParams.set('moderatorId', moderatorId);
      if (channelToken) url.searchParams.set('token', channelToken);
      garretUrlForDisplay = url.toString();
      const r = await fetch(url);
      if (r.ok) {
        resp = r;
        usedGarret = true;
      }
    }
    if (!resp) {
      if (!isAuthenticated) {
        resultEl.textContent = 'Debes iniciar sesión (usuario) o autenticar el canal para consultar followage.';
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
        resultEl.textContent = 'Error: Debes iniciar sesión (usuario o canal) para usar esta API.';
      } else {
        const err = await resp.json().catch(() => ({ message: 'Error desconocido' }));
        resultEl.textContent = `Error: ${err.message || resp.status}`;
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
      urlExampleEl.textContent = garretUrlForDisplay;
      urlBlockEl.style.display = '';
    }
  } catch (err) {
    resultEl.textContent = `Error: ${err.message || err}`;
  }
});