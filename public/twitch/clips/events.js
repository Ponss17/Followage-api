import { setupCopy } from '/js/copy.js';

function renderCommands(baseUrl, authCode, userId, token) {
  const authParam = authCode ? `auth=${authCode}` : `user_id=${userId}&token=${token}`;
  const maskedAuthParam = authCode ? `auth=${authCode.substring(0, 4)}...${authCode.substring(authCode.length - 4)}` : `user_id=${userId}&token=${token.substring(0, 4)}...`;

  const seFull = `$(customapi ${baseUrl}/api/clips/create?${authParam}&channel=$(channel)&creator=\${user})`;
  const seMasked = `$(customapi ${baseUrl}/api/clips/create?${maskedAuthParam}&channel=$(channel)&creator=\${user})`;
  const streamElementsCommand = document.getElementById('streamElementsCommand');
  if (streamElementsCommand) {
    streamElementsCommand.textContent = seMasked;
    streamElementsCommand.setAttribute('data-full-command', seFull);
  }

  const nbFull = `$(urlfetch ${baseUrl}/api/clips/create?${authParam}&channel=$(channel)&creator=$(user))`;
  const nbMasked = `$(urlfetch ${baseUrl}/api/clips/create?${maskedAuthParam}&channel=$(channel)&creator=$(user))`;
  const nightbotCommand = document.getElementById('nightbotCommand');
  if (nightbotCommand) {
    nightbotCommand.textContent = nbMasked;
    nightbotCommand.setAttribute('data-full-command', nbFull);
  }

  const slFull = `$readapi(${baseUrl}/api/clips/create?${authParam}&channel=$mychannel&creator=$user)`;
  const slMasked = `$readapi(${baseUrl}/api/clips/create?${maskedAuthParam}&channel=$mychannel&creator=$user)`;
  const streamlabsCommand = document.getElementById('streamlabsCommand');
  if (streamlabsCommand) {
    streamlabsCommand.textContent = slMasked;
    streamlabsCommand.setAttribute('data-full-command', slFull);
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

        const clipTitle = data.title || 'Clip creado';
        const clipThumb = data.thumbnail_url || 'https://vod-secure.twitch.tv/_404/404_processing_480x272.png';
        const clipCreator = data.creator_name || 'Desconocido';
        const clipDuration = data.duration ? `${Math.round(data.duration)}s` : '';

        urlBlock.style.display = 'none';

        resultDiv.innerHTML = `
            <div class="clip-card" style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; margin-top: 20px; display: flex; flex-direction: column; gap: 12px; border: 1px solid rgba(255,255,255,0.1);">
                <div style="position: relative; width: 100%; aspect-ratio: 16/9; overflow: hidden; border-radius: 8px;">
                    <img src="${clipThumb}" alt="Clip Thumbnail" style="width: 100%; height: 100%; object-fit: cover;">
                    ${clipDuration ? `<span style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.8); color: white; padding: 2px 6px; border-radius: 4px; font-size: 12px; font-weight: 600;">${clipDuration}</span>` : ''}
                </div>
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <h3 style="margin: 0; font-size: 16px; color: #fff;">${clipTitle}</h3>
                    <p style="margin: 0; font-size: 14px; color: #aaa;">Creado por <strong>${clipCreator}</strong></p>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 4px;">
                    <a href="${data.url}" target="_blank" class="btn" style="flex: 1; text-align: center; text-decoration: none; font-size: 14px; padding: 8px;">Ver Clip</a>
                    <a href="${data.edit_url}" target="_blank" class="btn btn-secondary" style="flex: 1; text-align: center; text-decoration: none; font-size: 14px; padding: 8px;">Editar</a>
                </div>
                <div style="margin-top: 8px; font-size: 12px; color: #666; display: flex; align-items: center; gap: 8px;">
                    <input type="text" value="${data.url}" readonly style="flex: 1; background: rgba(0,0,0,0.2); border: none; color: #888; padding: 4px 8px; border-radius: 4px;">
                    <button class="reveal-btn" onclick="navigator.clipboard.writeText('${data.url}')">Copiar</button>
                </div>
            </div>
        `;
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