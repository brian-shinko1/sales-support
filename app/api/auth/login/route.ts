export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";

export function GET(req: NextRequest) {
  const base = new URL(req.url).origin;
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
    redirect_uri: `${base}/api/auth/callback`,
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
  });
  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  );
}
