"use client";

import { useState } from "react";

type LocType = "all" | "remote" | "hybrid" | "onsite";
type ExpRange = "all" | "0-3" | "3-5" | "5-8" | "8+";
type DateRange = "any" | "7" | "30" | "60";

export interface ProfilePrefs {
  role: string;
  location: string;
  locationType: LocType;
  exp: ExpRange;
  dateWithin: DateRange;
}

interface Props {
  current: ProfilePrefs;
  onSave: (prefs: ProfilePrefs) => void;
  onClose: () => void;
}

const ROLE_SUGGESTIONS = [
  "Product Manager", "Software Engineer", "Data Scientist",
  "UX Designer", "Engineering Manager", "Marketing Manager",
];

const LOC_SUGGESTIONS = ["Remote", "San Francisco", "New York", "Austin", "London", "Seattle"];

function PillSelect<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            value === o.value
              ? "border-blue-500 bg-blue-500/10 text-blue-400"
              : "border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function ProfileModal({ current, onSave, onClose }: Props) {
  const [role, setRole] = useState(current.role);
  const [location, setLocation] = useState(current.location);
  const [locationType, setLocationType] = useState<LocType>(current.locationType);
  const [exp, setExp] = useState<ExpRange>(current.exp);
  const [dateWithin, setDateWithin] = useState<DateRange>(current.dateWithin);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!role.trim()) return;
    setSaving(true);
    const prefs: ProfilePrefs = {
      role: role.trim(),
      location: location.trim(),
      locationType,
      exp,
      dateWithin,
    };
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetRole: prefs.role,
        targetLocation: prefs.location,
        targetLocationType: prefs.locationType,
        targetExp: prefs.exp,
        targetDateWithin: prefs.dateWithin,
      }),
    });
    onSave(prefs);
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-zinc-950/95 z-50 overflow-y-auto">
      <div className="min-h-full flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
          >
            ← Back
          </button>
          <h2 className="text-sm font-semibold text-white">Search Preferences</h2>
          <div className="w-16" />
        </div>

        {/* Content */}
        <div className="flex-1 flex items-start justify-center px-4 py-10">
          <div className="w-full max-w-lg space-y-10">

            {/* Role */}
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
                Target Role
              </p>
              <input
                autoFocus
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Product Manager"
                className="w-full bg-zinc-900 border border-zinc-700 focus:border-blue-500 rounded-2xl px-5 py-3.5 text-white outline-none transition-colors placeholder:text-zinc-600 mb-3"
              />
              <div className="flex flex-wrap gap-2">
                {ROLE_SUGGESTIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      role === r
                        ? "border-blue-500 bg-blue-500/10 text-blue-400"
                        : "border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <p className="text-xs text-zinc-600 mt-2">
                Comma-separate for multiple roles, e.g. "Product Manager, PM"
              </p>
            </div>

            {/* Work type */}
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
                Work Type
              </p>
              <PillSelect<LocType>
                value={locationType}
                onChange={setLocationType}
                options={[
                  { value: "all",    label: "Any" },
                  { value: "remote", label: "Remote" },
                  { value: "hybrid", label: "Hybrid" },
                  { value: "onsite", label: "On-site" },
                ]}
              />
            </div>

            {/* Location */}
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
                Location
                <span className="normal-case font-normal text-zinc-600 ml-1">(optional)</span>
              </p>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, state, or leave blank for any"
                className="w-full bg-zinc-900 border border-zinc-700 focus:border-blue-500 rounded-2xl px-5 py-3.5 text-white outline-none transition-colors placeholder:text-zinc-600 mb-3"
              />
              <div className="flex flex-wrap gap-2">
                {LOC_SUGGESTIONS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLocation(location === l ? "" : l)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      location === l
                        ? "border-blue-500 bg-blue-500/10 text-blue-400"
                        : "border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Experience range */}
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
                Experience Range
              </p>
              <PillSelect<ExpRange>
                value={exp}
                onChange={setExp}
                options={[
                  { value: "all", label: "Any" },
                  { value: "0-3", label: "0–3 years" },
                  { value: "3-5", label: "3–5 years" },
                  { value: "5-8", label: "5–8 years" },
                  { value: "8+",  label: "8+ years" },
                ]}
              />
              <p className="text-xs text-zinc-600 mt-2">
                Filters roles by the years of experience they require
              </p>
            </div>

            {/* Listing freshness */}
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
                Listing Freshness
              </p>
              <PillSelect<DateRange>
                value={dateWithin}
                onChange={setDateWithin}
                options={[
                  { value: "any", label: "Any time" },
                  { value: "7",   label: "Last 7 days" },
                  { value: "30",  label: "Last 30 days" },
                  { value: "60",  label: "Last 60 days" },
                ]}
              />
              <p className="text-xs text-zinc-600 mt-2">
                Only show listings posted within this window
              </p>
            </div>

            {/* Divider + save */}
            <div className="border-t border-zinc-800 pt-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-zinc-600">
                  Sources: <span className="text-zinc-500">Greenhouse · Lever · Ashby</span>
                </p>
                <p className="text-xs text-zinc-600">
                  Updates every 30 min
                </p>
              </div>
              <button
                onClick={handleSave}
                disabled={saving || !role.trim()}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-2xl transition-colors"
              >
                {saving ? "Saving…" : "Save preferences"}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
