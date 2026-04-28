import type { FrozenContext, MeetingContext } from "@/types";

export const AIRIA_URL =
  "https://prodaus.api.airia.ai/v2/PipelineExecution/83333fc0-b50e-451c-bfe3-d19967ff5349";

export const AIRIA_EDIT_URL =
  "https://prodaus.api.airia.ai/v2/PipelineExecution/9bf12c82-e135-47a1-99ae-06c7a6c4e506";

export const AIRIA_SUMMARISE_URL =
  "https://prodaus.api.airia.ai/v2/PipelineExecution/f8542ab1-cb91-45f8-8053-1b65df3edb7e";

export function buildDiarizeInput(
  rawTranscript: string,
  frozen?: Partial<FrozenContext>,
  meeting?: Partial<MeetingContext>,
): string {
  const lines: string[] = ["MEETING CONTEXT:"];

  // Participants — each line includes Name, Role, and Company
  const participants: string[] = [];
  frozen?.team?.forEach((m) => {
    const company = frozen.company || "Our Company";
    participants.push(`  - ${m.name} – ${m.role} | ${company}`);
  });
  meeting?.customerTeam?.forEach((m) => {
    const company = meeting.customerCompany || "Customer";
    participants.push(`  - ${m.name} – ${m.role} | ${company}`);
  });
  meeting?.vendorTeam?.forEach((m) => {
    const company = meeting.vendorName || "Vendor";
    participants.push(`  - ${m.name} – ${m.role} | ${company}`);
  });

  if (participants.length > 0) {
    lines.push("  Participants (Name – Role | Company):");
    lines.push(...participants);
  }

  // Basic info
  const info: string[] = [];
  if (meeting?.purpose) info.push(`Meeting purpose: ${meeting.purpose}`);
  if (frozen?.company) info.push(`Our company: ${frozen.company}`);
  if (meeting?.customerCompany) info.push(`Customer company: ${meeting.customerCompany}`);
  if (meeting?.vendorName) info.push(`Vendor / partner company: ${meeting.vendorName}`);

  if (info.length > 0) {
    lines.push("  Basic info:");
    info.forEach((i) => lines.push(`  ${i}`));
  }

  lines.push(
    "  Output format: [Speaker Name (Company)]: dialogue",
    "",
    "TRANSCRIPT:",
    rawTranscript,
  );
  return lines.join("\n");
}

export function buildUserInput(
  prompt: string,
  transcript: string,
  frozen?: Partial<FrozenContext>,
  meeting?: Partial<MeetingContext>,
): string {
  const lines: string[] = [];

  const hasContext =
    frozen?.company || (frozen?.team?.length ?? 0) > 0 ||
    meeting?.customerCompany || meeting?.vendorName || meeting?.purpose ||
    (meeting?.customerTeam?.length ?? 0) > 0 || (meeting?.vendorTeam?.length ?? 0) > 0;

  if (hasContext) {
    lines.push("[CONTEXT]");
    if (frozen?.company) lines.push(`Our company: ${frozen.company}`);
    if (frozen?.team?.length) {
      lines.push("Our team:");
      frozen.team.forEach((m) => lines.push(`  - ${m.name}${m.role ? ` (${m.role})` : ""}`));
    }
    if (meeting?.customerCompany) lines.push(`Customer company: ${meeting.customerCompany}`);
    if (meeting?.customerTeam?.length) {
      lines.push("Customer team:");
      meeting.customerTeam.forEach((m) => lines.push(`  - ${m.name}${m.role ? ` (${m.role})` : ""}`));
    }
    if (meeting?.vendorName) lines.push(`Vendor / partner company: ${meeting.vendorName}`);
    if (meeting?.vendorTeam?.length) {
      lines.push("Vendor / partner team:");
      meeting.vendorTeam.forEach((m) => lines.push(`  - ${m.name}${m.role ? ` (${m.role})` : ""}`));
    }
    if (meeting?.purpose) lines.push(`Meeting purpose: ${meeting.purpose}`);
    lines.push("");
  }

  lines.push("[TASK]", prompt, "", "[TRANSCRIPT]", transcript);
  return lines.join("\n");
}

export async function callAiriaAt(apiKey: string, url: string, userInput: string): Promise<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ userInput, asyncOutput: true }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Airia error ${res.status}:`, body.slice(0, 500));
    throw new Error(`Airia ${res.status}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (!data || data === "[DONE]") continue;

      let msg: Record<string, unknown>;
      try { msg = JSON.parse(data); } catch { continue; }

      if (msg.type === "AgentEndMessage") {
        const final = (msg.result ?? msg.output ?? msg.text) as string | undefined;
        return final ?? result;
      }
      if (msg.type === "AgentModelStreamFragmentMessage") {
        result += (msg.fragment ?? msg.content ?? msg.text ?? "") as string;
      }
    }
  }

  return result;
}

export async function callAiria(apiKey: string, userInput: string): Promise<string> {
  return callAiriaAt(apiKey, AIRIA_URL, userInput);
}

export function formatSummaryAsMarkdown(raw: string): string {
  let parsed: Record<string, unknown>;
  try {
    // Strip markdown code fences if the model wraps the JSON
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return raw; // Not JSON — return as-is
  }

  const lines: string[] = [];

  // Summary
  if (parsed.summary) {
    lines.push("## Summary", "", String(parsed.summary), "");
  }

  // Participants
  const participants = parsed.participants as { name: string; role: string }[] | undefined;
  if (participants?.length) {
    lines.push("## Participants", "");
    lines.push("| Name | Role |", "|------|------|");
    participants.forEach((p) => lines.push(`| ${p.name} | ${p.role || "—"} |`));
    lines.push("");
  }

  // What went well
  const wentWell = parsed.what_went_well as string[] | undefined;
  if (wentWell?.length) {
    lines.push("## What Went Well", "");
    wentWell.forEach((item) => lines.push(`- ${item}`));
    lines.push("");
  }

  // What needs work
  const needsWork = parsed.what_needs_work as string[] | undefined;
  if (needsWork?.length) {
    lines.push("## What Needs Work", "");
    needsWork.forEach((item) => lines.push(`- ${item}`));
    lines.push("");
  }

  // What is not needed
  const notNeeded = parsed.what_is_not_needed as string[] | undefined;
  if (notNeeded?.length) {
    lines.push("## What Is Not Needed", "");
    notNeeded.forEach((item) => lines.push(`- ${item}`));
    lines.push("");
  }

  // Existing solutions
  const solutions = parsed.existing_solutions_to_use as { solution: string; context: string }[] | undefined;
  if (solutions?.length) {
    lines.push("## Existing Solutions to Use", "");
    solutions.forEach((s) => lines.push(`- **${s.solution}**: ${s.context}`));
    lines.push("");
  }

  // Next steps
  const nextSteps = parsed.next_steps as { action: string; owner: string; due: string }[] | undefined;
  if (nextSteps?.length) {
    lines.push("## Next Steps", "");
    lines.push("| Action | Owner | Due |", "|--------|-------|-----|");
    nextSteps.forEach((s) => lines.push(`| ${s.action} | ${s.owner} | ${s.due} |`));
    lines.push("");
  }

  // Condensed transcript
  if (parsed.transcript_condensed) {
    lines.push("## Condensed Transcript", "", String(parsed.transcript_condensed), "");
  }

  return lines.join("\n").trim();
}
