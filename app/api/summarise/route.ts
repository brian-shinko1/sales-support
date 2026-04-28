export const runtime = 'edge';

import { NextRequest } from "next/server";
import { AIRIA_SUMMARISE_URL, buildUserInput } from "@/lib/airia";

export async function POST(req: NextRequest) {
  const apiKey = process.env.AIRIA_API_KEY;
  if (!apiKey) return new Response("AIRIA_API_KEY not set", { status: 500 });

  const { transcript, frozen, meeting } = await req.json();
  if (!transcript) return new Response("Missing transcript", { status: 400 });

  const userInput = buildUserInput("", transcript, frozen, meeting);

  const airiaRes = await fetch(AIRIA_SUMMARISE_URL, {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ userInput, asyncOutput: true }),
  });

  if (!airiaRes.ok) {
    return new Response(`Airia ${airiaRes.status}`, { status: 502 });
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      const reader = airiaRes.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (!data) continue;

            let msg: Record<string, unknown>;
            try { msg = JSON.parse(data); } catch { continue; }

            if (msg.MessageType === "AgentEndMessage") {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
              return;
            }
            if (msg.MessageType === "ModelStreamFragment") {
              const fragment = (msg.Content ?? "") as string;
              if (fragment) {
                const payload = JSON.stringify({ delta: { text: fragment } });
                controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
              }
            }
          }
        }
      } finally {
        controller.close();
      }
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
