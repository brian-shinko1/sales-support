"use client";

import { useEffect, useState } from "react";
import { Settings, Plus, X } from "lucide-react";
import type { FrozenContext, MeetingContext, TeamMember } from "@/types";

const FROZEN_KEY = "sales-support-profile";
const MEETING_KEY = "sales-support-meeting";

const INPUT = "bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 min-w-0 flex-1";

function TeamEditor({ members = [], onChange }: { members?: TeamMember[]; onChange: (m: TeamMember[]) => void }) {
  const add = () => onChange([...members, { name: "", role: "" }]);
  const remove = (i: number) => onChange(members.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<TeamMember>) => {
    const next = [...members];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-1.5">
      {members.map((m, i) => (
        <div key={i} className="flex gap-1 items-center">
          <input className={INPUT} placeholder="Name" value={m.name} onChange={(e) => update(i, { name: e.target.value })} />
          <input className={INPUT} placeholder="Role" value={m.role} onChange={(e) => update(i, { role: e.target.value })} />
          <button onClick={() => remove(i)} className="text-zinc-600 hover:text-red-400 transition-colors shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button
        onClick={add}
        className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mt-0.5"
      >
        <Plus className="w-3 h-3" /> Add member
      </button>
    </div>
  );
}

interface Props {
  frozen: FrozenContext;
  meeting: MeetingContext;
  onFrozenChange: (ctx: FrozenContext) => void;
  onMeetingChange: (ctx: MeetingContext) => void;
}

export function ContextPanel({ frozen, meeting, onFrozenChange, onMeetingChange }: Props) {
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    try {
      const f = localStorage.getItem(FROZEN_KEY);
      if (f) onFrozenChange({ company: "", team: [], ...JSON.parse(f) });
    } catch {}
    try {
      const m = localStorage.getItem(MEETING_KEY);
      if (m) onMeetingChange({ customerCompany: "", vendorName: "", purpose: "", customerTeam: [], vendorTeam: [], ...JSON.parse(m) });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateFrozen = (next: FrozenContext) => {
    onFrozenChange(next);
    localStorage.setItem(FROZEN_KEY, JSON.stringify(next));
  };

  const updateMeeting = (next: MeetingContext) => {
    onMeetingChange(next);
    localStorage.setItem(MEETING_KEY, JSON.stringify(next));
  };

  return (
    <>
      {profileOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setProfileOpen(false)}
        >
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md flex flex-col gap-5 shadow-2xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="font-semibold text-zinc-100">Your Profile</p>
              <button onClick={() => setProfileOpen(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs text-zinc-500">Company</p>
              <input
                className={INPUT}
                placeholder="Your company name"
                value={frozen.company}
                onChange={(e) => updateFrozen({ ...frozen, company: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs text-zinc-500">Your team</p>
              <TeamEditor members={frozen.team} onChange={(team) => updateFrozen({ ...frozen, team })} />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Context</p>
          <button
            onClick={() => setProfileOpen(true)}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <Settings className="w-3 h-3" />
            {frozen.company || frozen.team.length > 0 ? frozen.company || "Profile" : "Set profile"}
          </button>
        </div>

        <input
          className={INPUT}
          placeholder="Customer company"
          value={meeting.customerCompany}
          onChange={(e) => updateMeeting({ ...meeting, customerCompany: e.target.value })}
        />
        <input
          className={INPUT}
          placeholder="Vendor / partner company"
          value={meeting.vendorName}
          onChange={(e) => updateMeeting({ ...meeting, vendorName: e.target.value })}
        />
        <input
          className={INPUT}
          placeholder="Meeting purpose"
          value={meeting.purpose}
          onChange={(e) => updateMeeting({ ...meeting, purpose: e.target.value })}
        />

        <p className="text-xs text-zinc-500 mt-1">Customer team</p>
        <TeamEditor
          members={meeting.customerTeam}
          onChange={(customerTeam) => updateMeeting({ ...meeting, customerTeam })}
        />

        <p className="text-xs text-zinc-500 mt-1">Vendor / partner team</p>
        <TeamEditor
          members={meeting.vendorTeam}
          onChange={(vendorTeam) => updateMeeting({ ...meeting, vendorTeam })}
        />
      </div>
    </>
  );
}
