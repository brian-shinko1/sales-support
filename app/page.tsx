"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { UploadPanel } from "@/components/upload-panel";
import { TranscriptEditor } from "@/components/transcript-editor";
import { DiffView } from "@/components/diff-view";
import { MarkdownPreview } from "@/components/markdown-preview";
import { AgentPanel } from "@/components/agent-panel";
import { ContextPanel } from "@/components/context-panel";
import { DriveSaveButton } from "@/components/drive-save-button";
import { useScribeWS } from "@/hooks/use-scribe-ws";
import { useGoogleAuth } from "@/hooks/use-google-auth";
import { cn } from "@/lib/cn";
import type { Tab, FrozenContext, MeetingContext } from "@/types";

export default function Home() {
  const [originalTranscript, setOriginalTranscript] = useState("");
  const [editedTranscript, setEditedTranscript] = useState("");
  const [agentResult, setAgentResult] = useState("");
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("transcript");
  const [frozen, setFrozen] = useState<FrozenContext>({ company: "", team: [] });
  const [meeting, setMeeting] = useState<MeetingContext>({ customerCompany: "", vendorName: "", purpose: "", customerTeam: [], vendorTeam: [] });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { requestToken } = useGoogleAuth();

  const dateSlug = new Date().toISOString().slice(0, 10);

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
      <header className="border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
        <button
          className="md:hidden p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Image
          src="/Shinko1_Kanji_Master_Wordmark_Black-Red.png"
          alt="Shinko1"
          width={120}
          height={32}
          className="invert"
          priority
        />
        <span className="hidden sm:inline text-zinc-600 text-sm">transcribe · edit · summarize</span>
        <a href="/api/auth/logout" className="ml-auto text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Sign out</a>
      </header>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Left sidebar */}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-zinc-950 border-r border-zinc-800 p-4 flex flex-col gap-6 overflow-y-auto transition-transform duration-200",
          "md:relative md:translate-x-0 md:w-64 md:z-auto md:bg-transparent",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="flex items-center justify-between md:hidden">
            <span className="text-sm font-semibold text-zinc-400">Menu</span>
            <button onClick={() => setSidebarOpen(false)} className="text-zinc-500 hover:text-zinc-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <ContextPanel
            frozen={frozen}
            meeting={meeting}
            onFrozenChange={setFrozen}
            onMeetingChange={setMeeting}
          />

          <UploadPanel
            isTranscribing={isTranscribing}
            isRecording={isRecording}
            frozen={frozen}
            meeting={meeting}
            onTranscribing={() => setIsTranscribing(true)}
            onTranscribed={handleTranscribed}
            onStartLive={startLive}
            onStopLive={stopLive}
          />

          <AgentPanel
            transcript={editedTranscript}
            isRunning={isAgentRunning}
            frozen={frozen}
            meeting={meeting}
            onResult={handleAgentResult}
          />

        </aside>

        {/* Center content */}
        <main className="flex-1 flex flex-col overflow-hidden p-3 md:p-4 gap-3 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    activeTab === tab.id
                      ? "bg-zinc-700 text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {activeTab === "transcript" && (
              <DriveSaveButton
                content={editedTranscript}
                filename={`transcript-${dateSlug}.md`}
                label="Save transcript"
                requestToken={requestToken}
              />
            )}
            {activeTab === "diff" && (
              <DriveSaveButton
                content={`# Original\n\n${originalTranscript}\n\n---\n\n# Edited\n\n${editedTranscript}`}
                filename={`transcript-diff-${dateSlug}.md`}
                label="Save diff"
                requestToken={requestToken}
              />
            )}
            {activeTab === "summary" && (
              <DriveSaveButton
                content={agentResult}
                filename={`summary-${dateSlug}.md`}
                label="Save summary"
                requestToken={requestToken}
              />
            )}
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
