export function currentLang() {
  const el = document.getElementById('lang');
  return el?.value || 'es';
}
export function getDict() {
  const lang = currentLang();
  const translations = {
    es: {
      authStatusYesPrefix: 'Autenticado como: ',
      authStatusNo: 'No autenticado',
      channelAuthStatusYesPrefix: 'Canal autenticado: ',
      channelAuthStatusNo: 'Canal no autenticado',
      completeBoth: 'Por favor completa ambos campos (usuario y canal)',
      consulting: 'Consultando...',
      mustAuth: 'Debes autenticarte o proporcionar un token de canal/moderador',
      errorMustAuth: 'Error: Autenticación requerida',
      unknownError: 'Error desconocido',
      errorPrefix: 'Error: ',
      urlPersonal: 'URL personalizada (solo follow del usuario):',
      urlGeneric: 'URL genérica (Nightbot; para cualquier usuario):'
    },
    en: {
      authStatusYesPrefix: 'Authenticated as: ',
      authStatusNo: 'Not authenticated',
      channelAuthStatusYesPrefix: 'Channel authenticated: ',
      channelAuthStatusNo: 'Channel not authenticated',
      completeBoth: 'Please complete both fields (user and channel)',
      consulting: 'Consulting...',
      mustAuth: 'You must authenticate or provide a channel/moderator token',
      errorMustAuth: 'Error: Authentication required',
      unknownError: 'Unknown error',
      errorPrefix: 'Error: ',
      urlPersonal: "Personalized URL (returns only the specified user's follow):",
      urlGeneric: 'Generic URL (Nightbot; works for any user):'
    }
  };
  return translations[lang] || translations.es;
}
export function labelForState(isPassword) {
  const lang = currentLang();
  return isPassword ? (lang === 'en' ? 'Show' : 'Mostrar') : (lang === 'en' ? 'Hide' : 'Ocultar');
}
export function updateUrlLabels() {
  const d = getDict();
  const p = document.getElementById('urlPersonalLabel');
  const g = document.getElementById('urlGenericLabel');
  if (p) p.textContent = d.urlPersonal;
  if (g) g.textContent = d.urlGeneric;
}