import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { getFollowageText, getFollowageJson } from './twitch.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const jwtSecret = process.env.JWT_SECRET || 'dev_jwt_secret';
const oauthRedirect = process.env.OAUTH_REDIRECT_URI || `http://localhost:${port}/auth/callback`;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '..', 'public');

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

function setAuthCookie(res, payload) {
  const token = jwt.sign(payload, jwtSecret, { expiresIn: '7d' });
  res.cookie('auth', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

function readAuth(req, _res, next) {
  const token = req.cookies?.auth;
  if (token) {
    try {
      req.user = jwt.verify(token, jwtSecret);
    } catch (_) {
      // ignore invalid token
    }
  }
  next();
}

app.use(readAuth);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Static landing page and assets
app.use(express.static(publicDir));
app.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// --- OAuth login with Twitch ---
app.get('/auth/login', (_req, res) => {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const authUrl = new URL('https://id.twitch.tv/oauth2/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', oauthRedirect);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'user:read:email');
  res.redirect(authUrl.toString());
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
    tokenUrl.searchParams.set('redirect_uri', oauthRedirect);
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

    setAuthCookie(res, {
      id: user.id,
      login: user.login,
      display_name: user.display_name
    });
    res.redirect('/');
  } catch (err) {
    res.status(500).send(err?.message || 'Error en callback de OAuth');
  }
});

app.post('/auth/logout', (_req, res) => {
  res.clearCookie('auth');
  res.json({ ok: true });
});

app.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ authenticated: false });
  res.json({ authenticated: true, user: req.user });
});

app.get('/api/followage', async (req, res) => {
  const viewer = (req.query.touser || req.query.user || req.user?.login || '').toString().trim();
  const channel = (req.query.channel || req.query.to || '').toString().trim();
  const format = (req.query.format || 'text').toString().trim();
  const lang = (req.query.lang || 'es').toString().trim();

  if (!viewer || !channel) {
    return res.status(400).json({
      error: 'Parámetros inválidos',
      message: 'Se requieren "touser" (viewer) y "channel" (broadcaster)'
    });
  }

  try {
    if (format === 'json') {
      const data = await getFollowageJson({ viewer, channel });
      return res.json(data);
    } else {
      const text = await getFollowageText({ viewer, channel, lang });
      return res.send(text);
    }
  } catch (err) {
    const status = err?.statusCode || 500;
    return res.status(status).json({ error: 'followage_error', message: err?.message || 'Error inesperado' });
  }
});

app.get('/twitch/followage/:viewer/:channel', async (req, res) => {
  const { viewer, channel } = req.params;
  const lang = (req.query.lang || 'es').toString().trim();
  try {
    const text = await getFollowageText({ viewer, channel, lang });
    return res.send(text);
  } catch (err) {
    const status = err?.statusCode || 500;
    return res.status(status).json({ error: 'followage_error', message: err?.message || 'Error inesperado' });
  }
});

app.listen(port, () => {
  console.log(`Followage API escuchando en http://localhost:${port}`);
});