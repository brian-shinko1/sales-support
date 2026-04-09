export const runtime = 'edge';

import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ELEVENLABS_API_KEY not set" }, { status: 500 });

  // ElevenLabs Scribe WebSocket URL — API key is passed as a query param
  const url = `wss://api.elevenlabs.io/v1/speech-to-text/stream?xi-api-key=${apiKey}&model_id=scribe_v1`;
  return NextResponse.json({ url });
}
