"use client";

import { useRef, useState, useCallback } from "react";
import { Upload, Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

interface Props {
  isTranscribing: boolean;
  isRecording: boolean;
  onTranscribed: (text: string) => void;
  onStartLive: () => void;
  onStopLive: () => void;
}

export function UploadPanel({ isTranscribing, isRecording, onTranscribed, onStartLive, onStopLive }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/transcribe", { method: "POST", body: form });
    const data = await res.json();
    if (data.text) onTranscribed(data.text);
  }, [onTranscribed]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Input</p>

      {/* File drop zone */}
      <div
        className={cn(
          "border border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors",
          isDragging ? "border-violet-500 bg-violet-500/10" : "border-zinc-700 hover:border-zinc-500"
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
      >
        {isTranscribing ? (
          <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
        ) : (
          <Upload className="w-6 h-6 text-zinc-500" />
        )}
        <span className="text-sm text-zinc-400">
          {isTranscribing ? "Transcribing…" : "Drop audio / click to upload"}
        </span>
        <span className="text-xs text-zinc-600">mp3, wav, m4a, webm</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {/* Live mic */}
      <button
        onClick={isRecording ? onStopLive : onStartLive}
        className={cn(
          "flex items-center justify-center gap-2 rounded-lg py-2 px-4 text-sm font-medium transition-colors",
          isRecording
            ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
            : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
        )}
      >
        {isRecording ? <><MicOff className="w-4 h-4" /> Stop Recording</> : <><Mic className="w-4 h-4" /> Live Transcribe</>}
      </button>
    </div>
  );
}
