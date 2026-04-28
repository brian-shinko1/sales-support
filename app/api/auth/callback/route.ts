export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { signSession, COOKIE_NAME } from "@/lib/session";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", req.url));
  }

  const base = new URL(req.url).origin;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${base}/api/auth/callback`,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL("/login?error=token_exchange", req.url));
  }

  const { id_token } = await tokenRes.json();

  // Decode ID token payload — trusted because it came directly from Google's token endpoint
  const payloadB64 = id_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const { email, name } = JSON.parse(atob(payloadB64));

  const allowed = (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase());

  if (!allowed.includes(email.toLowerCase())) {
    return NextResponse.redirect(new URL("/login?error=not_allowed", req.url));
  }

  const token = await signSession({ email, name });
  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });
  return res;
}
