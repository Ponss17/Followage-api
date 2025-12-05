import NodeCache from 'node-cache';
import { formatFollowageText, diffFromNow, formatByPattern } from './utils.js';

const cache = new NodeCache({ stdTTL: 300 });
const FOLLOW_CACHE_TTL = 60;
const upstashUrl = process.env.UPSTASH_REDIS_REST_URL || '';
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN || '';

async function redisGet(key) {
  if (!upstashUrl || !upstashToken) return null;
  try {
    const r = await fetch(`${upstashUrl}/get/${encodeURIComponent(key)}`, { headers: { Authorization: `Bearer ${upstashToken}` } });
    if (!r.ok) return null;
    const j = await r.json();
    if (j?.result == null) return null;
    try { return JSON.parse(j.result); } catch (_) { return j.result; }
  } catch (_) { return null; }
}
async function redisSet(key, value, ttlSec) {
  if (!upstashUrl || !upstashToken) return;
  try {
    const val = typeof value === 'string' ? value : JSON.stringify(value);
    await fetch(`${upstashUrl}/set/${encodeURIComponent(key)}/${encodeURIComponent(val)}?EX=${ttlSec}`, { headers: { Authorization: `Bearer ${upstashToken}` } });
  } catch (_) { }
}

let cachedToken = null;
let cachedTokenExp = 0;

async function getAppAccessToken() {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    const err = new Error('Faltan TWITCH_CLIENT_ID/TWITCH_CLIENT_SECRET en variables de entorno, por favor contactar con Ponss, Discord: ponsschiquito');
    err.statusCode = 500;
    throw err;
  }

  const now = Date.now();
  if (cachedToken && now < cachedTokenExp - 60_000) {
    return cachedToken;
  }

  const url = new URL('https://id.twitch.tv/oauth2/token');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('client_secret', clientSecret);
  url.searchParams.set('grant_type', 'client_credentials');

  const resp = await fetch(url, { method: 'POST' });
  if (!resp.ok) {
    const body = await resp.text();
    const err = new Error(`Error obteniendo token de Twitch: ${resp.status} ${body}`);
    err.statusCode = 502;
    throw err;
  }
  const json = await resp.json();
  cachedToken = json.access_token;
  cachedTokenExp = Date.now() + (json.expires_in * 1000);
  return cachedToken;
}

async function twitchFetch(path, params = {}, tokenOverride = null, options = {}) {
  const token = tokenOverride || await getAppAccessToken();
  const clientId = process.env.TWITCH_CLIENT_ID;
  const url = new URL(`https://api.twitch.tv/helix/${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) {
      for (const item of v) url.searchParams.append(k, item);
    } else {
      url.searchParams.set(k, v);
    }
  }

  let attempts = 0;
  const maxAttempts = 2;
  while (attempts < maxAttempts) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 2500);
    try {
      const resp = await fetch(url, {
        headers: {
          'Client-Id': clientId,
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (resp.status === 429 || resp.status >= 500) {
        attempts++;
        await new Promise(r => setTimeout(r, 500 * attempts));
        continue;
      }

      if (!resp.ok) {
        const body = await resp.text();
        const err = new Error(`Error de Twitch Helix: ${resp.status} ${body}`);
        err.statusCode = resp.status;
        throw err;
      }
      return await resp.json();
    } catch (err) {
      clearTimeout(timeout);
      if (attempts >= (maxAttempts - 1)) throw err;
      attempts++;
      await new Promise(r => setTimeout(r, 500 * attempts));
    }
  }
}

export async function getUserByLogin(login) {
  const cached = cache.get(`user_${login}`);
  if (cached) return cached;

  const data = await twitchFetch('users', { login });
  if (!data?.data?.length) return null;

  const user = data.data[0];
  cache.set(`user_${login}`, user);
  return user;
}

async function getUsersByLogins(viewerLogin, channelLogin) {
  const vKey = `user_${viewerLogin}`;
  const cKey = `user_${channelLogin}`;
  const vCached = cache.get(vKey);
  const cCached = cache.get(cKey);
  if (vCached && cCached) return { viewerUser: vCached, channelUser: cCached };
  const toFetch = [];
  if (!vCached) toFetch.push(viewerLogin);
  if (!cCached) toFetch.push(channelLogin);
  let items = [];
  if (toFetch.length) {
    const data = await twitchFetch('users', { login: toFetch }, null, { timeoutMs: 2000 });
    items = data?.data || [];
  }
  let viewerUser = vCached || items.find(u => String(u.login).toLowerCase() === String(viewerLogin).toLowerCase()) || null;
  let channelUser = cCached || items.find(u => String(u.login).toLowerCase() === String(channelLogin).toLowerCase()) || null;
  if (viewerUser) cache.set(vKey, viewerUser);
  if (channelUser) cache.set(cKey, channelUser);
  return { viewerUser, channelUser };
}

export async function getFollowRecord(fromId, toId, userToken) {
  if (!userToken) {
    const err = new Error('Se requiere autenticación del usuario para consultar followage');
    err.statusCode = 401;
    throw err;
  }
  const params = { user_id: fromId, broadcaster_id: toId, first: '1' };
  const data = await twitchFetch('channels/followed', params, userToken, { timeoutMs: 2500 });
  const item = (data?.data || [])[0];
  return item || null;
}

export async function getFollowerRecordByChannelToken(broadcasterId, userId, channelToken) {
  if (!channelToken) {
    const err = new Error('Falta token del canal/moderador (scope moderator:read:followers)');
    err.statusCode = 401;
    throw err;
  }
  const data = await twitchFetch('channels/followers', { broadcaster_id: broadcasterId, user_id: userId, first: '1' }, channelToken, { timeoutMs: 2000 });
  const item = (data?.data || [])[0];
  return item || null;
}

export async function getFollowageJsonByFollowers({ viewer, channel, channelToken }) {
  const { viewerUser, channelUser } = await getUsersByLogins(viewer, channel);
  if (!viewerUser) {
    const err = new Error(`No se encontró el usuario viewer "${viewer}"`);
    err.statusCode = 404;
    throw err;
  }
  if (!channelUser) {
    const err = new Error(`No se encontró el canal "${channel}"`);
    err.statusCode = 404;
    throw err;
  }
  const fKey = `f_${channelUser.id}_${viewerUser.id}`;
  let follow = cache.get(fKey);
  if (follow === undefined) {
    const fromRedis = await redisGet(fKey);
    if (fromRedis !== null) {
      follow = fromRedis;
      cache.set(fKey, follow || null, FOLLOW_CACHE_TTL);
    } else {
      follow = await getFollowerRecordByChannelToken(channelUser.id, viewerUser.id, channelToken);
      cache.set(fKey, follow || null, FOLLOW_CACHE_TTL);
      await redisSet(fKey, follow || null, FOLLOW_CACHE_TTL);
    }
  }
  if (!follow) {
    return {
      viewer: viewerUser.login,
      channel: channelUser.login,
      following: false
    };
  }
  const since = new Date(follow.followed_at);
  const duration = diffFromNow(since);
  return {
    viewer: viewerUser.login,
    channel: channelUser.login,
    following: true,
    followed_at: since.toISOString(),
    duration
  };
}

export async function getFollowageTextByPattern({ viewer, channel, pattern = 'ymdhis', ping = false, channelToken, lang = 'en' }) {
  const json = await getFollowageJsonByFollowers({ viewer, channel, channelToken });
  const notFollowingText = lang === 'es' ? 'no sigue' : 'not following';
  if (!json.following) return ping ? `@${channel} @${viewer} ${notFollowingText}` : notFollowingText;

  const formatted = formatByPattern(json.duration, pattern, lang);
  const sentence = lang === 'es'
    ? `${viewer} lleva siguiendo a ${channel} ${formatted}`
    : `${viewer} has been following ${channel} for ${formatted}`;

  return ping ? `@${channel} @${viewer} ${sentence}` : sentence;
}

export async function getFollowageJson({ viewer, channel, userToken }) {
  const { viewerUser, channelUser } = await getUsersByLogins(viewer, channel);
  if (!viewerUser) {
    const err = new Error(`No se encontró el usuario viewer "${viewer}"`);
    err.statusCode = 404;
    throw err;
  }
  if (!channelUser) {
    const err = new Error(`No se encontró el canal "${channel}"`);
    err.statusCode = 404;
    throw err;
  }
  const fKey = `fu_${viewerUser.id}_${channelUser.id}`;
  let follow = cache.get(fKey);
  if (follow === undefined) {
    const fromRedis = await redisGet(fKey);
    if (fromRedis !== null) {
      follow = fromRedis;
      cache.set(fKey, follow || null, FOLLOW_CACHE_TTL);
    } else {
      follow = await getFollowRecord(viewerUser.id, channelUser.id, userToken);
      cache.set(fKey, follow || null, FOLLOW_CACHE_TTL);
      await redisSet(fKey, follow || null, FOLLOW_CACHE_TTL);
    }
  }
  if (!follow) {
    return {
      viewer: viewerUser.login,
      channel: channelUser.login,
      following: false
    };
  }
  const since = new Date(follow.followed_at);
  const duration = diffFromNow(since);
  return {
    viewer: viewerUser.login,
    channel: channelUser.login,
    following: true,
    followed_at: since.toISOString(),
    duration
  };
}

export async function getFollowageText({ viewer, channel, lang = 'es', userToken }) {
  const json = await getFollowageJson({ viewer, channel, userToken });
  const notFollowingText = lang === 'es' ? `${viewer} no sigue a ${channel}.` : `${viewer} is not following ${channel}.`;

  if (!json.following) return notFollowingText;

  const formatted = formatByPattern(json.duration, 'ymdhis', lang);
  return lang === 'es'
    ? `${viewer} lleva siguiendo a ${channel} ${formatted}`
    : `${viewer} has been following ${channel} for ${formatted}`;
}

export async function createClip({ broadcasterId, userToken }) {
  if (!userToken) {
    const err = new Error('Se requiere autenticación del usuario para crear clips');
    err.statusCode = 401;
    throw err;
  }
  const clientId = process.env.TWITCH_CLIENT_ID;
  const url = new URL('https://api.twitch.tv/helix/clips');
  url.searchParams.set('broadcaster_id', broadcasterId);
  let attempts = 0;
  const maxAttempts = 2;
  while (attempts < maxAttempts) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Client-Id': clientId,
          'Authorization': `Bearer ${userToken}`
        },
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (resp.status === 429 || resp.status >= 500) {
        attempts++;
        await new Promise(r => setTimeout(r, 500 * attempts));
        continue;
      }
      if (!resp.ok) {
        const body = await resp.text();
        const err = new Error(`Error creando clip: ${resp.status} ${body}`);
        err.statusCode = resp.status;
        throw err;
      }
      const data = await resp.json();
      const clip = data?.data?.[0];
      if (!clip) {
        const err = new Error('No se pudo crear el clip');
        err.statusCode = 500;
        throw err;
      }
      return {
        id: clip.id,
        edit_url: clip.edit_url,
        url: `https://clips.twitch.tv/${clip.id}`
      };
    } catch (err) {
      clearTimeout(timeout);
      if (attempts >= (maxAttempts - 1)) throw err;
      attempts++;
      await new Promise(r => setTimeout(r, 500 * attempts));
    }
  }
}