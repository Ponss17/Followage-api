
// Check authentication status
async function checkClipsAuth() {
    try {
        const resp = await fetch('/clips/me');
        const data = await resp.json();

        if (data.authenticated) {
            document.getElementById('clipsAuthStatus').textContent = `Autenticado como ${data.clips.display_name}`;
            document.getElementById('clipsLoginBtn').style.display = 'none';
            document.getElementById('clipsLogoutBtn').style.display = 'inline-block';
            document.getElementById('clipsNotice').style.display = 'none';

            // Mostrar la sección de comandos
            const commandsSection = document.getElementById('commands');
            if (commandsSection) {
                commandsSection.style.display = 'block';

                // Actualizar el User ID y Access Token
                document.getElementById('userId').textContent = data.clips.id;
                document.getElementById('accessToken').textContent = data.clips.access_token;

                // Generar los comandos
                const baseUrl = window.location.origin;
                const userId = data.clips.id;
                const token = data.clips.access_token;

                // StreamElements
                const seCommand = `$(customapi.${baseUrl}/api/clips/create?user_id=${userId}&token=${token}&channel=$(channel))`;
                document.getElementById('streamElementsCommand').textContent = seCommand;

                // Nightbot
                const nbCommand = `$(urlfetch ${baseUrl}/api/clips/create?user_id=${userId}&token=${token}&channel=$(channel))`;
                document.getElementById('nightbotCommand').textContent = nbCommand;

                // Streamlabs Chatbot
                const slCommand = `$readapi(${baseUrl}/api/clips/create?user_id=${userId}&token=${token}&channel=$mychannel)`;
                document.getElementById('streamlabsCommand').textContent = slCommand;

                // Actualizar las URLs completas en las secciones de abajo
                document.getElementById('urlStreamElements').textContent = seCommand;
                document.getElementById('urlNightbot').textContent = nbCommand;
                document.getElementById('urlStreamlabs').textContent = slCommand;
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

    // Ocultar la sección de comandos
    const commandsSection = document.getElementById('commands');
    if (commandsSection) {
        commandsSection.style.display = 'none';
    }

    return false;
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

// Clip creacion
document.getElementById('clips-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const resultDiv = document.getElementById('clipResult');
    const urlBlock = document.getElementById('clip-url-block');
    const channel = document.getElementById('clipChannel').value.trim();

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
    }
});

// Initialize
checkClipsAuth();
