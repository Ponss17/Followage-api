import express from 'express';
import { upsertTokenRecord, encrypt } from '../utils/auth.js';

const router = express.Router();
const TWITCH_LOGIN_REGEX = /^[A-Za-z0-9_]{1,32}$/;

router.get('/health', (_req, res) => {
    const checks = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        config: {
            hasClientId: !!process.env.TWITCH_CLIENT_ID,
            hasClientSecret: !!process.env.TWITCH_CLIENT_SECRET,
            hasJwtSecret: !!process.env.JWT_SECRET,
            hasMongoUri: !!(process.env.MONGODB_URI || process.env.Losperrisapi_MONGODB_URI || process.env.NONOGDB_URI),
            nodeVersion: process.version
        }
    };

    const allConfigured = checks.config.hasClientId &&
        checks.config.hasClientSecret &&
        checks.config.hasJwtSecret;

    res.status(allConfigured ? 200 : 503).json(checks);
});

router.get('/me', (req, res) => {
    if (!req.user) return res.status(401).json({ authenticated: false });
    res.json({ authenticated: true, user: req.user });
});

router.get('/channel/me', async (req, res) => {
    if (!req.channel) return res.status(401).json({ authenticated: false });

    const channelId = (req.channel.channel_id != null)
        ? req.channel.channel_id
        : (req.channel.id != null ? req.channel.id : null);

    let authCode = null;
    try {
        await upsertTokenRecord({
            user_id: channelId,
            login: req.channel.login,
            type: 'channel',
            access_token: req.channel.access_token,
            refresh_token: req.channel.refresh_token || null,
            scope: 'moderator:read:followers',
            token_obtained_at: req.channel.token_obtained_at,
            token_expires_in: req.channel.token_expires_in
        });
        authCode = encrypt(JSON.stringify({ user_id: channelId, type: 'channel' }));
    } catch (_) { }

    const channelPayload = { ...req.channel };
    if (channelPayload.channel_id == null && channelId != null) channelPayload.channel_id = channelId;

    res.json({
        authenticated: true,
        channel: channelPayload,
        auth_code: authCode
    });
});

router.get('/clips/me', async (req, res) => {
    if (!req.clips) return res.status(401).json({ authenticated: false });

    let authCode = null;
    try {
        await upsertTokenRecord({
            user_id: req.clips.id,
            login: req.clips.login,
            type: 'clips',
            access_token: req.clips.access_token,
            refresh_token: req.clips.refresh_token || null,
            scope: 'clips:edit',
            token_obtained_at: req.clips.token_obtained_at,
            token_expires_in: req.clips.token_expires_in
        });
        authCode = encrypt(JSON.stringify({ user_id: req.clips.id, type: 'clips' }));
    } catch (err) {
        console.error('Error generating auth code:', err);
    }

    res.json({
        authenticated: true,
        clips: req.clips,
        auth_code: authCode
    });
});

router.get('/twitch/chatter/:streamer', async (req, res) => {
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

export default router;
