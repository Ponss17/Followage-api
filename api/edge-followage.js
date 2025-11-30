export const config = { runtime: 'edge' };

export default async function handler(req) {
  try {
    const url = new URL(req.url);
    const path = url.searchParams.get('path') || '';
    const search = url.searchParams;
    search.delete('path');
    const dest = new URL(`/api/app/twitch/followage/${path}`, url.origin);
    dest.search = search.toString();

    const resp = await fetch(dest.toString(), { headers: req.headers });
    const headers = new Headers(resp.headers);
    headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    const body = await resp.text();
    return new Response(body, { status: resp.status, headers });
  } catch (e) {
    return new Response('error', { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}