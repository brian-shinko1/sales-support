"use client";

import { useState } from "react";
import { Save, ExternalLink, Loader2 } from "lucide-react";
import { useGoogleAuth } from "@/hooks/use-google-auth";

interface Props {
  transcript: string;
  summary: string;
}

export function DriveSaveButton({ transcript, summary }: Props) {
  const { requestToken } = useGoogleAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const token = await requestToken();
      const content = summary
        ? `# Summary\n\n${summary}\n\n---\n\n# Transcript\n\n${transcript}`
        : transcript;
      const filename = `transcript-${new Date().toISOString().slice(0, 10)}.md`;

      const res = await fetch("/api/drive", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ filename, content, mimeType: "text/plain" }),
      });

      const data = await res.json();
      if (data.id) {
        setSavedUrl(`https://drive.google.com/file/d/${data.id}/view`);
      } else {
        setError(data.error ?? "Failed to save");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={save}
        disabled={isSaving || (!transcript && !summary)}
        className="flex items-center justify-center gap-2 rounded-lg py-2 px-4 text-sm font-medium bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-zinc-300"
      >
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {isSaving ? "Saving…" : "Save to Google Drive"}
      </button>

      {savedUrl && (
        <a
          href={savedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300"
        >
          <ExternalLink className="w-3 h-3" /> Saved — open in Drive
        </a>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
