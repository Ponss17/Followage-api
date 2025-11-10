const form = document.getElementById('followage-form');
const viewerEl = document.getElementById('viewer');
const channelEl = document.getElementById('channel');
const langEl = document.getElementById('lang');
const formatEl = document.getElementById('format');
const resultEl = document.getElementById('result');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
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
      const err = await resp.json().catch(() => ({ message: 'Error desconocido' }));
      resultEl.textContent = `Error: ${err.message || resp.status}`;
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