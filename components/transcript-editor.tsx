"use client";

import { useState, useRef } from "react";
import { Loader2, ArrowRight } from "lucide-react";

interface Props {
  value: string;
  liveText: string;
  onChange: (v: string) => void;
}

export function TranscriptEditor({ value, liveText, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const runEdit = async () => {
    if (!query.trim() || !value || isEditing) return;
    setIsEditing(true);
    try {
      const res = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: value, query }),
      });
      const data = await res.json();
      if (data.text) {
        onChange(data.text);
        setQuery("");
      }
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 h-full">
      <textarea
        className="flex-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-200 resize-none focus:outline-none focus:border-violet-500 min-h-[200px]"
        placeholder="Transcript will appear here…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {liveText && (
        <div className="bg-zinc-900 border border-violet-800/50 rounded-lg p-3 text-sm text-violet-300 italic">
          <span className="text-xs text-violet-500 not-italic font-medium mr-2">LIVE</span>
          {liveText}
        </div>
      )}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
          placeholder="Ask the agent to edit the transcript…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runEdit()}
          disabled={isEditing || !value}
        />
        <button
          onClick={runEdit}
          disabled={isEditing || !value || !query.trim()}
          className="flex items-center justify-center px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isEditing
            ? <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
            : <ArrowRight className="w-4 h-4 text-zinc-400" />}
        </button>
      </div>
    </div>
  );
}
