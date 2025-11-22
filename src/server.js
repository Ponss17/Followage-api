import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { getFollowageText, getFollowageJson, getFollowageTextByPattern } from './twitch.js';
import serverlessHttp from 'serverless-http';

dotenv.config();

const app = express();
const channelTokens = new Map();
const port = process.env.PORT || 3000;
const jwtSecret = process.env.JWT_SECRET || 'dev_jwt_secret';
app.set('trust proxy', 1);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '..', 'public');

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

function setAuthCookie(req, res, payload) {
  const token = jwt.sign(payload, jwtSecret, { expiresIn: '7d' });
  const forwardedProto = (req.headers['x-forwarded-proto'] || '').toString();
  const proto = forwardedProto || req.protocol || 'http';
  res.cookie('auth', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: proto === 'https',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

function setChannelCookie(req, res, payload) {
  const token = jwt.sign(payload, jwtSecret, { expiresIn: '7d' });
  const forwardedProto = (req.headers['x-forwarded-proto'] || '').toString();
  const proto = forwardedProto || req.protocol || 'http';
  res.cookie('channel_auth', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: proto === 'https',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

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

function readAuth(req, _res, next) {
  const token = req.cookies?.auth;
  if (token) {
    try {
      req.user = jwt.verify(token, jwtSecret);
    } catch (_) {
    }
  }
  const channelToken = req.cookies?.channel_auth;
  if (channelToken) {
    try {
      req.channel = jwt.verify(channelToken, jwtSecret);
    } catch (_) {
    }
  }
  next();
}

app.use(readAuth);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(express.static(publicDir));
app.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// --- OAuth ---
app.get('/auth/login', (req, res) => {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const authUrl = new URL('https://id.twitch.tv/oauth2/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', getRedirectUri(req));
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'user:read:email user:read:follows');
  res.set('Cache-Control', 'no-store');
  res.status(302).set('Location', authUrl.toString()).send('Redirecting to Twitch...');
});

// Login canal/moderador para followers
app.get('/auth/channel/login', (req, res) => {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const authUrl = new URL('https://id.twitch.tv/oauth2/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', getRedirectUri(req).replace('/auth/callback', '/auth/channel/callback'));
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'moderator:read:followers');
  res.set('Cache-Control', 'no-store');
  res.status(302).set('Location', authUrl.toString()).send('Redirecting to Twitch...');
});

app.get('/auth/callback', async (req, res) => {
  try {
    const code = req.query.code?.toString();
    if (!code) return res.status(400).send('Código de autorización faltante');

    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;
    const tokenUrl = new URL('https://id.twitch.tv/oauth2/token');
    tokenUrl.searchParams.set('client_id', clientId);
    tokenUrl.searchParams.set('client_secret', clientSecret);
    tokenUrl.searchParams.set('grant_type', 'authorization_code');
    tokenUrl.searchParams.set('redirect_uri', getRedirectUri(req));
    tokenUrl.searchParams.set('code', code);

    const tokenResp = await fetch(tokenUrl, { method: 'POST' });
    if (!tokenResp.ok) {
      const body = await tokenResp.text();
      return res.status(502).send(`Error intercambiando token: ${body}`);
    }
    const tokenJson = await tokenResp.json();
    const accessToken = tokenJson.access_token;

    const userResp = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-Id': clientId,
        'Authorization': `Bearer ${accessToken}`
      }
    });
    if (!userResp.ok) {
      const body = await userResp.text();
      return res.status(502).send(`Error obteniendo usuario: ${body}`);
    }
    const userJson = await userResp.json();
    const user = userJson?.data?.[0];
    if (!user) return res.status(404).send('Usuario no encontrado en Twitch');

    setAuthCookie(req, res, {
      id: user.id,
      login: user.login,
      display_name: user.display_name,
      access_token: accessToken,
      token_obtained_at: Date.now(),
      token_expires_in: tokenJson.expires_in
    });
    res.redirect('/');
  } catch (err) {
    res.status(500).send(err?.message || 'Error en callback de OAuth');
  }
});

app.get('/auth/channel/callback', async (req, res) => {
  try {
    const code = req.query.code?.toString();
    if (!code) return res.status(400).send('Código de autorización faltante');

    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;
    const tokenUrl = new URL('https://id.twitch.tv/oauth2/token');
    tokenUrl.searchParams.set('client_id', clientId);
    tokenUrl.searchParams.set('client_secret', clientSecret);
    tokenUrl.searchParams.set('grant_type', 'authorization_code');
    tokenUrl.searchParams.set('redirect_uri', getRedirectUri(req).replace('/auth/callback', '/auth/channel/callback'));
    tokenUrl.searchParams.set('code', code);

    const tokenResp = await fetch(tokenUrl, { method: 'POST' });
    if (!tokenResp.ok) {
      const body = await tokenResp.text();
      return res.status(502).send(`Error intercambiando token (channel): ${body}`);
    }
    const tokenJson = await tokenResp.json();
    const accessToken = tokenJson.access_token;

    const userResp = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-Id': clientId,
        'Authorization': `Bearer ${accessToken}`
      }
    });
    if (!userResp.ok) {
      const body = await userResp.text();
      return res.status(502).send(`Error obteniendo canal/mod: ${body}`);
    }
    const userJson = await userResp.json();
    const user = userJson?.data?.[0];
    if (!user) return res.status(404).send('Usuario no encontrado en Twitch');

    setChannelCookie(req, res, {
      channel_id: user.id,
      channel_login: user.login,
      display_name: user.display_name,
      access_token: accessToken,
      token_obtained_at: Date.now(),
      token_expires_in: tokenJson.expires_in,
      scope: 'moderator:read:followers'
    });
    channelTokens.set(user.login.toLowerCase(), {
      access_token: accessToken,
      channel_login: user.login,
      display_name: user.display_name,
      channel_id: user.id,
      token_obtained_at: Date.now(),
      token_expires_in: tokenJson.expires_in
    });
    res.redirect('/');
  } catch (err) {
    res.status(500).send(err?.message || 'Error en callback de OAuth (channel)');
  }
});

app.post('/auth/logout', (_req, res) => {
  res.clearCookie('auth');
  res.json({ ok: true });
});

app.post('/auth/channel/logout', (_req, res) => {
  try {
    const cookie = _req.cookies?.channel_auth;
    if (cookie) {
      const data = JSON.parse(cookie);
      if (data?.channel_login) {
        channelTokens.delete(String(data.channel_login).toLowerCase());
      }
    }
  } catch (_) {}
  res.clearCookie('channel_auth');
  res.json({ ok: true });
});

app.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ authenticated: false });
  res.json({ authenticated: true, user: req.user });
});

app.get('/channel/me', (req, res) => {
  if (!req.channel) return res.status(401).json({ authenticated: false });
  res.json({ authenticated: true, channel: req.channel });
});

app.get('/api/followage', async (req, res) => {
  const viewer = (req.query.touser || req.query.user || req.user?.login || '').toString().trim();
  const defaultChannel = (process.env.TWITCH_CHANNEL_LOGIN || '').toString().trim();
  const channel = (req.query.channel || req.query.to || defaultChannel).toString().trim();
  const format = (req.query.format || 'text').toString().trim();
  const lang = (req.query.lang || 'es').toString().trim();
  const userToken = req.user?.access_token || null;

  const loginRe = /^[A-Za-z0-9_]{1,32}$/;
  if (!viewer || !channel) {
    return res.status(400).json({
      error: 'Parámetros inválidos',
      message: 'Se requieren "touser" (viewer) y "channel" (broadcaster)'
    });
  }
  if (!loginRe.test(viewer)) {
    return res.status(400).json({ error: 'invalid_user', message: "'user' inválido. Usa A–Z, 0–9 y _." });
  }
  if (!loginRe.test(channel)) {
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
    return res.status(status).json({ error: 'followage_error', message: err?.message || 'Error inesperado' });
  }
});

app.get('/twitch/followage/:streamer/:viewer', async (req, res) => {
  const streamer = req.params.streamer?.toString().trim();
  const viewer = req.params.viewer?.toString().trim();
  const format = (req.query.format || 'ymdhis').toString().trim();
  const ping = ((req.query.ping || 'false').toString().trim().toLowerCase() === 'true');
  const moderatorId = (req.query.moderatorId || '').toString().trim();
  const lang = (req.query.lang || 'en').toString().trim();
  const tokenParam = (req.query.token || req.query.mod_token || '').toString().trim();

  const loginRe = /^[A-Za-z0-9_]{1,32}$/;
  if (!loginRe.test(streamer) || !loginRe.test(viewer)) {
    return res.status(400).send('invalid parameters');
  }

  let channelToken = null;
  const streamerLower = streamer.toLowerCase();
  const modId = (req.query.moderatorId || '').toString().trim();

  if (tokenParam) {
    channelToken = tokenParam;
  }

  if (modId && req.channel?.access_token && String(req.channel.channel_id) === modId) {
    channelToken = channelToken || req.channel.access_token;
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
  if (!channelToken) {
    return res.status(401).send('channel token not configured');
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
    return res.status(status).send('error');
  }
});

app.get('/twitch/chatter/:streamer', async (req, res) => {
  const streamer = req.params.streamer?.toString().trim();
  const bots = ((req.query.bots || 'false').toString().trim().toLowerCase() === 'true');
  const count = Math.max(1, Math.min(10, parseInt(req.query.count || '1', 10) || 1));
  const loginRe = /^[A-Za-z0-9_]{1,32}$/;
  if (!loginRe.test(streamer)) {
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
    const knownBots = new Set(['nightbot','streamelements','moobot','wizebot','fossabot','coebot','streamlabs','deepbot','anotherttvviewer','supibot']);
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

// Exportar la app para serverless (Vercel)
export default app;

// Solo escuchar en local (no en Vercel)
const isServerless =
  process.env.NETLIFY === 'true' ||
  process.env.LAMBDA_TASK_ROOT != null ||
  process.env.VERCEL === '1';

if (!isServerless) {
  app.listen(port, () => {
    console.log(`Followage API escuchando en http://localhost:${port}`);
  });
}