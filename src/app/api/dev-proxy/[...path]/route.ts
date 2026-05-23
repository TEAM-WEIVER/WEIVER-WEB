import { NextRequest } from 'next/server';

const DEV_PROXY_BASE_URL = '/api/dev-proxy';
const DEFAULT_PROXY_TARGET = 'https://api.piuda.site';
const PROXY_TARGET = process.env.API_PROXY_TARGET ?? DEFAULT_PROXY_TARGET;

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-encoding',
  'content-length',
  'host',
  'keep-alive',
  'origin',
  'proxy-authenticate',
  'proxy-authorization',
  'referer',
  'set-cookie',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

function isDevProxyEnabled() {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.NEXT_PUBLIC_API_BASE_URL === DEV_PROXY_BASE_URL
  );
}

function buildTargetUrl(path: string[], search: string) {
  const pathname = path.map((segment) => encodeURIComponent(segment)).join('/');
  const url = new URL(`/${pathname}`, PROXY_TARGET);
  url.search = search;
  return url;
}

function splitSetCookieHeader(header: string) {
  const cookies: string[] = [];
  let start = 0;
  let inExpires = false;

  for (let index = 0; index < header.length; index += 1) {
    const char = header[index];

    if (header.slice(index, index + 8).toLowerCase() === 'expires=') {
      inExpires = true;
      index += 7;
      continue;
    }

    if (inExpires && char === ';') {
      inExpires = false;
      continue;
    }

    if (!inExpires && char === ',') {
      cookies.push(header.slice(start, index).trim());
      start = index + 1;
    }
  }

  cookies.push(header.slice(start).trim());
  return cookies.filter(Boolean);
}

function getSetCookieHeaders(headers: Headers) {
  const headersWithSetCookie = headers as Headers & {
    getSetCookie?: () => string[];
  };

  if (typeof headersWithSetCookie.getSetCookie === 'function') {
    return headersWithSetCookie.getSetCookie();
  }

  const setCookie = headers.get('set-cookie');
  return setCookie ? splitSetCookieHeader(setCookie) : [];
}

export function rewriteSetCookieForLocal(cookie: string) {
  const attributes = cookie
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);

  const rewritten = attributes.reduce<string[]>((accumulator, attribute, index) => {
    const lowerAttribute = attribute.toLowerCase();

    if (index > 0 && (lowerAttribute === 'secure' || lowerAttribute.startsWith('domain='))) {
      return accumulator;
    }

    if (index > 0 && lowerAttribute.startsWith('samesite=')) {
      accumulator.push('SameSite=Lax');
      return accumulator;
    }

    accumulator.push(attribute);
    return accumulator;
  }, []);

  if (!rewritten.some((attribute) => attribute.toLowerCase().startsWith('samesite='))) {
    rewritten.push('SameSite=Lax');
  }

  return rewritten.join('; ');
}

function buildProxyRequestHeaders(request: NextRequest) {
  const headers = new Headers(request.headers);

  for (const header of HOP_BY_HOP_HEADERS) {
    headers.delete(header);
  }

  return headers;
}

function buildProxyResponse(response: Response, body: BodyInit | null) {
  const headers = new Headers();

  response.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  for (const cookie of getSetCookieHeaders(response.headers)) {
    headers.append('Set-Cookie', rewriteSetCookieForLocal(cookie));
  }

  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function proxy(request: NextRequest, context: RouteContext) {
  if (!isDevProxyEnabled()) {
    return new Response(null, { status: 404 });
  }

  const { path = [] } = await context.params;
  const targetUrl = buildTargetUrl(path, request.nextUrl.search);
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';

  const response = await fetch(targetUrl, {
    method: request.method,
    headers: buildProxyRequestHeaders(request),
    body: hasBody ? request.body : undefined,
    redirect: 'manual',
    // Required when forwarding a streamed request body in Node fetch.
    duplex: hasBody ? 'half' : undefined,
  } as RequestInit & { duplex?: 'half' });

  const body =
    request.method === 'HEAD' || response.status === 204 ? null : await response.arrayBuffer();
  return buildProxyResponse(response, body);
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
export const HEAD = proxy;
