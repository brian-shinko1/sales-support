export const runtime = 'edge';

import { NextRequest } from "next/server";
import { AIRIA_SUMMARISE_URL, buildUserInput, callAiriaAt } from "@/lib/airia";

export async function POST(req: NextRequest) {
  const apiKey = process.env.AIRIA_API_KEY;
  if (!apiKey) return new Response("AIRIA_API_KEY not set", { status: 500 });

  const { transcript, frozen, meeting } = await req.json();
  if (!transcript) return new Response("Missing transcript", { status: 400 });

  const userInput = buildUserInput("", transcript, frozen, meeting);

  let text: string;
  try {
    text = await callAiriaAt(apiKey, AIRIA_SUMMARISE_URL, userInput);
  } catch (e) {
    return new Response(String(e), { status: 502 });
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    start(controller) {
      const payload = JSON.stringify({ delta: { text } });
      controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
