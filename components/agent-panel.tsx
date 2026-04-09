"use client";

import { useState } from "react";
import { Zap, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

const PRESETS = [
  { label: "Summarize", prompt: "Summarize the following transcript concisely in markdown with key points:" },
  { label: "Clean Up", prompt: "Clean up and correct the following transcript, fixing grammar and removing filler words. Return only the corrected text:" },
  { label: "Action Items", prompt: "Extract all action items and to-dos from the following transcript as a markdown checklist:" },
  { label: "Custom", prompt: "" },
];

interface Props {
  transcript: string;
  isRunning: boolean;
  onResult: (result: string, replaceTranscript?: boolean) => void;
}

export function AgentPanel({ transcript, isRunning, onResult }: Props) {
  const [selected, setSelected] = useState(0);
  const [customPrompt, setCustomPrompt] = useState("");

  const run = async () => {
    const prompt = selected === 3 ? customPrompt : PRESETS[selected].prompt;
    if (!prompt || !transcript) return;

    onResult("", false); // clear previous result, signal start
    const res = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, prompt }),
    });

    if (!res.body) return;
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
          onResult(full + "[DONE]", selected === 1);
          return;
        }
        try {
          const json = JSON.parse(data);
          const token = json.delta?.text ?? "";
          full += token;
          onResult(full, selected === 1);
        } catch {}
      }
    }
    onResult(full + "[DONE]", selected === 1);
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Agent</p>

      <div className="flex gap-1 flex-wrap">
        {PRESETS.map((p, i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            className={cn(
              "px-3 py-1 rounded-md text-xs font-medium transition-colors",
              selected === i ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {selected === 3 && (
        <textarea
          className="bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-sm text-zinc-200 resize-none focus:outline-none focus:border-violet-500 h-20"
          placeholder="Enter custom prompt…"
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
        />
      )}

      <button
        onClick={run}
        disabled={isRunning || !transcript}
        className="flex items-center justify-center gap-2 rounded-lg py-2 px-4 text-sm font-medium bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
        {isRunning ? "Running…" : "Run Agent"}
      </button>
    </div>
  );
}
