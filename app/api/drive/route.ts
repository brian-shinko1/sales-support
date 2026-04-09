export const runtime = 'edge';

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "No auth token" }, { status: 401 });

  const { filename, content, mimeType = "text/plain" } = await req.json();
  if (!filename || !content) return NextResponse.json({ error: "Missing filename or content" }, { status: 400 });

  const boundary = "-------sales_support_boundary";
  const metadata = JSON.stringify({ name: filename, mimeType });
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    metadata,
    `--${boundary}`,
    `Content-Type: ${mimeType}`,
    "",
    content,
    `--${boundary}--`,
  ].join("\r\n");

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data.error?.message ?? "Drive error" }, { status: res.status });
  return NextResponse.json(data);
}
