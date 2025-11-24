// Clips page JavaScript

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
            return true;
        }
    } catch (err) {
        console.error('Error checking clips auth:', err);
    }

    document.getElementById('clipsAuthStatus').textContent = 'No autenticado';
    document.getElementById('clipsLoginBtn').style.display = 'inline-block';
    document.getElementById('clipsLogoutBtn').style.display = 'none';
    document.getElementById('clipsNotice').style.display = 'block';
    return false;
}

// Login button
document.getElementById('clipsLoginBtn').addEventListener('click', () => {
    window.location.href = '/auth/clips/login';
});

// Logout button
document.getElementById('clipsLogoutBtn').addEventListener('click', async () => {
    try {
        await fetch('/auth/clips/logout', { method: 'POST' });
        window.location.reload();
    } catch (err) {
        console.error('Error logging out:', err);
        alert('Error al cerrar sesión');
    }
});

// Clip creation form
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
        document.getElementById('clipEditUrl').textContent = data.edit_url;
        urlBlock.style.display = 'block';

    } catch (err) {
        resultDiv.textContent = `❌ Error: ${err.message}`;
        resultDiv.style.color = '#f87171';
    }
});

// Initialize
checkClipsAuth();
