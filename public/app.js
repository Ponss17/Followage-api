const form = document.getElementById('followage-form');
const viewerEl = document.getElementById('viewer');
const channelEl = document.getElementById('channel');
const langEl = document.getElementById('lang');
const formatEl = document.getElementById('format');
const resultEl = document.getElementById('result');
const authStatusEl = document.getElementById('authStatus');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const demoNotice = document.getElementById('demoNotice');
let isAuthenticated = false;

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
        if (viewerEl) viewerEl.readOnly = true;
        if (demoNotice) demoNotice.style.display = 'none';
      } else {
        isAuthenticated = false;
        authStatusEl.textContent = 'No autenticado';
        loginBtn.style.display = '';
        logoutBtn.style.display = 'none';
        if (viewerEl) viewerEl.readOnly = true; // bloqueado hasta iniciar sesión
        if (demoNotice) demoNotice.style.display = '';
      }
    }
  } catch (_) {
    // ignore
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

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isAuthenticated) {
    resultEl.textContent = 'Debes iniciar sesión para consultar followage.';
    return;
  }
  const viewer = viewerEl.value.trim();
  const channel = channelEl.value.trim();
  const lang = langEl.value;
  const format = formatEl.value;
  if (!viewer || !channel) {
    resultEl.textContent = 'Completa usuario y canal.';
    return;
  }

  resultEl.textContent = 'Consultando...';
  try {
    const url = new URL('/api/followage', window.location.origin);
    url.searchParams.set('touser', viewer);
    url.searchParams.set('channel', channel);
    url.searchParams.set('lang', lang);
    url.searchParams.set('format', format);
    const resp = await fetch(url);
    if (!resp.ok) {
      if (resp.status === 401) {
        resultEl.textContent = 'Error: Debes iniciar sesión para usar esta API.';
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
  } catch (err) {
    resultEl.textContent = `Error: ${err.message || err}`;
  }
});