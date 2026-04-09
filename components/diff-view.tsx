"use client";

import { useMemo } from "react";
import { computeDiff } from "@/lib/diff";
import { cn } from "@/lib/cn";

interface Props {
  original: string;
  modified: string;
}

export function DiffView({ original, modified }: Props) {
  const ops = useMemo(() => computeDiff(original, modified), [original, modified]);

  if (!original && !modified) {
    return <p className="text-zinc-600 text-sm">No content to diff yet.</p>;
  }

  return (
    <div className="font-mono text-sm bg-zinc-900 rounded-lg border border-zinc-700 overflow-auto p-3 space-y-0.5">
      {ops.map((op, i) => (
        <div
          key={i}
          className={cn(
            "px-2 py-0.5 rounded whitespace-pre-wrap break-all",
            op.type === "delete" && "bg-red-950/40 text-red-400 line-through",
            op.type === "insert" && "bg-green-950/40 text-green-400",
            op.type === "equal" && "text-zinc-500"
          )}
        >
          {op.type === "delete" && "− "}
          {op.type === "insert" && "+ "}
          {op.type === "equal" && "  "}
          {op.text}
        </div>
      ))}
    </div>
  );
}
