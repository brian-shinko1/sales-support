"use client";

import { useRef, useState, useCallback } from "react";
import { Upload, Mic, MicOff, Loader2, FileAudio, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { FrozenContext, MeetingContext } from "@/types";

interface Props {
  isTranscribing: boolean;
  isRecording: boolean;
  frozen: FrozenContext;
  meeting: MeetingContext;
  onTranscribing: () => void;
  onTranscribed: (text: string) => void;
  onStartLive: () => void;
  onStopLive: () => void;
}

export function UploadPanel({ isTranscribing, isRecording, frozen, meeting, onTranscribing, onTranscribed, onStartLive, onStopLive }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const transcribe = useCallback(async (file: File) => {
    onTranscribing();
    const form = new FormData();
    form.append("file", file);
    form.append("frozen", JSON.stringify(frozen));
    form.append("meeting", JSON.stringify(meeting));
    const res = await fetch("/api/transcribe", { method: "POST", body: form });
    const data = await res.json();
    if (data.text) onTranscribed(data.text);
    setSelectedFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }, [onTranscribing, onTranscribed, frozen, meeting]);

  const clearFile = () => {
    setSelectedFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Input</p>

      {selectedFile ? (
        <div className="border border-zinc-700 rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <FileAudio className="w-4 h-4 text-violet-400 shrink-0" />
            <span className="text-sm text-zinc-300 truncate flex-1">{selectedFile.name}</span>
            {!isTranscribing && (
              <button onClick={clearFile} className="text-zinc-600 hover:text-zinc-400 shrink-0">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => transcribe(selectedFile)}
            disabled={isTranscribing}
            className="flex items-center justify-center gap-2 rounded-md py-1.5 text-sm font-medium bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isTranscribing
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
              : "Transcribe"}
          </button>
        </div>
      ) : (
        <div
          className={cn(
            "border border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors",
            isDragging ? "border-violet-500 bg-violet-500/10" : "border-zinc-700 hover:border-zinc-500"
          )}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) setSelectedFile(file);
          }}
        >
          <Upload className="w-6 h-6 text-zinc-500" />
          <span className="text-sm text-zinc-400">Drop audio / click to upload</span>
          <span className="text-xs text-zinc-600">mp3, wav, m4a, webm</span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) setSelectedFile(file);
        }}
      />

      <button
        onClick={isRecording ? onStopLive : onStartLive}
        className={cn(
          "flex items-center justify-center gap-2 rounded-lg py-2 px-4 text-sm font-medium transition-colors",
          isRecording
            ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
            : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
        )}
      >
        {isRecording
          ? <><MicOff className="w-4 h-4" /> Stop Recording</>
          : <><Mic className="w-4 h-4" /> Live Transcribe</>}
      </button>
    </div>
  );
}
