export const runtime = 'edge';

import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response("ANTHROPIC_API_KEY not set", { status: 500 });
  }

  const { transcript, prompt } = await req.json();
  if (!transcript || !prompt) {
    return new Response("Missing transcript or prompt", { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  const stream = client.messages.stream({
    model: "claude-opus-4-5",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `${prompt}\n\n${transcript}`,
      },
    ],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          const data = JSON.stringify({ delta: { text: event.delta.text } });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
      }
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
