import { setupCopy } from '/js/copy.js';

function renderCommands(baseUrl, authCode, userId, token) {
  console.log('Rendering commands:', { baseUrl, authCode, userId, token });
  const authParam = authCode ? `auth=${authCode}` : `user_id=${userId}&token=${token}`;

  const seCommand = `$(customapi ${baseUrl}/api/clips/create?${authParam}&channel=$(channel)&creator=\${user})`;
  const streamElementsCommand = document.getElementById('streamElementsCommand');
  if (streamElementsCommand) {
    streamElementsCommand.textContent = seCommand;
  } else {
    console.error('Element streamElementsCommand not found');
  }

  const nbCommand = `$(urlfetch ${baseUrl}/api/clips/create?${authParam}&channel=$(channel)&creator=$(user))`;
  const nightbotCommand = document.getElementById('nightbotCommand');
  if (nightbotCommand) {
    nightbotCommand.textContent = nbCommand;
  }

  const slCommand = `$readapi(${baseUrl}/api/clips/create?${authParam}&channel=$mychannel&creator=$user)`;
  const streamlabsCommand = document.getElementById('streamlabsCommand');
  if (streamlabsCommand) {
    streamlabsCommand.textContent = slCommand;
  }
}

let currentUserId = null;
let currentUserToken = null;
let currentClipController = null;

export async function initClipsUI() {
  const toggleAuthBtn = document.getElementById('toggleAuthCode');
  const authCodeEl = document.getElementById('authCode');
  const regenAuthCodeBtn = document.getElementById('regenAuthCodeBtn');
  const loginBtn = document.getElementById('clipsLoginBtn');
  const logoutBtn = document.getElementById('clipsLogoutBtn');
  const authStatus = document.getElementById('clipsAuthStatus');
  const clipsNotice = document.getElementById('clipsNotice');
  const commandsSection = document.getElementById('commands');

  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      window.location.href = '/auth/clips/login';
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await fetch('/auth/clips/logout', { method: 'POST' });
        window.location.reload();
      } catch (err) {
        console.error('Error logging out:', err);
        alert('Error al cerrar sesión');
      }
    });
  }

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
  setupCopy('copyNightbotBtn', 'nightbotCommand');
  setupCopy('copyStreamlabsBtn', 'streamlabsCommand');
  setupCopy('copyStreamElementsBtn', 'streamElementsCommand');

  const form = document.getElementById('clips-form');
  if (form) {
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
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: currentClipController.signal
        });

        const data = await resp.json();

        if (!resp.ok) {
          throw new Error(data.message || 'Error creando clip');
        }

        resultDiv.textContent = '✅ ¡Clip creado exitosamente!';
        resultDiv.style.color = '#4ade80';

        const clipUrl = data.url || '';
        const editUrl = data.edit_url || '';

        const clipUrlEl = document.getElementById('clipUrl');
        const clipEditUrlEl = document.getElementById('clipEditUrl');

        if (clipUrlEl) {
          clipUrlEl.textContent = clipUrl;
          clipUrlEl.href = clipUrl;
        }
        if (clipEditUrlEl) {
          clipEditUrlEl.textContent = editUrl;
          clipEditUrlEl.href = editUrl;
        }

        urlBlock.style.display = 'block';
      } catch (err) {
        if (err.name === 'AbortError') return;
        resultDiv.textContent = `❌ Error: ${err.message}`;
        resultDiv.style.color = '#f87171';
      } finally {
        if (submitBtn) submitBtn.disabled = false;
        currentClipController = null;
      }
    });
  }

  try {
    const resp = await fetch('/clips/me');
    if (resp.ok) {
      const data = await resp.json();
      if (data.authenticated && data.clips) {
        if (authStatus) authStatus.textContent = `Autenticado como ${data.clips.display_name}`;
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        if (clipsNotice) clipsNotice.style.display = 'none';
        if (commandsSection) commandsSection.style.display = 'block';

        const authCode = data.auth_code;
        currentUserId = data.clips?.id || null;
        currentUserToken = data.clips?.access_token || null;

        const baseUrl = window.location.origin;
        renderCommands(baseUrl, authCode, currentUserId, currentUserToken);
        if (authCode && authCodeEl) authCodeEl.value = authCode;
      } else {
        if (authStatus) authStatus.textContent = 'No autenticado';
        if (loginBtn) loginBtn.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (clipsNotice) clipsNotice.style.display = 'block';
        if (commandsSection) commandsSection.style.display = 'none';
      }
    }
  } catch (_) { }
}