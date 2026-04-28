import type { FrozenContext, MeetingContext } from "@/types";

export const AIRIA_URL =
  "https://prodaus.api.airia.ai/v2/PipelineExecution/83333fc0-b50e-451c-bfe3-d19967ff5349";

export const AIRIA_EDIT_URL =
  "https://prodaus.api.airia.ai/v2/PipelineExecution/9bf12c82-e135-47a1-99ae-06c7a6c4e506";

export const AIRIA_SUMMARISE_URL =
  "https://prodaus.api.airia.ai/v2/PipelineExecution/79c508cb-b41d-43c0-991c-2a4bf55eb829";

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

    const chunk = decoder.decode(value, { stream: true });
    buffer += chunk;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (!data || data === "[DONE]") continue;

      let msg: Record<string, unknown>;
      try { msg = JSON.parse(data); } catch { continue; }

      if (msg.MessageType === "AgentEndMessage") return result;
      if (msg.MessageType === "ModelStreamFragment") {
        result += (msg.Content ?? "") as string;
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
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return raw;
  }

  const lines: string[] = [];

  if (parsed.summary) {
    lines.push("## Summary", "", String(parsed.summary), "");
  }

  if (parsed.deal_temperature) {
    lines.push(`**Deal Temperature:** ${parsed.deal_temperature}`, "");
  }

  const participants = parsed.participants as { name: string; role: string; company_side?: string }[] | undefined;
  if (participants?.length) {
    lines.push("## Participants", "");
    lines.push("| Name | Role | Side |", "|------|------|------|");
    participants.forEach((p) => lines.push(`| ${p.name} | ${p.role || "—"} | ${p.company_side || "—"} |`));
    lines.push("");
  }

  const profile = parsed.customer_profile as { company_context?: string; team_structure?: string } | undefined;
  if (profile?.company_context || profile?.team_structure) {
    lines.push("## Customer Profile", "");
    if (profile.company_context) lines.push(profile.company_context, "");
    if (profile.team_structure) lines.push("**Team:** " + profile.team_structure, "");
  }

  const discovery = parsed.discovery_answers as { topic: string; customer_answer: string; identified_gap?: string; gap_strength?: string }[] | undefined;
  if (discovery?.length) {
    lines.push("## Discovery", "");
    discovery.forEach((d) => {
      lines.push(`### ${d.topic}`, "");
      lines.push(d.customer_answer, "");
      if (d.identified_gap) lines.push(`**Gap:** ${d.identified_gap}`, "");
      if (d.gap_strength) lines.push(`**Gap Strength:** ${d.gap_strength}`, "");
    });
  }

  const working = parsed.whats_working as string[] | undefined;
  if (working?.length) {
    lines.push("## What's Working", "");
    working.forEach((item) => lines.push(`- ${item}`));
    lines.push("");
  }

  const notWorking = parsed.whats_not_working as string[] | undefined;
  if (notWorking?.length) {
    lines.push("## What's Not Working", "");
    notWorking.forEach((item) => lines.push(`- ${item}`));
    lines.push("");
  }

  const buyingSignals = parsed.buying_signals as { signal: string; type: string; strength: string }[] | undefined;
  if (buyingSignals?.length) {
    lines.push("## Buying Signals", "");
    buyingSignals.forEach((b) => lines.push(`- **[${b.type} — ${b.strength}]** ${b.signal}`));
    lines.push("");
  }

  const objections = parsed.objections_and_concerns as string[] | undefined;
  if (objections?.length) {
    lines.push("## Objections & Concerns", "");
    objections.forEach((item) => lines.push(`- ${item}`));
    lines.push("");
  }

  const questions = parsed.anticipated_customer_questions as { question: string; why_likely?: string; suggested_angle?: string }[] | undefined;
  if (questions?.length) {
    lines.push("## Anticipated Customer Questions", "");
    questions.forEach((q) => {
      lines.push(`**Q: ${q.question}**`, "");
      if (q.suggested_angle) lines.push(`*Angle:* ${q.suggested_angle}`, "");
    });
  }

  const competitors = parsed.competitors_and_incumbents_mentioned as { name: string; context: string; sentiment?: string }[] | undefined;
  if (competitors?.length) {
    lines.push("## Competitors Mentioned", "");
    competitors.forEach((c) => lines.push(`- **${c.name}:** ${c.context}`));
    lines.push("");
  }

  const followUps = parsed.follow_up_questions_to_ask as string[] | undefined;
  if (followUps?.length) {
    lines.push("## Follow-up Questions to Ask", "");
    followUps.forEach((q) => lines.push(`- ${q}`));
    lines.push("");
  }

  const nextSteps = parsed.next_steps as { action: string; owner: string; due: string }[] | undefined;
  if (nextSteps?.length) {
    lines.push("## Next Steps", "");
    lines.push("| Action | Owner | Due |", "|--------|-------|-----|");
    nextSteps.forEach((s) => lines.push(`| ${s.action} | ${s.owner} | ${s.due} |`));
    lines.push("");
  }

  const roadmap = parsed.roadmap_and_priorities as { six_months?: string[]; twelve_months?: string[]; eighteen_months_plus?: string[]; growth_signals?: string[] } | undefined;
  if (roadmap) {
    lines.push("## Roadmap & Priorities", "");
    if (roadmap.six_months?.length) {
      lines.push("**6 Months**", "");
      roadmap.six_months.forEach((item) => lines.push(`- ${item}`));
      lines.push("");
    }
    if (roadmap.twelve_months?.length) {
      lines.push("**12 Months**", "");
      roadmap.twelve_months.forEach((item) => lines.push(`- ${item}`));
      lines.push("");
    }
    if (roadmap.eighteen_months_plus?.length) {
      lines.push("**18+ Months**", "");
      roadmap.eighteen_months_plus.forEach((item) => lines.push(`- ${item}`));
      lines.push("");
    }
    if (roadmap.growth_signals?.length) {
      lines.push("**Growth Signals**", "");
      roadmap.growth_signals.forEach((item) => lines.push(`- ${item}`));
      lines.push("");
    }
  }

  if (parsed.transcript_condensed) {
    lines.push("## Condensed Transcript", "", String(parsed.transcript_condensed), "");
  }

  return lines.join("\n").trim();
}
