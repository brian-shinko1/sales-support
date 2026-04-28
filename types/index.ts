export type Tab = "transcript" | "diff" | "summary";

export interface TeamMember {
  name: string;
  role: string;
}

export interface FrozenContext {
  company: string;
  team: TeamMember[];
}

export interface MeetingContext {
  customerCompany: string;
  vendorName: string;
  purpose: string;
  customerTeam: TeamMember[];
  vendorTeam: TeamMember[];
}

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
