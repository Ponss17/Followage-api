export function buildSecureUrls(viewer, channel, lang, format, authCode) {
  const displayBase = window.location.origin;
  const displayUrl = new URL(`/twitch/followage/${encodeURIComponent(channel)}/${encodeURIComponent(viewer)}`, displayBase);
  displayUrl.searchParams.set('format', format === 'json' ? 'json' : 'ymdhis');
  displayUrl.searchParams.set('lang', lang);
  if (authCode) displayUrl.searchParams.set('auth', authCode);

  const genericBase = 'https://www.losperris.site';
  const genericUrl = new URL(`/twitch/followage/$(channel)/$(user)`, genericBase);
  genericUrl.searchParams.set('format', format === 'json' ? 'json' : 'ymdhis');
  genericUrl.searchParams.set('ping', 'false');
  genericUrl.searchParams.set('lang', lang);
  if (authCode) genericUrl.searchParams.set('auth', authCode);

  const fetchUrl = new URL(`/twitch/followage/${encodeURIComponent(channel)}/${encodeURIComponent(viewer)}`, window.location.origin);
  fetchUrl.searchParams.set('format', format === 'json' ? 'json' : 'ymdhis');
  fetchUrl.searchParams.set('ping', 'false');
  fetchUrl.searchParams.set('lang', lang);
  if (authCode) fetchUrl.searchParams.set('auth', authCode);

  return { displayUrl: displayUrl.toString(), genericUrl: genericUrl.toString(), fetchUrl };
}
export function buildPublicUrls(viewer, channel, lang, format, moderatorId, channelToken) {
  const displayBase = window.location.origin;
  const displayUrl = new URL(`/twitch/followage/${encodeURIComponent(channel)}/${encodeURIComponent(viewer)}`, displayBase);
  displayUrl.searchParams.set('format', format === 'json' ? 'json' : 'ymdhis');
  displayUrl.searchParams.set('lang', lang);
  if (moderatorId) displayUrl.searchParams.set('moderatorId', moderatorId);
  if (channelToken) displayUrl.searchParams.set('token', channelToken);

  const genericBase = 'https://www.losperris.site';
  const genericUrl = new URL(`/twitch/followage/$(channel)/$(user)`, genericBase);
  genericUrl.searchParams.set('format', format === 'json' ? 'json' : 'ymdhis');
  genericUrl.searchParams.set('ping', 'false');
  genericUrl.searchParams.set('lang', lang);
  if (moderatorId) genericUrl.searchParams.set('moderatorId', moderatorId);
  if (channelToken) genericUrl.searchParams.set('token', channelToken);

  const fetchUrl = new URL(`/twitch/followage/${encodeURIComponent(channel)}/${encodeURIComponent(viewer)}`, window.location.origin);
  fetchUrl.searchParams.set('format', format === 'json' ? 'json' : 'ymdhis');
  fetchUrl.searchParams.set('ping', 'false');
  fetchUrl.searchParams.set('lang', lang);
  if (moderatorId) fetchUrl.searchParams.set('moderatorId', moderatorId);
  if (channelToken) fetchUrl.searchParams.set('token', channelToken);

  return { displayUrl: displayUrl.toString(), genericUrl: genericUrl.toString(), fetchUrl };
}
export function buildFollowageUrls(viewer, channel, lang, format, moderatorId, channelToken, authCode, linkType = 'secure') {
  return linkType === 'secure'
    ? buildSecureUrls(viewer, channel, lang, format, authCode)
    : buildPublicUrls(viewer, channel, lang, format, moderatorId, channelToken);
}