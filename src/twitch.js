import { formatFollowageText, diffFromNow } from './utils.js';

let cachedToken = null;
let cachedTokenExp = 0;

async function getAppAccessToken() {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    const err = new Error('Faltan TWITCH_CLIENT_ID/TWITCH_CLIENT_SECRET en variables de entorno');
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

async function twitchFetch(path, params = {}) {
  const token = await getAppAccessToken();
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

export async function getFollowRecord(fromId, toId) {
  const data = await twitchFetch('users/follows', { from_id: fromId, to_id: toId });
  if (!data?.data?.length) return null;
  return data.data[0];
}

export async function getFollowageJson({ viewer, channel }) {
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
  const follow = await getFollowRecord(viewerUser.id, channelUser.id);
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

export async function getFollowageText({ viewer, channel, lang = 'es' }) {
  const json = await getFollowageJson({ viewer, channel });
  return formatFollowageText(json, lang);
}