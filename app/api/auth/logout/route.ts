export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/session";

export function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/login", req.url));
  res.cookies.delete(COOKIE_NAME);
  return res;
}
