export type Tab = "transcript" | "diff" | "summary";

export interface AppState {
  originalTranscript: string;
  editedTranscript: string;
  liveText: string;
  isTranscribing: boolean;
  isLive: boolean;
  agentResult: string;
  isAgentRunning: boolean;
  activeTab: Tab;
  driveToken: string | null;
  isSaving: boolean;
  savedFileUrl: string | null;
}
