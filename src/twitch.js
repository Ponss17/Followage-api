import { formatFollowageText, diffFromNow, formatByPattern } from './utils.js';

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

async function twitchFetch(path, params = {}, tokenOverride = null) {
  const token = tokenOverride || await getAppAccessToken();
  const clientId = process.env.TWITCH_CLIENT_ID;
  const url = new URL(`https://api.twitch.tv/helix/${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const resp = await fetch(url, {
    headers: {
      'Client-Id': clientId,
      'Authorization': `Bearer ${token}`
    }
  });
  if (!resp.ok) {
    const body = await resp.text();
    const err = new Error(`Error de Twitch Helix: ${resp.status} ${body}`);
    err.statusCode = resp.status;
    throw err;
  }
  return resp.json();
}

export async function getUserByLogin(login) {
  const data = await twitchFetch('users', { login });
  if (!data?.data?.length) return null;
  return data.data[0];
}

export async function getFollowRecord(fromId, toId, userToken) {
  if (!userToken) {
    const err = new Error('Se requiere autenticación del usuario para consultar followage');
    err.statusCode = 401;
    throw err;
  }
  let cursor = null;
  let safety = 0;
  while (safety++ < 20) {
    const params = { user_id: fromId, first: '100' };
    if (cursor) params.after = cursor;
    const data = await twitchFetch('channels/followed', params, userToken);
    const match = (data?.data || []).find((item) => item?.broadcaster_id === toId);
    if (match) return match;
    cursor = data?.pagination?.cursor || null;
    if (!cursor) break;
  }
  return null;
}

export async function getFollowerRecordByChannelToken(broadcasterId, userId, channelToken) {
  if (!channelToken) {
    const err = new Error('Falta token del canal/moderador (scope moderator:read:followers)');
    err.statusCode = 401;
    throw err;
  }
  const data = await twitchFetch('channels/followers', { broadcaster_id: broadcasterId, user_id: userId, first: '1' }, channelToken);
  const item = (data?.data || [])[0];
  return item || null;
}

export async function getFollowageJsonByFollowers({ viewer, channel, channelToken }) {
  const viewerUser = await getUserByLogin(viewer);
  const channelUser = await getUserByLogin(channel);
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
  const follow = await getFollowerRecordByChannelToken(channelUser.id, viewerUser.id, channelToken);
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
  const viewerUser = await getUserByLogin(viewer);
  const channelUser = await getUserByLogin(channel);
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
  const follow = await getFollowRecord(viewerUser.id, channelUser.id, userToken);
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
  return formatFollowageText(json, lang);
}