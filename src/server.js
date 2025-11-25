import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getFollowageText, getFollowageJson, getFollowageTextByPattern, getFollowageJsonByFollowers, createClip, getUserByLogin } from './twitch.js';

dotenv.config();

const app = express();
const channelTokens = new Map();
const port = process.env.PORT || 3000;
const jwtSecret = process.env.JWT_SECRET || 'dev_jwt_secret';
app.set('trust proxy', 1);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '..', 'public');

const TWITCH_AUTH_URL = 'https://id.twitch.tv/oauth2/authorize';
const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const TWITCH_USERS_URL = 'https://api.twitch.tv/helix/users';
const TWITCH_LOGIN_REGEX = /^[A-Za-z0-9_]{1,32}$/;


const ENCRYPTION_KEY = crypto.scryptSync(jwtSecret, 'salt', 32);
const IV_LENGTH = 16;

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-ctr', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-ctr', ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// Helper 
function getTwitchHeaders(token) {
  return {
    'Client-Id': process.env.TWITCH_CLIENT_ID,
    'Authorization': `Bearer ${token}`
  };
}

function extractAuthCredentials(req) {
  const rawAuth = (req.query.auth || req.query.auth_code || req.query.code || '').toString().trim();
  const queryToken = (req.query.token || req.query.mod_token || '').toString().trim();
  const queryId = (req.query.moderatorId || req.query.user_id || '').toString().trim();

  let userId = queryId;
  let token = queryToken;
  let refreshToken = null;

  if (rawAuth) {
    const authCode = decodeURIComponent(rawAuth);
    try {
      const decrypted = JSON.parse(decrypt(authCode));
      if (decrypted.id && decrypted.token) {
        userId = decrypted.id;
        token = decrypted.token;
        refreshToken = decrypted.refresh_token || null;
      }
    } catch (_) { }
  }

  return { userId, token, refreshToken };
}

function resolveChannelToken(req, streamer) {
  const { userId: modId, token: tokenParam, refreshToken: authRefresh } = extractAuthCredentials(req);
  const streamerLower = String(streamer || '').toLowerCase();
  let channelToken = null;
  let sourceRefreshToken = null;
  let usedCookieToken = false;
  if (tokenParam) {
    channelToken = tokenParam;
    sourceRefreshToken = authRefresh || null;
  }
  if (!channelToken && modId && req.channel?.access_token && String(req.channel.channel_id) === modId) {
    channelToken = req.channel.access_token;
    sourceRefreshToken = req.channel.refresh_token || sourceRefreshToken;
    usedCookieToken = true;
  }
  if (!channelToken && modId) {
    for (const item of channelTokens.values()) {
      if (String(item.channel_id) === modId) {
        channelToken = item.access_token;
        break;
      }
    }
  }
  if (!channelToken && req.channel?.access_token) {
    channelToken = req.channel.access_token;
    sourceRefreshToken = req.channel.refresh_token || sourceRefreshToken;
    usedCookieToken = true;
  }
  if (!channelToken && channelTokens.has(streamerLower)) {
    const item = channelTokens.get(streamerLower);
    channelToken = item?.access_token || null;
  }
  if (!channelToken) {
    const any = channelTokens.values().next().value;
    if (any?.access_token) channelToken = any.access_token;
  }
  if (!channelToken && process.env.TWITCH_CHANNEL_TOKEN) {
    channelToken = process.env.TWITCH_CHANNEL_TOKEN;
  }
  const authPresent = !!(req.query.auth || req.query.auth_code || req.query.code);
  return { channelToken, sourceRefreshToken, usedCookieToken, modId, authPresent };
}

async function handleOAuthCallback(req, res, options) {
  const { redirectUri, cookieSetter, redirectPath, extraData = {} } = options;

  try {
    const code = req.query.code?.toString();
    if (!code) return res.status(400).send('Código de autorización faltante');

    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;
    const tokenUrl = new URL(TWITCH_TOKEN_URL);
    tokenUrl.searchParams.set('client_id', clientId);
    tokenUrl.searchParams.set('client_secret', clientSecret);
    tokenUrl.searchParams.set('grant_type', 'authorization_code');
    tokenUrl.searchParams.set('redirect_uri', redirectUri);
    tokenUrl.searchParams.set('code', code);

    const tokenResp = await fetch(tokenUrl, { method: 'POST' });
    if (!tokenResp.ok) {
      const body = await tokenResp.text();
      return res.status(502).send(`Error intercambiando token: ${body}`);
    }
    const tokenJson = await tokenResp.json();
    const accessToken = tokenJson.access_token;

    const userResp = await fetch(TWITCH_USERS_URL, {
      headers: getTwitchHeaders(accessToken)
    });
    if (!userResp.ok) {
      const body = await userResp.text();
      return res.status(502).send(`Error obteniendo usuario: ${body}`);
    }
    const userJson = await userResp.json();
    const user = userJson?.data?.[0];
    if (!user) return res.status(404).send('Usuario no encontrado en Twitch');

    const cookieData = {
      id: user.id,
      login: user.login,
      display_name: user.display_name,
      access_token: accessToken,
      refresh_token: tokenJson.refresh_token,
      token_obtained_at: Date.now(),
      token_expires_in: tokenJson.expires_in,
      ...extraData
    };

    cookieSetter(req, res, cookieData);
    res.redirect(redirectPath);
  } catch (err) {
    res.status(500).send(err?.message || 'Error en callback de OAuth');
  }
}

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

function setCookie(req, res, cookieName, payload) {
  const token = jwt.sign(payload, jwtSecret, { expiresIn: '7d' });
  const forwardedProto = (req.headers['x-forwarded-proto'] || '').toString();
  const proto = forwardedProto || req.protocol || 'http';
  res.cookie(cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: proto === 'https',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

const setAuthCookie = (req, res, payload) => setCookie(req, res, 'auth', payload);
const setChannelCookie = (req, res, payload) => setCookie(req, res, 'channel_auth', payload);
const setClipsCookie = (req, res, payload) => setCookie(req, res, 'clips_auth', payload);

function getRedirectUri(req) {
  const envRedirect = process.env.OAUTH_REDIRECT_URI;
  if (envRedirect && envRedirect.trim()) return envRedirect.trim();

  const forwardedProto = (req.headers['x-forwarded-proto'] || '').toString();
  const forwardedHost = (req.headers['x-forwarded-host'] || '').toString();
  const host = forwardedHost || req.headers['host'];
  const proto = forwardedProto || req.protocol || 'http';
  if (host) return `${proto}://${host}/auth/callback`;
  return `http://localhost:${port}/auth/callback`;
}

async function refreshAccessToken(refreshToken) {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  const url = new URL(TWITCH_TOKEN_URL);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('client_secret', clientSecret);
  url.searchParams.set('grant_type', 'refresh_token');
  url.searchParams.set('refresh_token', refreshToken);

  const resp = await fetch(url, { method: 'POST' });
  if (!resp.ok) {
    const body = await resp.text();
    const err = new Error(`Error refrescando token: ${resp.status} ${body}`);
    err.statusCode = resp.status;
    throw err;
  }
  const json = await resp.json();
  return { access_token: json.access_token, expires_in: json.expires_in, refresh_token: json.refresh_token || refreshToken };
}

function readAuth(req, _res, next) {
  const cookies = [
    { name: 'auth', key: 'user' },
    { name: 'channel_auth', key: 'channel' },
    { name: 'clips_auth', key: 'clips' }
  ];

  for (const { name, key } of cookies) {
    const token = req.cookies?.[name];
    if (token) {
      try {
        req[key] = jwt.verify(token, jwtSecret);
      } catch (_) { }
    }
  }
  next();
}

app.use(readAuth);

async function autoRefreshTokens(req, res, next) {
  try {
    const ch = req.channel;
    if (ch?.refresh_token) {
      const expAt = (ch.token_obtained_at || 0) + (ch.token_expires_in || 0) * 1000;
      if (!expAt || Date.now() >= expAt - 60000) {
        const r = await refreshAccessToken(ch.refresh_token);
        const merged = { ...ch, access_token: r.access_token, token_obtained_at: Date.now(), token_expires_in: r.expires_in, refresh_token: r.refresh_token };
        req.channel = merged;
        setChannelCookie(req, res, merged);
        channelTokens.set(String(merged.channel_login || merged.login || '').toLowerCase(), {
          access_token: merged.access_token,
          channel_login: merged.channel_login || merged.login,
          display_name: merged.display_name,
          channel_id: merged.channel_id || merged.id,
          token_obtained_at: merged.token_obtained_at,
          token_expires_in: merged.token_expires_in
        });
      }
    }
  } catch (_) { }
  next();
}

app.use(autoRefreshTokens);

function respondError(req, res, opts) {
  const ui = ((req.query.ui || '').toString().trim().toLowerCase() === 'true');
  const format = (opts?.format || 'text');
  const lang = (opts?.lang || 'es');
  const status = opts?.status ?? 500;
  const code = (opts?.code || 'error');
  const message = (opts?.message || 'error');
  if (ui) {
    const p = new URLSearchParams();
    p.set('status', String(status));
    p.set('endpoint', req.originalUrl);
    p.set('message', message);
    return res.redirect(`/error?${p.toString()}`);
  }
  if (format !== 'json') {
    return res.type('text/plain').status(200).send(message);
  }
  return res.status(status).json({ error: code, message });
}

app.get('/health', (_req, res) => {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    config: {
      hasClientId: !!process.env.TWITCH_CLIENT_ID,
      hasClientSecret: !!process.env.TWITCH_CLIENT_SECRET,
      hasJwtSecret: !!process.env.JWT_SECRET,
      port: port,
      nodeVersion: process.version
    }
  };

  const allConfigured = checks.config.hasClientId &&
    checks.config.hasClientSecret &&
    checks.config.hasJwtSecret;

  res.status(allConfigured ? 200 : 503).json(checks);
});

app.use(express.static(publicDir));
app.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});
app.get('/error', (_req, res) => {
  res.sendFile(path.join(publicDir, 'error.html'));
});

// --- OAuth ---
app.get('/auth/login', (req, res) => {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const authUrl = new URL(TWITCH_AUTH_URL);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', getRedirectUri(req));
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'user:read:email user:read:follows offline_access');
  res.set('Cache-Control', 'no-store');
  res.status(302).set('Location', authUrl.toString()).send('Redirecting to Twitch...');
});

app.get('/auth/channel/login', (req, res) => {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const authUrl = new URL(TWITCH_AUTH_URL);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', getRedirectUri(req).replace('/auth/callback', '/auth/channel/callback'));
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'moderator:read:followers offline_access');
  res.set('Cache-Control', 'no-store');
  res.status(302).set('Location', authUrl.toString()).send('Redirecting to Twitch...');
});

app.get('/auth/clips/login', (req, res) => {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const authUrl = new URL(TWITCH_AUTH_URL);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', getRedirectUri(req).replace('/auth/callback', '/auth/clips/callback'));
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'clips:edit offline_access');
  res.set('Cache-Control', 'no-store');
  res.status(302).set('Location', authUrl.toString()).send('Redirecting to Twitch...');
});

app.get('/auth/callback', async (req, res) => {
  await handleOAuthCallback(req, res, {
    redirectUri: getRedirectUri(req),
    cookieSetter: setAuthCookie,
    redirectPath: '/'
  });
});

app.get('/auth/channel/callback', async (req, res) => {
  const user = await new Promise((resolve, reject) => {
    const originalSetter = setChannelCookie;
    const customSetter = (req, res, payload) => {
      originalSetter(req, res, payload);
      resolve(payload);
    };

    handleOAuthCallback(req, res, {
      redirectUri: getRedirectUri(req).replace('/auth/callback', '/auth/channel/callback'),
      cookieSetter: customSetter,
      redirectPath: '/',
      extraData: { scope: 'moderator:read:followers' }
    }).catch(reject);
  }).catch(() => null);

  if (user) {
    channelTokens.set(user.login.toLowerCase(), {
      access_token: user.access_token,
      channel_login: user.login,
      display_name: user.display_name,
      channel_id: user.id,
      token_obtained_at: user.token_obtained_at,
      token_expires_in: user.token_expires_in
    });
  }
});

app.get('/auth/clips/callback', async (req, res) => {
  await handleOAuthCallback(req, res, {
    redirectUri: getRedirectUri(req).replace('/auth/callback', '/auth/clips/callback'),
    cookieSetter: setClipsCookie,
    redirectPath: '/twitch/clips/',
    extraData: { scope: 'clips:edit' }
  });
});

app.post('/auth/logout', (_req, res) => {
  res.clearCookie('auth');
  res.json({ ok: true });
});

app.post('/auth/channel/logout', (req, res) => {
  try {
    const login = req.channel?.channel_login;
    if (login) {
      channelTokens.delete(String(login).toLowerCase());
    }
  } catch (_) { }
  res.clearCookie('channel_auth');
  res.json({ ok: true });
});

app.post('/auth/clips/logout', (_req, res) => {
  res.clearCookie('clips_auth');
  res.json({ ok: true });
});

app.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ authenticated: false });
  res.json({ authenticated: true, user: req.user });
});

app.get('/channel/me', (req, res) => {
  if (!req.channel) return res.status(401).json({ authenticated: false });

  const channelId = (req.channel.channel_id != null)
    ? req.channel.channel_id
    : (req.channel.id != null ? req.channel.id : null);

  let authCode = null;
  try {
    const payload = JSON.stringify({
      id: channelId,
      token: req.channel.access_token,
      refresh_token: req.channel.refresh_token || null
    });
    authCode = encrypt(payload);
  } catch (err) {
    console.error('Error generating auth code:', err);
  }

  const channelPayload = { ...req.channel };
  if (channelPayload.channel_id == null && channelId != null) channelPayload.channel_id = channelId;

  res.json({
    authenticated: true,
    channel: channelPayload,
    auth_code: authCode
  });
});

app.get('/clips/me', (req, res) => {
  if (!req.clips) return res.status(401).json({ authenticated: false });

  let authCode = null;
  try {
    const payload = JSON.stringify({
      id: req.clips.id,
      token: req.clips.access_token
    });
    authCode = encrypt(payload);
  } catch (err) {
    console.error('Error generating clips auth code:', err);
  }

  res.json({
    authenticated: true,
    clips: req.clips,
    auth_code: authCode
  });
});

app.get('/api/followage', async (req, res) => {
  const viewer = (req.query.touser || req.query.user || req.user?.login || '').toString().trim();
  const defaultChannel = (process.env.TWITCH_CHANNEL_LOGIN || '').toString().trim();
  const channel = (req.query.channel || req.query.to || defaultChannel).toString().trim();
  const format = (req.query.format || 'text').toString().trim();
  const lang = (req.query.lang || 'es').toString().trim();
  const userToken = req.user?.access_token || null;

  if (!viewer || !channel) {
    return res.status(400).json({
      error: 'Parámetros inválidos',
      message: 'Se requieren "touser" (viewer) y "channel" (broadcaster)'
    });
  }
  if (!TWITCH_LOGIN_REGEX.test(viewer)) {
    return res.status(400).json({ error: 'invalid_user', message: "'user' inválido. Usa A–Z, 0–9 y _." });
  }
  if (!TWITCH_LOGIN_REGEX.test(channel)) {
    return res.status(400).json({ error: 'invalid_channel', message: "'channel' inválido. Usa A–Z, 0–9 y _." });
  }

  if (!userToken) {
    return res.status(401).json({ error: 'auth_required', message: 'Inicia sesión para consultar followage' });
  }

  try {
    if (format === 'json') {
      const data = await getFollowageJson({ viewer, channel, userToken });
      return res.json(data);
    } else {
      const text = await getFollowageText({ viewer, channel, lang, userToken });
      return res.send(text);
    }
  } catch (err) {
    const status = err?.statusCode || 500;
    return respondError(req, res, { format, lang, status, code: 'followage_error', message: err?.message || 'Error inesperado' });
  }
});

app.get('/twitch/followage/:streamer/:viewer', async (req, res) => {
  const streamer = req.params.streamer?.toString().trim();
  const viewer = req.params.viewer?.toString().trim();
  const format = (req.query.format || 'ymdhis').toString().trim();
  const ping = ((req.query.ping || 'false').toString().trim().toLowerCase() === 'true');
  const lang = (req.query.lang || 'en').toString().trim();


  if (!TWITCH_LOGIN_REGEX.test(streamer) || !TWITCH_LOGIN_REGEX.test(viewer)) {
    const msg = lang === 'es' ? 'Parámetros inválidos: usa A–Z, 0–9 y _ en canal y usuario' : 'Invalid parameters: use A–Z, 0–9 and _ for channel and user';
    return format === 'json'
      ? res.status(400).json({ error: 'invalid_parameters', message: msg })
      : res.type('text/plain').status(200).send(msg);
  }

  const { channelToken: channelToken0, sourceRefreshToken, usedCookieToken, modId, authPresent } = resolveChannelToken(req, streamer);
  let channelToken = channelToken0;

  if (!channelToken) {
    const msg = authPresent
      ? (lang === 'es' ? 'Código de autenticación inválido o expirado' : 'Invalid or expired auth code')
      : (lang === 'es' ? 'Error: token del canal/mod no configurado. Inicia sesión canal/mod o usa ?auth=' : 'Error: channel/mod token not configured. Login channel/mod or use ?auth=');
    return format === 'json'
      ? res.status(401).json({ error: authPresent ? 'invalid_auth_code' : 'channel_token_missing', message: msg })
      : res.type('text/plain').status(200).send(msg);
  }

  try {
    if (format === 'json') {
      const json = await getFollowageJsonByFollowers({ viewer, channel: streamer, channelToken });
      res.type('application/json');
      return res.json(json);
    } else {
      const text = await getFollowageTextByPattern({ viewer, channel: streamer, pattern: format, ping, channelToken, lang });
      res.type('text/plain');
      return res.send(text);
    }
  } catch (err) {
    const status = err?.statusCode || 500;
    const ui = ((req.query.ui || '').toString().trim().toLowerCase() === 'true');
    if (status === 401 && sourceRefreshToken) {
      try {
        const r = await refreshAccessToken(sourceRefreshToken);
        channelToken = r.access_token;
        if (usedCookieToken && req.channel) {
          const merged = {
            ...req.channel,
            access_token: r.access_token,
            token_obtained_at: Date.now(),
            token_expires_in: r.expires_in,
            refresh_token: r.refresh_token || req.channel.refresh_token
          };
          req.channel = merged;
          setChannelCookie(req, res, merged);
          channelTokens.set(String(merged.channel_login || merged.login || '').toLowerCase(), {
            access_token: merged.access_token,
            channel_login: merged.channel_login || merged.login,
            display_name: merged.display_name,
            channel_id: merged.channel_id || merged.id,
            token_obtained_at: merged.token_obtained_at,
            token_expires_in: merged.token_expires_in
          });
        }
        if (format === 'json') {
          const json = await getFollowageJsonByFollowers({ viewer, channel: streamer, channelToken });
          res.type('application/json');
          return res.json(json);
        } else {
          const text = await getFollowageTextByPattern({ viewer, channel: streamer, pattern: format, ping, channelToken, lang });
          res.type('text/plain');
          return res.send(text);
        }
      } catch (e2) {
        const st = e2?.statusCode || 500;
        return respondError(req, res, { format, lang, status: st, code: 'followage_error', message: e2?.message || 'error' });
      }
    }
    return respondError(req, res, { format, lang, status, code: 'followage_error', message: err?.message || 'error' });
  }
});

app.post('/api/clips/create', async (req, res) => {
  try {
    const creator = (req.query.creator || '').toString().trim();
    const { userId: extractedId, token: extractedToken } = extractAuthCredentials(req);

    let userToken = extractedToken || req.clips?.access_token;
    let userId = extractedId || req.clips?.id;

    if (!userToken) {
      return res.status(401).json({ error: 'auth_required', message: 'Inicia sesión para crear clips' });
    }

    const channelParam = (req.query.channel || req.body?.channel || '').toString().trim();
    let broadcasterId;

    if (channelParam) {
      if (!TWITCH_LOGIN_REGEX.test(channelParam)) {
        return res.status(400).json({ error: 'invalid_channel', message: 'Canal inválido' });
      }
      const channelUser = await getUserByLogin(channelParam);
      if (!channelUser) {
        return res.status(404).json({ error: 'channel_not_found', message: `Canal "${channelParam}" no encontrado` });
      }
      broadcasterId = channelUser.id;
    } else {
      broadcasterId = userId;
    }

    const clipData = await createClip({ broadcasterId, userToken });

    if (creator) {
      const clipUrl = clipData.url || '';
      return res.send(`✅ Clip creado por ${creator}: ${clipUrl}`);
    }

    res.json(clipData);
  } catch (err) {
    const status = err?.statusCode || 500;
    const lang = (req.query.lang || 'es').toString().trim();
    const wantText = ((req.query.format || '').toString().trim() === 'text');
    let msg;
    if (status === 401) {
      msg = lang === 'es' ? 'Debes iniciar sesión para crear clips' : 'Authentication required to create clips';
    } else if (status === 404) {
      const chParam = (req.query.channel || '').toString().trim();
      msg = lang === 'es' ? `Canal "${chParam}" no encontrado` : `Channel "${chParam}" not found`;
    } else if (status === 400 || /offline|not.*live|is not live/i.test(err?.message || '')) {
      msg = lang === 'es' ? 'No se puede en canales off' : 'Cannot create clip when channel is offline';
    } else {
      msg = lang === 'es' ? `Error creando clip: ${err?.message || 'error'}` : `Error creating clip: ${err?.message || 'error'}`;
    }
    if (wantText) {
      return res.type('text/plain').status(200).send(msg);
    }
    return res.status(status).json({ error: 'clip_error', message: msg });
  }
});

app.get('/api/clips/create', async (req, res) => {
  try {
    const creator = (req.query.creator || '').toString().trim();
    const { userId: extractedId, token: extractedToken } = extractAuthCredentials(req);

    let userToken = extractedToken || req.clips?.access_token;
    let userId = extractedId || req.clips?.id;

    const lang = (req.query.lang || 'es').toString().trim();

    if (!userToken) {
      const msg = lang === 'es' ? 'Debes iniciar sesión para crear clips' : 'Authentication required to create clips';
      return res.type('text/plain').status(200).send(msg);
    }

    const channelParam = (req.query.channel || '').toString().trim();
    let broadcasterId;

    if (channelParam) {
      if (!TWITCH_LOGIN_REGEX.test(channelParam)) {
        const msg = lang === 'es' ? 'Canal inválido' : 'Invalid channel';
        return res.type('text/plain').status(200).send(msg);
      }
      const channelUser = await getUserByLogin(channelParam);
      if (!channelUser) {
        const msg = lang === 'es' ? `Canal "${channelParam}" no encontrado` : `Channel "${channelParam}" not found`;
        return res.type('text/plain').status(200).send(msg);
      }
      broadcasterId = channelUser.id;
    } else {
      broadcasterId = userId;
    }

    const clipData = await createClip({ broadcasterId, userToken });
    const clipUrl = clipData.url || '';
    const msgOk = creator
      ? (lang === 'es' ? `✅ Clip creado por ${creator}: ${clipUrl}` : `✅ Clip created by ${creator}: ${clipUrl}`)
      : (lang === 'es' ? `✅ Clip creado: ${clipUrl}` : `✅ Clip created: ${clipUrl}`);
    return res.type('text/plain').status(200).send(msgOk);
  } catch (err) {
    const status = err?.statusCode || 500;
    const lang = (req.query.lang || 'es').toString().trim();
    const channelParam = (req.query.channel || '').toString().trim();
    let msg;
    if (status === 401) msg = lang === 'es' ? 'Debes iniciar sesión para crear clips' : 'Authentication required';
    else if (status === 404) msg = lang === 'es' ? `Canal "${channelParam}" no encontrado` : `Channel "${channelParam}" not found`;
    else if (status === 400 || /offline|not.*live|is not live/i.test(err?.message || '')) msg = lang === 'es' ? 'No se puede en canales off' : 'Cannot create clip when channel is offline';
    else msg = lang === 'es' ? `Error creando clip: ${err?.message || 'error'}` : `Error creating clip: ${err?.message || 'error'}`;
    return res.type('text/plain').status(200).send(msg);
  }
});

app.get('/twitch/chatter/:streamer', async (req, res) => {
  const streamer = req.params.streamer?.toString().trim();
  const bots = ((req.query.bots || 'false').toString().trim().toLowerCase() === 'true');
  const count = Math.max(1, Math.min(10, parseInt(req.query.count || '1', 10) || 1));

  if (!TWITCH_LOGIN_REGEX.test(streamer)) {
    return res.status(400).send('invalid parameters');
  }
  try {
    const url = new URL(`https://tmi.twitch.tv/group/user/${encodeURIComponent(streamer)}/chatters`);
    const resp = await fetch(url);
    if (!resp.ok) {
      return res.status(502).send('error fetching chatters');
    }
    const data = await resp.json();
    const cats = data?.chatters || {};
    let arr = [];
    for (const key of Object.keys(cats)) {
      const list = Array.isArray(cats[key]) ? cats[key] : [];
      arr = arr.concat(list);
    }
    const knownBots = new Set(['nightbot', 'streamelements', 'moobot', 'wizebot', 'fossabot', 'coebot', 'streamlabs', 'deepbot', 'anotherttvviewer', 'supibot']);
    if (!bots) {
      arr = arr.filter((u) => !knownBots.has(String(u).toLowerCase()));
    }
    if (arr.length === 0) {
      return res.type('text/plain').send('no chatters');
    }
    const picks = [];
    for (let i = 0; i < count && arr.length > 0; i++) {
      const idx = Math.floor(Math.random() * arr.length);
      picks.push(arr[idx]);
      arr.splice(idx, 1);
    }
    res.type('text/plain').send(picks.join('\n'));
  } catch (err) {
    res.status(500).send('error');
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ error: true, message });
});

export default app;

const isServerless =
  process.env.NETLIFY === 'true' ||
  process.env.LAMBDA_TASK_ROOT != null ||
  process.env.VERCEL === '1';

if (!isServerless) {
  app.listen(port, () => {
    console.log(`Followage API escuchando en http://localhost:${port}`);
  });
}