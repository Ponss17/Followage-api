import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { getTokensCollection } from '../db.js';

const jwtSecret = process.env.JWT_SECRET || 'dev_jwt_secret';
const ENCRYPTION_KEY = crypto.scryptSync(jwtSecret, 'salt', 32);
const IV_LENGTH = 16;
const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';

export function encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-ctr', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text) {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-ctr', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

export function getTwitchHeaders(token) {
    return {
        'Client-Id': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`
    };
}

export async function refreshAccessToken(refreshToken) {
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

export async function upsertTokenRecord({ user_id, login, type, access_token, refresh_token, scope, token_obtained_at, token_expires_in }) {
    const col = await getTokensCollection();
    const now = Date.now();
    const res = await col.findOneAndUpdate(
        { user_id: String(user_id), type: String(type) },
        {
            $set: {
                login: String(login || ''),
                access_token: String(access_token || ''),
                refresh_token: refresh_token ? String(refresh_token) : null,
                scope: String(scope || ''),
                token_obtained_at: token_obtained_at || now,
                token_expires_in: token_expires_in || 0,
                updated_at: now
            },
            $setOnInsert: { created_at: now }
        },
        { upsert: true, returnDocument: 'after' }
    );
    return res.value;
}

export async function findTokenByUserType(user_id, type) {
    const col = await getTokensCollection();
    return await col.findOne({ user_id: String(user_id), type: String(type) });
}

export async function findTokenByLoginType(login, type) {
    const col = await getTokensCollection();
    return await col.findOne({ login: String(login), type: String(type) });
}

export async function extractAuthCredentials(req) {
    const rawAuth = (req.query.auth || req.query.auth_code || req.query.code || '').toString().trim();
    const queryToken = (req.query.token || req.query.mod_token || '').toString().trim();
    const queryId = (req.query.moderatorId || req.query.user_id || '').toString().trim();

    let userId = queryId;
    let token = queryToken;
    let refreshToken = null;

    if (rawAuth) {
        const s = decodeURIComponent(rawAuth);
        try {
            const payload = JSON.parse(decrypt(s));
            if (payload && payload.user_id && payload.type) {
                const rec = await findTokenByUserType(payload.user_id, payload.type);
                if (rec) {
                    const expected = Number(rec.code_nonce || 0);
                    const hasNonce = payload.nonce != null;
                    const nonceOk = hasNonce ? (Number(payload.nonce) === expected) : (expected === 0);
                    if (nonceOk) {
                        userId = String(rec.user_id);
                        token = rec.access_token || token;
                        refreshToken = rec.refresh_token || null;
                    }
                }
            } else if (payload && payload.id && payload.token) {
                userId = payload.id;
                token = payload.token;
                refreshToken = payload.refresh_token || null;
            }
        } catch (_) { }
    } else if (userId && token) {
        try {
            const rec = await findTokenByUserType(userId, 'channel');
            if (rec && rec.access_token === token) {
                refreshToken = rec.refresh_token || null;
            }
        } catch (_) { }
    }

    return { userId, token, refreshToken };
}

export function setCookie(req, res, cookieName, payload) {
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

export const setAuthCookie = (req, res, payload) => setCookie(req, res, 'auth', payload);
export const setChannelCookie = (req, res, payload) => setCookie(req, res, 'channel_auth', payload);
export const setClipsCookie = (req, res, payload) => setCookie(req, res, 'clips_auth', payload);
