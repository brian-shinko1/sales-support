"use client";

import { useState } from "react";
import { Loader2, FileText } from "lucide-react";
import { formatSummaryAsMarkdown } from "@/lib/airia";
import type { FrozenContext, MeetingContext } from "@/types";

interface Props {
  transcript: string;
  isRunning: boolean;
  frozen: FrozenContext;
  meeting: MeetingContext;
  onResult: (result: string, replaceTranscript?: boolean) => void;
}

export function AgentPanel({ transcript, isRunning, frozen, meeting, onResult }: Props) {
  const [isSummarising, setIsSummarising] = useState(false);

  const summarise = async () => {
    if (!transcript || isSummarising) return;
    setIsSummarising(true);
    onResult("", false);

    const res = await fetch("/api/summarise", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, frozen, meeting }),
    });

    if (!res.body) { setIsSummarising(false); return; }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") {
          onResult(formatSummaryAsMarkdown(full) + "[DONE]");
          setIsSummarising(false);
          return;
        }
        try {
          const token = JSON.parse(data).delta?.text ?? "";
          full += token;
          onResult(full);
        } catch {}
      }
    }
    onResult(formatSummaryAsMarkdown(full) + "[DONE]");
    setIsSummarising(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Agent</p>
      <button
        onClick={summarise}
        disabled={isSummarising || isRunning || !transcript}
        className="flex items-center justify-center gap-2 rounded-lg py-2 px-4 text-sm font-medium bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {isSummarising ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
        {isSummarising ? "Summarising…" : "Summarise"}
      </button>
    </div>
  );
}
