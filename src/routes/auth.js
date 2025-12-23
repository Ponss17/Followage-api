import express from 'express';
import { getTwitchHeaders, setAuthCookie, setChannelCookie, setClipsCookie, upsertTokenRecord } from '../utils/auth.js';

const router = express.Router();

const TWITCH_AUTH_URL = 'https://id.twitch.tv/oauth2/authorize';
const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const TWITCH_USERS_URL = 'https://api.twitch.tv/helix/users';
const port = process.env.PORT || 3000;

function getRedirectUri(req) {
    const envRedirect = process.env.OAUTH_REDIRECT_URI;
    if (envRedirect && envRedirect.trim()) return envRedirect.trim();

    const forwardedProto = (req.headers['x-forwarded-proto'] || '').toString().split(',')[0];
    const forwardedHost = (req.headers['x-forwarded-host'] || '').toString().split(',')[0];
    const host = forwardedHost || req.headers['host'];
    const proto = forwardedProto || req.protocol || 'http';
    if (host) return `${proto}://${host}/auth/callback`;
    return `http://localhost:${port}/auth/callback`;
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

        try {
            let type = 'user';
            if (extraData.scope === 'clips:edit') type = 'clips';
            else if (extraData.scope === 'moderator:read:followers') type = 'channel';

            await upsertTokenRecord({
                user_id: user.id,
                login: user.login,
                type: type,
                access_token: accessToken,
                refresh_token: tokenJson.refresh_token,
                scope: extraData.scope || '',
                token_obtained_at: Date.now(),
                token_expires_in: tokenJson.expires_in
            });
        } catch (dbErr) {
            console.error('Error saving token to DB:', dbErr);
        }

        cookieSetter(req, res, cookieData);
        res.redirect(redirectPath);
    } catch (err) {
        res.status(500).send(err?.message || 'Error en callback de OAuth');
    }
}

router.get('/login', (req, res) => {
    const clientId = process.env.TWITCH_CLIENT_ID;
    const authUrl = new URL(TWITCH_AUTH_URL);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', getRedirectUri(req));
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'user:read:email user:read:follows');
    res.set('Cache-Control', 'no-store');
    res.status(302).set('Location', authUrl.toString()).send('Redirecting to Twitch...');
});

router.get('/channel/login', (req, res) => {
    const clientId = process.env.TWITCH_CLIENT_ID;
    const authUrl = new URL(TWITCH_AUTH_URL);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', getRedirectUri(req).replace('/auth/callback', '/auth/channel/callback'));
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'moderator:read:followers');
    res.set('Cache-Control', 'no-store');
    res.status(302).set('Location', authUrl.toString()).send('Redirecting to Twitch...');
});

router.get('/clips/login', (req, res) => {
    const clientId = process.env.TWITCH_CLIENT_ID;
    const authUrl = new URL(TWITCH_AUTH_URL);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', getRedirectUri(req).replace('/auth/callback', '/auth/clips/callback'));
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'clips:edit');
    res.set('Cache-Control', 'no-store');
    res.status(302).set('Location', authUrl.toString()).send('Redirecting to Twitch...');
});

router.get('/callback', async (req, res) => {
    await handleOAuthCallback(req, res, {
        redirectUri: getRedirectUri(req),
        cookieSetter: setAuthCookie,
        redirectPath: 'https://www.losperris.site/twitch/followage/'
    });
});

router.get('/channel/callback', async (req, res) => {
    const user = await new Promise((resolve, reject) => {
        const originalSetter = setChannelCookie;
        const customSetter = (req, res, payload) => {
            originalSetter(req, res, payload);
            resolve(payload);
        };

        handleOAuthCallback(req, res, {
            redirectUri: getRedirectUri(req).replace('/auth/callback', '/auth/channel/callback'),
            cookieSetter: customSetter,
            redirectPath: 'https://www.losperris.site/twitch/followage/',
            extraData: { scope: 'moderator:read:followers' }
        }).catch(reject);
    }).catch(() => null);

    if (user) {
    }
});

router.get('/clips/callback', async (req, res) => {
    await handleOAuthCallback(req, res, {
        redirectUri: getRedirectUri(req).replace('/auth/callback', '/auth/clips/callback'),
        cookieSetter: setClipsCookie,
        redirectPath: '/twitch/clips/',
        extraData: { scope: 'clips:edit' }
    });
});

router.post('/logout', (_req, res) => {
    res.clearCookie('auth');
    res.json({ ok: true });
});

router.post('/channel/logout', (req, res) => {
    try {
    } catch (_) { }
    res.clearCookie('channel_auth');
    res.json({ ok: true });
});

router.post('/clips/logout', (_req, res) => {
    res.clearCookie('clips_auth');
    res.json({ ok: true });
});

export default router;
