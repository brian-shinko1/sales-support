"use client";

import { useState, useCallback } from "react";
import { UploadPanel } from "@/components/upload-panel";
import { TranscriptEditor } from "@/components/transcript-editor";
import { DiffView } from "@/components/diff-view";
import { MarkdownPreview } from "@/components/markdown-preview";
import { AgentPanel } from "@/components/agent-panel";
import { DriveSaveButton } from "@/components/drive-save-button";
import { useScribeWS } from "@/hooks/use-scribe-ws";
import { cn } from "@/lib/cn";
import type { Tab } from "@/types";

export default function Home() {
  const [originalTranscript, setOriginalTranscript] = useState("");
  const [editedTranscript, setEditedTranscript] = useState("");
  const [agentResult, setAgentResult] = useState("");
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("transcript");

  const handleFinalLive = useCallback((text: string) => {
    setOriginalTranscript((prev) => prev ? `${prev}\n${text}` : text);
    setEditedTranscript((prev) => prev ? `${prev}\n${text}` : text);
  }, []);

  const { liveText, isRecording, start: startLive, stop: stopLive } = useScribeWS(handleFinalLive);

  const handleTranscribed = useCallback((text: string) => {
    setOriginalTranscript(text);
    setEditedTranscript(text);
    setIsTranscribing(false);
    setActiveTab("transcript");
  }, []);

  const handleAgentResult = useCallback((result: string, replaceTranscript = false) => {
    setIsAgentRunning(result.length > 0 && !result.endsWith("[DONE]"));
    const clean = result.replace("[DONE]", "");
    setAgentResult(clean);
    if (replaceTranscript) setEditedTranscript(clean);
    if (result.endsWith("[DONE]") || result.length > 0) {
      setActiveTab("summary");
    }
  }, []);

  const TABS: { id: Tab; label: string }[] = [
    { id: "transcript", label: "Transcript" },
    { id: "diff", label: "Diff" },
    { id: "summary", label: "Summary" },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-3 flex items-center gap-3">
        <span className="text-lg font-semibold tracking-tight">Sales Support</span>
        <span className="text-zinc-600 text-sm">transcribe · edit · summarize</span>
      </header>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar */}
        <aside className="w-64 border-r border-zinc-800 p-4 flex flex-col gap-6 overflow-y-auto shrink-0">
          <UploadPanel
            isTranscribing={isTranscribing}
            isRecording={isRecording}
            onTranscribed={(text) => {
              setIsTranscribing(true);
              handleTranscribed(text);
            }}
            onStartLive={startLive}
            onStopLive={stopLive}
          />

          <AgentPanel
            transcript={editedTranscript}
            isRunning={isAgentRunning}
            onResult={handleAgentResult}
          />

          <DriveSaveButton transcript={editedTranscript} summary={agentResult} />
        </aside>

        {/* Center content */}
        <main className="flex-1 flex flex-col overflow-hidden p-4 gap-3">
          <div className="flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-zinc-700 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto">
            {activeTab === "transcript" && (
              <TranscriptEditor
                value={editedTranscript}
                liveText={liveText}
                onChange={setEditedTranscript}
              />
            )}
            {activeTab === "diff" && (
              <DiffView original={originalTranscript} modified={editedTranscript} />
            )}
            {activeTab === "summary" && (
              <MarkdownPreview content={agentResult} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
