import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_BASE_URL = process.env.API_BACKEND_URL ?? 'https://api.piuda.site';
const ACCESS_TOKEN_COOKIE = 'weiver.access_token';

export async function POST(request: NextRequest) {
  const body: unknown = await request.json();

  const backendResponse = await fetch(`${BACKEND_BASE_URL}/api/auth/applicants/signup/agreements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data: unknown = await backendResponse.json();

  if (!backendResponse.ok) {
    return NextResponse.json(data, { status: backendResponse.status });
  }

  const { accessToken, role } = (data as { data: { accessToken: string; role: string } }).data;

  const cookieStore = await cookies();
  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60, // 1시간
  });

  return NextResponse.json({ data: { role, accessToken } }, { status: 200 });
}
