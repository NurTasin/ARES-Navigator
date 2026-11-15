import type { NextRequest } from 'next/server';

const ALLOWED_TIERS = new Set(['large', 'orig', 'medium']);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const pia = searchParams.get('pia') ?? '';
  const tier = searchParams.get('tier') ?? 'large';

  if (!/^PIA\d{5}$/.test(pia) || !ALLOWED_TIERS.has(tier)) {
    return new Response('Invalid NASA PIA identifier or tier', { status: 400 });
  }

  const targetUrl = `https://images-assets.nasa.gov/image/${pia}/${pia}~${tier}.jpg`;

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'ARES-NAVIGATOR-Mars-Planner/1.0',
      },
    });

    if (!upstream.ok || !upstream.body) {
      return new Response('Upstream NASA image unavailable', { status: upstream.status });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return new Response('Failed to stream NASA panorama', { status: 502 });
  }
}
