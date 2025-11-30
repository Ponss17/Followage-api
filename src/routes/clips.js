import express from 'express';
import { createClip, getUserByLogin } from '../twitch.js';
import { extractAuthCredentials, upsertTokenRecord, refreshAccessToken } from '../utils/auth.js';
import { getClipRateCollection } from '../db.js';

const router = express.Router();
const TWITCH_LOGIN_REGEX = /^[A-Za-z0-9_]{1,32}$/;

const CLIP_WINDOW_MS = 5 * 60 * 1000;
const CLIP_MAX = 3;

async function canCreateClipPersistent(userId) {
    const col = await getClipRateCollection();
    const now = new Date();
    const count = await col.countDocuments({ user_id: String(userId), expire_at: { $gt: now } });
    return count < CLIP_MAX;
}

router.get('/api/clips/create', async (req, res) => {
    try {
        const creator = (req.query.creator || '').toString().trim();
        const { userId: extractedId, token: extractedToken, refreshToken: extractedRefresh } = await extractAuthCredentials(req);

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

        if (!(await canCreateClipPersistent(userId))) {
            const msg = lang === 'es' ? 'Cooldown: máximo 3 clips cada 5 minutos' : 'Cooldown: max 3 clips per 5 minutes';
            return res.type('text/plain').status(200).send(msg);
        }

        const clipData = await createClip({ broadcasterId, userToken });
        const clipUrl = clipData.url || '';
        const msgOk = creator
            ? (lang === 'es' ? `✅ Clip creado por ${creator}: ${clipUrl}` : `✅ Clip created by ${creator}: ${clipUrl}`)
            : (lang === 'es' ? `✅ Clip creado: ${clipUrl}` : `✅ Clip created: ${clipUrl}`);
        const col = await getClipRateCollection();
        await col.insertOne({ user_id: String(userId), created_at: new Date(), expire_at: new Date(Date.now() + CLIP_WINDOW_MS) });
        return res.type('text/plain').status(200).send(msgOk);
    } catch (err) {
        const status = err?.statusCode || 500;
        const lang = (req.query.lang || 'es').toString().trim();
        const channelParam = (req.query.channel || '').toString().trim();
        if (status === 401 && extractedRefresh) {
            try {
                const r = await refreshAccessToken(extractedRefresh);
                const creator = (req.query.creator || '').toString().trim();
                const channelParam2 = (req.query.channel || '').toString().trim();
                let broadcasterId;
                if (channelParam2) {
                    const channelUser = await getUserByLogin(channelParam2);
                    broadcasterId = channelUser?.id || userId;
                } else {
                    broadcasterId = userId;
                }
                userToken = r.access_token;
                await upsertTokenRecord({ user_id: userId, login: '', type: 'clips', access_token: r.access_token, refresh_token: r.refresh_token || extractedRefresh, scope: 'clips:edit', token_obtained_at: Date.now(), token_expires_in: r.expires_in });
                const clipData2 = await createClip({ broadcasterId, userToken });
                const clipUrl = clipData2.url || '';
                const msgOk = creator ? (lang === 'es' ? `✅ Clip creado por ${creator}: ${clipUrl}` : `✅ Clip created by ${creator}: ${clipUrl}`) : (lang === 'es' ? `✅ Clip creado: ${clipUrl}` : `✅ Clip created: ${clipUrl}`);
                const col = await getClipRateCollection();
                await col.insertOne({ user_id: String(userId), created_at: new Date(), expire_at: new Date(Date.now() + CLIP_WINDOW_MS) });
                return res.type('text/plain').status(200).send(msgOk);
            } catch (_e2) {  }
        }
        let msg;
        if (status === 401) msg = lang === 'es' ? 'Debes iniciar sesión para crear clips' : 'Authentication required';
        else if (status === 404) msg = lang === 'es' ? `Canal "${channelParam}" no encontrado` : `Channel "${channelParam}" not found`;
        else if (status === 400 || /offline|not.*live|is not live/i.test(err?.message || '')) msg = lang === 'es' ? 'No se puede en canales off' : 'Cannot create clip when channel is offline';
        else msg = lang === 'es' ? `Error creando clip: ${err?.message || 'error'}` : `Error creating clip: ${err?.message || 'error'}`;
        return res.type('text/plain').status(200).send(msg);
    }
});

router.post('/api/clips/create', async (req, res) => {
    res.status(405).send('Use GET for now');
});

export default router;
