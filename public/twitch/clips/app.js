
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

            // Mostrar la sección de comandos
            const commandsSection = document.getElementById('commands');
            if (commandsSection) {
                commandsSection.style.display = 'block';

                // User ID y Access Token (con verificación de existencia)
                const userIdInput = document.getElementById('userId');
                if (userIdInput) {
                    userIdInput.value = data.clips.id;
                }

                const accessTokenInput = document.getElementById('accessToken');
                if (accessTokenInput) {
                    accessTokenInput.value = data.clips.access_token;
                }

                // Auth Code
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
                setupCopy('copyStreamElementsBtn','streamElementsCommand');
                setupCopy('copyNightbotBtn','nightbotCommand');
                setupCopy('copyStreamlabsBtn','streamlabsCommand');
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
    const seCommand = `$(customapi.${baseUrl}/api/clips/create?${authParam}&channel=$(channel)&creator=\${user})`;
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
            } catch (_) {}
        });
    }
}


// Login boton
document.getElementById('clipsLoginBtn').addEventListener('click', () => {
    window.location.href = '/auth/clips/login';
});

// Logout boton
document.getElementById('clipsLogoutBtn').addEventListener('click', async () => {
    try {
        await fetch('/auth/clips/logout', { method: 'POST' });
        window.location.reload();
    } catch (err) {
        console.error('Error logging out:', err);
        alert('Error al cerrar sesión');
    }
});

// Clip 
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

        document.getElementById('clipUrl').textContent = data.url;
        document.getElementById('clipUrl').href = data.url;
        document.getElementById('clipEditUrl').textContent = data.edit_url;
        document.getElementById('clipEditUrl').href = data.edit_url;
        urlBlock.style.display = 'block';

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
