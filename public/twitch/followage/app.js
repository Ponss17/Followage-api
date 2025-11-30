const form = document.getElementById('followage-form');
const viewerEl = document.getElementById('viewer');
const channelEl = document.getElementById('channel');
const langEl = document.getElementById('lang');
const formatEl = document.getElementById('format');
const resultEl = document.getElementById('result');
const urlBlockEl = document.getElementById('url-block');
const urlExampleEl = document.getElementById('urlExample');
const urlPersonalLabelEl = document.getElementById('urlPersonalLabel');
const urlGenericBlockEl = document.getElementById('url-generic-block');
const urlGenericExampleEl = document.getElementById('urlGenericExample');
const seUrlBlockEl = document.getElementById('se-url-block');
const seUrlExampleEl = document.getElementById('seUrlExample');
const seUrlGenericBlockEl = document.getElementById('se-url-generic-block');
const seUrlGenericExampleEl = document.getElementById('seUrlGenericExample');
const urlGenericLabelEl = document.getElementById('urlGenericLabel');
const authStatusEl = document.getElementById('authStatus');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const demoNotice = document.getElementById('demoNotice');
const channelAuthStatusEl = document.getElementById('channelAuthStatus');
const channelLoginBtn = document.getElementById('channelLoginBtn');
const channelLogoutBtn = document.getElementById('channelLogoutBtn');
const channelNotice = document.getElementById('channelNotice');
const moderatorIdEl = document.getElementById('moderatorId');
const channelTokenEl = document.getElementById('channelToken');
const toggleModeratorBtn = document.getElementById('toggleModeratorId');
const toggleChannelBtn = document.getElementById('toggleChannelToken');
const toggleAuthBtn = document.getElementById('toggleAuthCode');
const authCodeEl = document.getElementById('authCode');
const regenAuthCodeBtn = document.getElementById('regenAuthCodeBtn');
const copyUrlExampleBtn = document.getElementById('copyUrlExampleBtn');
const copyUrlGenericBtn = document.getElementById('copyUrlGenericBtn');
const copySeUrlExampleBtn = document.getElementById('copySeUrlExampleBtn');
const copySeUrlGenericBtn = document.getElementById('copySeUrlGenericBtn');
const linkTypeContainer = document.getElementById('linkTypeContainer');
const linkTypeRadios = document.getElementsByName('linkType');

let isAuthenticated = false;
let isChannelAuthenticated = false;

function getDict() {
  const langEl = document.getElementById('lang');
  const lang = langEl?.value || 'es';

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
      errorPrefix: 'Error: '
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
      errorPrefix: 'Error: '
    }
  };

  return translations[lang] || translations.es;
}

const i18n = {
  es: {
    urlPersonal: 'URL personalizada (solo follow del usuario):',
    urlGeneric: 'URL genérica (Nightbot; para cualquier usuario):'
  },
  en: {
    urlPersonal: "Personalized URL (returns only the specified user's follow):",
    urlGeneric: 'Generic URL (Nightbot; works for any user):'
  }
};

function updateUrlLabels() {
  const lang = (langEl?.value || 'es');
  const dict = i18n[lang] || i18n.es;
  if (urlPersonalLabelEl) urlPersonalLabelEl.textContent = dict.urlPersonal;
  if (urlGenericLabelEl) urlGenericLabelEl.textContent = dict.urlGeneric;
}

function updateFormMode() {
  if (isChannelAuthenticated) {
    if (viewerEl) viewerEl.readOnly = false;
    if (demoNotice) demoNotice.style.display = 'none';
    if (channelNotice) channelNotice.style.display = 'none';
  } else {
    if (viewerEl) viewerEl.readOnly = true;
    if (!isAuthenticated && demoNotice) demoNotice.style.display = '';
  }
}

async function refreshAuth() {
  try {
    const resp = await fetch('/me');
    if (resp.ok) {
      const data = await resp.json();
      const dict = getDict();
      if (data.authenticated && data.user) {
        isAuthenticated = true;
        authStatusEl.textContent = `${dict.authStatusYesPrefix}${data.user.display_name || data.user.login}`;
        loginBtn.style.display = 'none';
        logoutBtn.style.display = '';
        if (viewerEl && !viewerEl.value) {
          viewerEl.value = data.user.login;
        }
        if (demoNotice) demoNotice.style.display = 'none';
      } else {
        isAuthenticated = false;
        authStatusEl.textContent = dict.authStatusNo;
        loginBtn.style.display = '';
        logoutBtn.style.display = 'none';
      }
    }
    updateFormMode();
  } catch (_) {
  }
}

if (loginBtn) {
  loginBtn.addEventListener('click', () => {
    window.location.href = new URL('/auth/login', window.location.origin).toString();
  });
}
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    try {
      await fetch('/auth/logout', { method: 'POST' });
    } catch (_) { }
    window.location.reload();
  });
}

refreshAuth();

async function refreshChannelAuth() {
  try {
    const resp = await fetch('/channel/me');
    if (resp.ok) {
      const data = await resp.json();
      const dict = getDict();
      if (data.authenticated && data.channel) {
        isChannelAuthenticated = true;
        if (channelAuthStatusEl) channelAuthStatusEl.textContent = `${dict.channelAuthStatusYesPrefix}${data.channel.display_name || data.channel.channel_login}`;
        if (channelLoginBtn) channelLoginBtn.style.display = 'none';
        if (channelLogoutBtn) channelLogoutBtn.style.display = '';
        if (channelNotice) channelNotice.style.display = 'none';
        if (linkTypeContainer) linkTypeContainer.style.display = '';
        try {
          const ch = data.channel || {};
          const chId = ch.channel_id != null ? String(ch.channel_id) : (ch.id != null ? String(ch.id) : '');
          const chToken = ch.access_token || '';
          if (moderatorIdEl) {
            if (chId) moderatorIdEl.value = chId;
            moderatorIdEl.type = 'text';
          }
          if (channelTokenEl && chToken) {
            channelTokenEl.value = chToken;
          }
          if (authCodeEl && data.auth_code) {
            authCodeEl.value = data.auth_code;
          }
          updateRevealButtonsLabel();
        } catch (_) { }
      } else {
        isChannelAuthenticated = false;
        if (channelAuthStatusEl) channelAuthStatusEl.textContent = dict.channelAuthStatusNo;
        if (channelLoginBtn) channelLoginBtn.style.display = '';
        if (channelLogoutBtn) channelLogoutBtn.style.display = 'none';
        if (channelNotice) channelNotice.style.display = '';
        if (linkTypeContainer) linkTypeContainer.style.display = 'none';
      }
      updateFormMode();
    }
  } catch (_) { }
}

if (channelLoginBtn) {
  channelLoginBtn.addEventListener('click', () => {
    window.location.href = new URL('/auth/channel/login', window.location.origin).toString();
  });
}
if (channelLogoutBtn) {
  channelLogoutBtn.addEventListener('click', async () => {
    try {
      await fetch('/auth/channel/logout', { method: 'POST' });
    } catch (_) { }
    window.location.reload();
  });
}

refreshChannelAuth();


async function copyToClipboard(text, btn) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    if (btn) {
      const prev = btn.textContent;
      btn.textContent = (currentLang() === 'en') ? 'Copied' : 'Copiado';
      setTimeout(() => { btn.textContent = prev; }, 1500);
    }
  } catch (_) { }
}

if (copyUrlExampleBtn && urlExampleEl) {
  copyUrlExampleBtn.addEventListener('click', () => {
    copyToClipboard(urlExampleEl.textContent, copyUrlExampleBtn);
  });
}
if (copyUrlGenericBtn && urlGenericExampleEl) {
  copyUrlGenericBtn.addEventListener('click', () => {
    copyToClipboard(urlGenericExampleEl.textContent, copyUrlGenericBtn);
  });
}
if (copySeUrlExampleBtn && seUrlExampleEl) {
  copySeUrlExampleBtn.addEventListener('click', () => {
    copyToClipboard(seUrlExampleEl.textContent, copySeUrlExampleBtn);
  });
}
if (copySeUrlGenericBtn && seUrlGenericExampleEl) {
  copySeUrlGenericBtn.addEventListener('click', () => {
    copyToClipboard(seUrlGenericExampleEl.textContent, copySeUrlGenericBtn);
  });
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = document.querySelector('#followage-form button[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;
  updateUrlLabels();
  const viewer = viewerEl.value.trim();
  const channel = channelEl.value.trim();
  const lang = langEl.value;
  const format = formatEl.value;
  const moderatorId = (moderatorIdEl?.value || '').trim();
  const channelToken = (channelTokenEl?.value || '').trim();
  const authCode = (authCodeEl?.value || '').trim();

  let linkType = 'secure';
  if (linkTypeRadios) {
    for (const r of linkTypeRadios) {
      if (r.checked) {
        linkType = r.value;
        break;
      }
    }
  }

  const dict = getDict();

  if (!viewer) {
    resultEl.textContent = dict.completeBoth;
    return;
  }

  if (!channel) {
    const urls = buildFollowageUrls(viewer, channel, lang, format, moderatorId, channelToken, authCode, linkType);
    if (urlGenericExampleEl) urlGenericExampleEl.textContent = `$(urlfetch ${urls.genericUrl})`;
    if (urlGenericBlockEl) urlGenericBlockEl.style.display = '';
    if (seUrlGenericExampleEl) seUrlGenericExampleEl.textContent = `$(customapi.${urls.genericUrl})`;
    if (seUrlGenericBlockEl) seUrlGenericBlockEl.style.display = '';
    if (urlBlockEl) urlBlockEl.style.display = 'none';
    if (seUrlBlockEl) seUrlBlockEl.style.display = 'none';
    resultEl.textContent = '';
    return;
  }

  resultEl.textContent = dict.consulting;
  try {
    let resp;
    let garretUrlForDisplay;
    let genericUrlForDisplay;
    const urls = buildFollowageUrls(viewer, channel, lang, format, moderatorId, channelToken, authCode, linkType);
    garretUrlForDisplay = urls.displayUrl;
    genericUrlForDisplay = urls.genericUrl;
    const r = await fetch(urls.fetchUrl);
    if (r.ok) {
      resp = r;
    }
    if (seUrlBlockEl && seUrlExampleEl && garretUrlForDisplay) {
      seUrlExampleEl.textContent = `$(customapi ${garretUrlForDisplay})`;      seUrlBlockEl.style.display = '';
    }
    if (seUrlGenericBlockEl && seUrlGenericExampleEl && genericUrlForDisplay) {
      seUrlGenericExampleEl.textContent = `$(customapi ${genericUrlForDisplay})`;      seUrlGenericBlockEl.style.display = '';
    }
    if (!resp) {
      if (!isAuthenticated) {
        resultEl.textContent = dict.mustAuth;
        return;
      }
      const url = new URL('/api/followage', window.location.origin);
      url.searchParams.set('touser', viewer);
      url.searchParams.set('channel', channel);
      url.searchParams.set('lang', lang);
      url.searchParams.set('format', format);
      resp = await fetch(url);
    }
    if (!resp.ok) {
      if (resp.status === 401) {
        resultEl.textContent = dict.errorMustAuth;
      } else {
        const err = await resp.json().catch(() => ({ message: dict.unknownError }));
        resultEl.textContent = `${dict.errorPrefix}${err.message || resp.status}`;
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

    if (urlBlockEl && urlExampleEl && garretUrlForDisplay) {
      urlExampleEl.textContent = `$(urlfetch ${garretUrlForDisplay})`;
      urlBlockEl.style.display = '';
    }
    if (urlGenericBlockEl && urlGenericExampleEl && genericUrlForDisplay) {
      urlGenericExampleEl.textContent = `$(urlfetch ${genericUrlForDisplay})`;
      urlGenericBlockEl.style.display = '';
    }
  } catch (err) {
    const d = getDict();
    resultEl.textContent = `${d.errorPrefix}${err?.message || d.unknownError}`;
  } finally {
    const submitBtn2 = document.querySelector('#followage-form button[type="submit"]');
    if (submitBtn2) submitBtn2.disabled = false;
  }
});

function buildSecureUrls(viewer, channel, lang, format, authCode) {
  const displayBase = window.location.origin;
  const displayUrl = new URL(`/twitch/followage/${encodeURIComponent(channel)}/${encodeURIComponent(viewer)}`, displayBase);
  displayUrl.searchParams.set('format', format === 'json' ? 'json' : 'ymdhis');
  displayUrl.searchParams.set('lang', lang);
  if (authCode) displayUrl.searchParams.set('auth', authCode);

  const genericBase = 'https://www.losperris.site';
  const genericUrl = new URL(`/twitch/followage/$(channel)/$(user)`, genericBase);
  genericUrl.searchParams.set('format', format === 'json' ? 'json' : 'ymdhis');
  genericUrl.searchParams.set('ping', 'false');
  genericUrl.searchParams.set('lang', lang);
  if (authCode) genericUrl.searchParams.set('auth', authCode);

  const fetchUrl = new URL(`/twitch/followage/${encodeURIComponent(channel)}/${encodeURIComponent(viewer)}`, window.location.origin);
  fetchUrl.searchParams.set('format', format === 'json' ? 'json' : 'ymdhis');
  fetchUrl.searchParams.set('ping', 'false');
  fetchUrl.searchParams.set('lang', lang);
  if (authCode) fetchUrl.searchParams.set('auth', authCode);

  return { displayUrl: displayUrl.toString(), genericUrl: genericUrl.toString(), fetchUrl };
}

function buildPublicUrls(viewer, channel, lang, format, moderatorId, channelToken) {
  const displayBase = window.location.origin;
  const displayUrl = new URL(`/twitch/followage/${encodeURIComponent(channel)}/${encodeURIComponent(viewer)}`, displayBase);
  displayUrl.searchParams.set('format', format === 'json' ? 'json' : 'ymdhis');
  displayUrl.searchParams.set('lang', lang);
  if (moderatorId) displayUrl.searchParams.set('moderatorId', moderatorId);
  if (channelToken) displayUrl.searchParams.set('token', channelToken);

  const genericBase = 'https://www.losperris.site';
  const genericUrl = new URL(`/twitch/followage/$(channel)/$(user)`, genericBase);
  genericUrl.searchParams.set('format', format === 'json' ? 'json' : 'ymdhis');
  genericUrl.searchParams.set('ping', 'false');
  genericUrl.searchParams.set('lang', lang);
  if (moderatorId) genericUrl.searchParams.set('moderatorId', moderatorId);
  if (channelToken) genericUrl.searchParams.set('token', channelToken);

  const fetchUrl = new URL(`/twitch/followage/${encodeURIComponent(channel)}/${encodeURIComponent(viewer)}`, window.location.origin);
  fetchUrl.searchParams.set('format', format === 'json' ? 'json' : 'ymdhis');
  fetchUrl.searchParams.set('ping', 'false');
  fetchUrl.searchParams.set('lang', lang);
  if (moderatorId) fetchUrl.searchParams.set('moderatorId', moderatorId);
  if (channelToken) fetchUrl.searchParams.set('token', channelToken);

  return { displayUrl: displayUrl.toString(), genericUrl: genericUrl.toString(), fetchUrl };
}

function buildFollowageUrls(viewer, channel, lang, format, moderatorId, channelToken, authCode, linkType = 'secure') {
  if (linkType === 'secure') {
    return buildSecureUrls(viewer, channel, lang, format, authCode);
  } else {
    return buildPublicUrls(viewer, channel, lang, format, moderatorId, channelToken);
  }
}

function currentLang() {
  return (langEl?.value || 'es');
}

function labelForState(isPassword) {
  const lang = currentLang();
  return isPassword ? (lang === 'en' ? 'Show' : 'Mostrar') : (lang === 'en' ? 'Hide' : 'Ocultar');
}

function updateRevealButtonsLabel() {
  if (toggleModeratorBtn && moderatorIdEl) {
    toggleModeratorBtn.textContent = labelForState(moderatorIdEl.type === 'password');
  }
  if (toggleChannelBtn && channelTokenEl) {
    toggleChannelBtn.textContent = labelForState(channelTokenEl.type === 'password');
  }
  if (toggleAuthBtn && authCodeEl) {
    toggleAuthBtn.textContent = labelForState(authCodeEl.type === 'password');
  }
}

//  valores ocultos
if (moderatorIdEl) moderatorIdEl.type = 'password';
if (channelTokenEl) channelTokenEl.type = 'password';
if (authCodeEl) authCodeEl.type = 'password';
updateRevealButtonsLabel();

// regenerar código seguro
if (regenAuthCodeBtn && authCodeEl) {
  regenAuthCodeBtn.addEventListener('click', async () => {
    const prev = regenAuthCodeBtn.textContent;
    regenAuthCodeBtn.disabled = true;
    try {
      let resp = await fetch('/channel/me');
      if (resp.status === 401) {
        resp = await fetch('/clips/me');
      }
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      const code = data?.auth_code || '';
      if (code) {
        authCodeEl.value = code;
        regenAuthCodeBtn.textContent = (currentLang() === 'en') ? 'Regenerated' : '¡Regenerado!';
        setTimeout(() => { regenAuthCodeBtn.textContent = prev; }, 1500);
        const viewer = (viewerEl?.value || '').toString().trim();
        const channel = (channelEl?.value || '').toString().trim();
        const lang = currentLang();
        const format = (formatEl?.value || 'ymdhis').toString();
        const moderatorId = (moderatorIdEl?.value || '').toString().trim();
        const channelToken = (channelTokenEl?.value || '').toString().trim();

        let linkType = 'secure';
        if (linkTypeRadios) {
          for (const r of linkTypeRadios) {
            if (r.checked) {
              linkType = r.value;
              break;
            }
          }
        }

        const urls = buildFollowageUrls(viewer, channel, lang, format, moderatorId, channelToken, code, linkType);
        if (!channel) {
          if (urlGenericExampleEl) urlGenericExampleEl.textContent = `$(urlfetch ${urls.genericUrl})`;
          if (urlGenericBlockEl) urlGenericBlockEl.style.display = '';
          if (seUrlGenericExampleEl) seUrlGenericExampleEl.textContent = `$(customapi ${urls.genericUrl})`;          if (seUrlGenericBlockEl) seUrlGenericBlockEl.style.display = '';
          if (urlBlockEl) urlBlockEl.style.display = 'none';
          if (seUrlBlockEl) seUrlBlockEl.style.display = 'none';
        } else {
          if (urlExampleEl) urlExampleEl.textContent = `$(urlfetch ${urls.displayUrl})`;
          if (urlGenericExampleEl) urlGenericExampleEl.textContent = `$(urlfetch ${urls.genericUrl})`;
          if (seUrlExampleEl) seUrlExampleEl.textContent = `$(customapi ${urls.displayUrl})`;          if (seUrlBlockEl) seUrlBlockEl.style.display = '';
          if (seUrlGenericExampleEl) seUrlGenericExampleEl.textContent = `$(customapi ${urls.genericUrl})`;          if (seUrlGenericBlockEl) seUrlGenericBlockEl.style.display = '';
        }
      } else {
        throw new Error('no_code');
      }
    } catch (_) {
      regenAuthCodeBtn.textContent = (currentLang() === 'en') ? 'Error' : 'Error';
      setTimeout(() => { regenAuthCodeBtn.textContent = prev; }, 1500);
    } finally {
      regenAuthCodeBtn.disabled = false;
    }
  });
}

// mostrar/ocultar
if (toggleModeratorBtn && moderatorIdEl) {
  toggleModeratorBtn.addEventListener('click', () => {
    moderatorIdEl.type = (moderatorIdEl.type === 'password') ? 'text' : 'password';
    updateRevealButtonsLabel();
  });
}
if (toggleChannelBtn && channelTokenEl) {
  toggleChannelBtn.addEventListener('click', () => {
    channelTokenEl.type = (channelTokenEl.type === 'password') ? 'text' : 'password';
    updateRevealButtonsLabel();
  });
}
if (toggleAuthBtn && authCodeEl) {
  toggleAuthBtn.addEventListener('click', () => {
    authCodeEl.type = (authCodeEl.type === 'password') ? 'text' : 'password';
    updateRevealButtonsLabel();
  });
}

// Selección de idioma
if (langEl) {
  langEl.addEventListener('change', () => {
    updateUrlLabels();
    updateRevealButtonsLabel();
    refreshAuth();
    refreshChannelAuth();
  });
}

if (linkTypeRadios) {
  for (const r of linkTypeRadios) {
    r.addEventListener('change', () => {
      if (form.checkValidity() && channelEl.value) {
        form.dispatchEvent(new Event('submit'));
      }
    });
  }
}

updateUrlLabels();
updateRevealButtonsLabel();