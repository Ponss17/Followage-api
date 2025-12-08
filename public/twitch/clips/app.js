
let currentUserId = null;
let currentUserToken = null;

async function checkClipsAuth() {
    try {
        const resp = await fetch('/clips/me');
        const data = await resp.json();

        if (data.authenticated && data.clips) {
            document.getElementById('clipsAuthStatus').textContent = `Autenticado como ${data.clips.display_name}`;
            document.getElementById('clipsLoginBtn').style.display = 'none';
            document.getElementById('clipsLogoutBtn').style.display = 'inline-block';
            document.getElementById('clipsNotice').style.display = 'none';

            const commandsSection = document.getElementById('commands');
            if (commandsSection) {
                commandsSection.style.display = 'block';

                const userIdInput = document.getElementById('userId');
                if (userIdInput) {
                    userIdInput.value = data.clips.id;
                }

                const accessTokenInput = document.getElementById('accessToken');
                if (accessTokenInput) {
                    accessTokenInput.value = data.clips.access_token;
                }

                const authCode = data.auth_code;
                if (authCode) {
                    const authCodeInput = document.getElementById('authCode');
                    if (authCodeInput) {
                        authCodeInput.value = authCode;
                    }
                }

                const baseUrl = window.location.origin;
                currentUserId = data.clips.id;
                currentUserToken = data.clips.access_token;
                renderCommands(baseUrl, authCode, currentUserId, currentUserToken);
                setupCopy('copyStreamElementsBtn', 'streamElementsCommand');
                setupCopy('copyNightbotBtn', 'nightbotCommand');
                setupCopy('copyStreamlabsBtn', 'streamlabsCommand');
            }

            return true;
        }
    } catch (err) {
        console.error('Error checking clips auth:', err);
    }

    document.getElementById('clipsAuthStatus').textContent = 'No autenticado';
    document.getElementById('clipsLoginBtn').style.display = 'inline-block';
    document.getElementById('clipsLogoutBtn').style.display = 'none';
    document.getElementById('clipsNotice').style.display = 'block';

    const commandsSection = document.getElementById('commands');
    if (commandsSection) {
        commandsSection.style.display = 'none';
    }

    return false;
}


function renderCommands(baseUrl, authCode, userId, token) {
    const authParam = authCode ? `auth=${authCode}` : `user_id=${userId}&token=${token}`;
    const seCommand = `$(customapi ${baseUrl}/api/clips/create?${authParam}&channel=$(channel)&creator=\${user})`;
    const streamElementsCommand = document.getElementById('streamElementsCommand');
    if (streamElementsCommand) streamElementsCommand.textContent = seCommand;
    const nbCommand = `$(urlfetch ${baseUrl}/api/clips/create?${authParam}&channel=$(channel)&creator=$(user))`;
    const nightbotCommand = document.getElementById('nightbotCommand');
    if (nightbotCommand) nightbotCommand.textContent = nbCommand;
    const slCommand = `$readapi(${baseUrl}/api/clips/create?${authParam}&channel=$mychannel&creator=$user)`;
    const streamlabsCommand = document.getElementById('streamlabsCommand');
    if (streamlabsCommand) streamlabsCommand.textContent = slCommand;
}

function setupCopy(btnId, codeId) {
    const btn = document.getElementById(btnId);
    const codeEl = document.getElementById(codeId);
    if (btn && codeEl) {
        btn.addEventListener('click', async () => {
            const text = codeEl.textContent || '';
            if (!text) return;
            try {
                await navigator.clipboard.writeText(text);
                const prev = btn.textContent;
                btn.textContent = '¡Copiado!';
                setTimeout(() => { btn.textContent = prev; }, 1500);
            } catch (_) { }
        });
    }
}


document.getElementById('clipsLoginBtn').addEventListener('click', () => {
    window.location.href = '/auth/clips/login';
});

document.getElementById('clipsLogoutBtn').addEventListener('click', async () => {
    try {
        await fetch('/auth/clips/logout', { method: 'POST' });
        window.location.reload();
    } catch (err) {
        console.error('Error logging out:', err);
        alert('Error al cerrar sesión');
    }
});

document.getElementById('clips-form').addEventListener('submit', async (e) => {
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
        const url = channel ? `/api/clips/create?channel=${encodeURIComponent(channel)}` : '/api/clips/create';
        const resp = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!resp.ok) {
            const error = await resp.json();
            throw new Error(error.message || 'Error creando clip');
        }

        const data = await resp.json();

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
        resultDiv.textContent = `❌ Error: ${err.message}`;
        resultDiv.style.color = '#f87171';
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
});

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
            const resp = await fetch('/clips/me');
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
        }
    });
}

checkClipsAuth();


// vivan las chichonas :)
