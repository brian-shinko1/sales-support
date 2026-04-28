export const runtime = 'edge';

import { NextRequest, NextResponse } from "next/server";
import { buildDiarizeInput, callAiria } from "@/lib/airia";

export async function POST(req: NextRequest) {
  const xaiKey = process.env.XAI_API_KEY;
  if (!xaiKey) return NextResponse.json({ error: "XAI_API_KEY not set" }, { status: 500 });

  const airiaKey = process.env.AIRIA_API_KEY;
  if (!airiaKey) return NextResponse.json({ error: "AIRIA_API_KEY not set" }, { status: 500 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  let frozen, meeting;
  try { frozen = JSON.parse(form.get("frozen") as string); } catch {}
  try { meeting = JSON.parse(form.get("meeting") as string); } catch {}

  // 1. xAI STT
  const upstream = new FormData();
  upstream.append("file", file);

  const sttRes = await fetch("https://api.x.ai/v1/stt", {
    method: "POST",
    headers: { Authorization: `Bearer ${xaiKey}` },
    body: upstream,
  });

  if (!sttRes.ok) {
    const err = await sttRes.text();
    console.error("xAI STT error:", sttRes.status, err);
    return NextResponse.json({ error: err }, { status: sttRes.status });
  }

  const { text: rawTranscript } = await sttRes.json();

  // 2. Airia — diarize with context
  const userInput = buildDiarizeInput(rawTranscript, frozen, meeting);
  const processed = await callAiria(airiaKey, userInput);

  return NextResponse.json({ text: processed });
}
