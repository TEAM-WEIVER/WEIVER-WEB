import { NextRequest, NextResponse } from 'next/server';

const BACKEND_BASE_URL = process.env.API_BACKEND_URL ?? 'https://api.weiverai.com';

export async function POST(request: NextRequest) {
  const body: unknown = await request.json();

  const backendResponse = await fetch(`${BACKEND_BASE_URL}/api/auth/applicants/signup/agreements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!backendResponse.ok) {
    const data: unknown = await backendResponse.json();
    return NextResponse.json(data, { status: backendResponse.status });
  }

  return new NextResponse(null, { status: 204 });
}
