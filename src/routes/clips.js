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

async function handleClipRequest(req, res, responseType = 'text') {
    const lang = (req.query.lang || 'es').toString().trim();
    const creator = (req.query.creator || '').toString().trim();
    const channelParam = (req.query.channel || '').toString().trim();

    const { userId: extractedId, token: extractedToken, refreshToken: extractedRefresh } = await extractAuthCredentials(req);

    let userToken = extractedToken || req.clips?.access_token;
    let userId = extractedId || req.clips?.id;
    let refreshToken = extractedRefresh || req.clips?.refresh_token;

    const sendResponse = (status, message, data = null) => {
        if (responseType === 'json') {
            if (status >= 400) {
                return res.status(status).json({ error: true, message });
            }
            return res.status(status).json({ ...data, message });
        }
        return res.type('text/plain').status(200).send(message);
    };

    if (!userToken) {
        const msg = lang === 'es' ? 'Debes iniciar sesión para crear clips.' : 'Authentication required to create clips';
        return sendResponse(401, msg);
    }

    let broadcasterId;
    if (channelParam) {
        if (!TWITCH_LOGIN_REGEX.test(channelParam)) {
            const msg = lang === 'es' ? 'Canal inválido' : 'Invalid channel';
            return sendResponse(400, msg);
        }
        const channelUser = await getUserByLogin(channelParam);
        if (!channelUser) {
            const msg = lang === 'es' ? `Canal "${channelParam}" no encontrado` : `Channel "${channelParam}" not found`;
            return sendResponse(404, msg);
        }
        broadcasterId = channelUser.id;
    } else {
        broadcasterId = userId;
    }

    if (!(await canCreateClipPersistent(userId))) {
        const msg = lang === 'es' ? 'Cooldown: máximo 3 clips cada 5 minutos' : 'Cooldown: max 3 clips per 5 minutes';
        return sendResponse(429, msg);
    }

    const performCreate = async (token) => {
        const clipData = await createClip({ broadcasterId, userToken: token });
        const clipUrl = clipData.url || '';
        const title = clipData.title || 'Clip';

        let msgOk;
        if (clipData.title) {
            msgOk = creator
                ? (lang === 'es' ? `✅ Clip creado por ${creator}: ${title} - ${clipUrl}` : `✅ Clip created by ${creator}: ${title} - ${clipUrl}`)
                : (lang === 'es' ? `✅ Clip creado: ${title} - ${clipUrl}` : `✅ Clip created: ${title} - ${clipUrl}`);
        } else {
            msgOk = creator
                ? (lang === 'es' ? `✅ Clip creado por ${creator}: ${clipUrl}` : `✅ Clip created by ${creator}: ${clipUrl}`)
                : (lang === 'es' ? `✅ Clip creado: ${clipUrl}` : `✅ Clip created: ${clipUrl}`);
        }

        const col = await getClipRateCollection();
        await col.insertOne({ user_id: String(userId), created_at: new Date(), expire_at: new Date(Date.now() + CLIP_WINDOW_MS) });

        return sendResponse(200, msgOk, clipData);
    };

    try {
        await performCreate(userToken);
    } catch (err) {
        const status = err?.statusCode || 500;
        if (status === 401 && refreshToken) {
            try {
                const r = await refreshAccessToken(refreshToken);
                userToken = r.access_token;
                await upsertTokenRecord({
                    user_id: userId,
                    type: 'clips',
                    access_token: r.access_token,
                    refresh_token: r.refresh_token || refreshToken,
                    scope: 'clips:edit',
                    token_obtained_at: Date.now(),
                    token_expires_in: r.expires_in
                });

                await performCreate(userToken);
                return;
            } catch (refreshErr) {
                console.error('Error refreshing token:', refreshErr);
            }
        }

        let msg;
        if (status === 401) msg = lang === 'es' ? 'Debes iniciar sesión para crear clips' : 'Authentication required';
        else if (status === 404) msg = lang === 'es' ? `Canal "${channelParam}" no encontrado` : `Channel "${channelParam}" not found`;
        else if (status === 400 || /offline|not.*live|is not live/i.test(err?.message || '')) msg = lang === 'es' ? 'No se puede en canales off' : 'Cannot create clip when channel is offline';
        else msg = lang === 'es' ? `Error creando clip: ${err?.message || 'error'}` : `Error creating clip: ${err?.message || 'error'}`;

        return sendResponse(status === 401 || status === 404 || status === 400 ? status : 500, msg);
    }
}

router.get('/api/clips/create', async (req, res) => {
    await handleClipRequest(req, res, 'text');
});

router.post('/api/clips/create', async (req, res) => {
    await handleClipRequest(req, res, 'json');
});

export default router;
