import express from 'express';
import { getFollowageJson, getFollowageText, getFollowageJsonByFollowers, getFollowageTextByPattern } from '../twitch.js';
import { extractAuthCredentials, findTokenByLoginType, upsertTokenRecord, refreshAccessToken } from '../utils/auth.js';

const router = express.Router();
const TWITCH_LOGIN_REGEX = /^[A-Za-z0-9_]{1,32}$/;

function respondError(req, res, opts) {
    const ui = ((req.query.ui || '').toString().trim().toLowerCase() === 'true');
    const format = (opts?.format || 'text');
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

router.get('/api/followage', async (req, res) => {
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

router.get('/twitch/followage/:streamer/:viewer', async (req, res) => {
    const streamer = req.params.streamer?.toString().trim();
    const viewer = req.params.viewer?.toString().trim();
    const format = (req.query.format || 'ymdhis').toString().trim();
    const ping = ((req.query.ping || 'false').toString().trim().toLowerCase() === 'true');
    const lang = (req.query.lang || 'en').toString().trim();

    const { userId: modId, token: tokenParam, refreshToken: authRefresh } = await extractAuthCredentials(req);

    if (!TWITCH_LOGIN_REGEX.test(streamer) || !TWITCH_LOGIN_REGEX.test(viewer)) {
        return res.status(400).send('invalid parameters');
    }

    let channelToken = null;
    let dbRec = null;
    let refreshToken = authRefresh || null;

    if (tokenParam) {
        channelToken = tokenParam;
    }

    if (!channelToken) {
        dbRec = await findTokenByLoginType(streamer.toLowerCase(), 'channel');
        if (dbRec?.access_token) {
            channelToken = dbRec.access_token;
            refreshToken = dbRec.refresh_token || refreshToken;
        }
    }
    if (!channelToken) {
        return res.status(401).send('channel token not configured');
    }

    try {
        if (format === 'json') {
            const json = await getFollowageJsonByFollowers({ viewer, channel: streamer, channelToken });
            res.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
            res.type('application/json');
            return res.json(json);
        } else {
            const text = await getFollowageTextByPattern({ viewer, channel: streamer, pattern: format, ping, channelToken, lang });
            res.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
            res.type('text/plain');
            return res.send(text);
        }
    } catch (err) {
        const status = err?.statusCode || 500;
        if (status === 401 && refreshToken) {
            try {
                const r = await refreshAccessToken(refreshToken);
                channelToken = r.access_token;
                if (dbRec) {
                    await upsertTokenRecord({ user_id: dbRec.user_id, login: dbRec.login, type: 'channel', access_token: r.access_token, refresh_token: r.refresh_token || dbRec.refresh_token, scope: 'moderator:read:followers', token_obtained_at: Date.now(), token_expires_in: r.expires_in });
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
                return res.status(st).send('error');
            }
        }
        return res.status(status).send('error');
    }
});

export default router;
