export async function copyToClipboard(text, btn) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    if (btn) {
      const prev = btn.textContent;
      btn.textContent = (document.getElementById('lang')?.value === 'en') ? 'Copied' : 'Copiado';
      setTimeout(() => { btn.textContent = prev; }, 1500);
    }
  } catch (_) {}
}
export function setupCopy(btnId, codeId) {
  const btn = document.getElementById(btnId);
  const codeEl = document.getElementById(codeId);
  if (btn && codeEl) {
    btn.addEventListener('click', () => copyToClipboard(codeEl.textContent, btn));
  }
}