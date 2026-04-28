export const runtime = 'edge';

import { NextRequest, NextResponse } from "next/server";
import { AIRIA_EDIT_URL, callAiria } from "@/lib/airia";

// Override the URL for callAiria by doing the fetch directly
export async function POST(req: NextRequest) {
  const apiKey = process.env.AIRIA_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AIRIA_API_KEY not set" }, { status: 500 });

  const { transcript, query } = await req.json();
  if (!transcript || !query) return NextResponse.json({ error: "Missing transcript or query" }, { status: 400 });

  const userInput = `[TRANSCRIPT]\n${transcript}\n\n[EDIT REQUEST]\n${query}`;

  const res = await fetch(AIRIA_EDIT_URL, {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ userInput, asyncOutput: false }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: res.status });
  }

  const data = await res.json();
  const text: string = data.output ?? data.result ?? data.text ?? JSON.stringify(data);
  return NextResponse.json({ text });
}
