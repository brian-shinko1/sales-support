"use client";

interface Props {
  value: string;
  liveText: string;
  onChange: (v: string) => void;
}

export function TranscriptEditor({ value, liveText, onChange }: Props) {
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
    </div>
  );
}
