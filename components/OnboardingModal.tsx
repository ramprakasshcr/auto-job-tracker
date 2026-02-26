"use client";

import { useState } from "react";

const ROLE_SUGGESTIONS = [
  "Product Manager",
  "Software Engineer",
  "Data Scientist",
  "UX Designer",
  "Engineering Manager",
  "Marketing Manager",
  "Sales",
];

const LOCATION_SUGGESTIONS = ["Remote", "San Francisco", "New York", "Austin", "London", "Seattle"];

interface Props {
  onComplete: () => void;
}

export default function OnboardingModal({ onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleComplete() {
    setSaving(true);
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetRole: role.trim(), targetLocation: location.trim() }),
    });
    onComplete();
  }

  return (
    <div className="fixed inset-0 bg-zinc-950 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`rounded-full transition-all duration-300 ${
                s < step
                  ? "w-6 h-1.5 bg-blue-500"
                  : s === step
                  ? "w-8 h-1.5 bg-blue-500"
                  : "w-4 h-1.5 bg-zinc-800"
              }`}
            />
          ))}
        </div>

        {/* Step 1 — Role */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="mb-8">
              <p className="text-xs font-medium text-blue-400 uppercase tracking-widest mb-3">
                Step 1 of 3
              </p>
              <h1 className="text-4xl font-bold text-white mb-3 leading-tight">
                What role are you
                <br />
                <span className="text-zinc-400">looking for?</span>
              </h1>
              <p className="text-zinc-500 text-sm">
                We'll scan Greenhouse, Lever, and Ashby boards across 200+ companies and surface only what's relevant to you.
              </p>
            </div>

            <input
              autoFocus
              value={role}
              onChange={(e) => setRole(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && role.trim() && setStep(2)}
              placeholder="e.g. Product Manager"
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-blue-500 rounded-2xl px-5 py-4 text-white text-lg outline-none transition-colors placeholder:text-zinc-600 mb-4"
            />

            <div className="flex flex-wrap gap-2 mb-10">
              {ROLE_SUGGESTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    role === r
                      ? "border-blue-500 text-blue-400 bg-blue-500/10"
                      : "border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!role.trim()}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-25 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-2xl transition-all text-base"
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step 2 — Location */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="mb-8">
              <p className="text-xs font-medium text-blue-400 uppercase tracking-widest mb-3">
                Step 2 of 3
              </p>
              <h1 className="text-4xl font-bold text-white mb-3 leading-tight">
                Any location
                <br />
                <span className="text-zinc-400">preference?</span>
              </h1>
              <p className="text-zinc-500 text-sm">
                Optional. You can also filter by location later in the dashboard.
              </p>
            </div>

            <input
              autoFocus
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setStep(3)}
              placeholder="e.g. Remote, San Francisco… (or leave blank)"
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-blue-500 rounded-2xl px-5 py-4 text-white outline-none transition-colors placeholder:text-zinc-600 mb-4"
            />

            <div className="flex flex-wrap gap-2 mb-10">
              {LOCATION_SUGGESTIONS.map((l) => (
                <button
                  key={l}
                  onClick={() => setLocation(location === l ? "" : l)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    location === l
                      ? "border-blue-500 text-blue-400 bg-blue-500/10"
                      : "border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-300 font-medium py-4 rounded-2xl transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-[3] bg-blue-600 hover:bg-blue-500 text-white font-semibold py-4 rounded-2xl transition-colors"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Confirm */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 text-center">
            <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">✓</span>
            </div>

            <p className="text-xs font-medium text-blue-400 uppercase tracking-widest mb-3">
              Step 3 of 3
            </p>
            <h1 className="text-4xl font-bold text-white mb-3">You're all set.</h1>
            <p className="text-zinc-500 text-sm mb-8">
              Here's what we'll track for you.
            </p>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-left mb-8 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500">Role</span>
                <span className="text-sm text-white font-medium">{role}</span>
              </div>
              <div className="h-px bg-zinc-800" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500">Location</span>
                <span className="text-sm text-white font-medium">{location || "Any"}</span>
              </div>
              <div className="h-px bg-zinc-800" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500">Sources</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">Greenhouse</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">Lever</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">Ashby</span>
                </div>
              </div>
              <div className="h-px bg-zinc-800" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500">Auto-refresh</span>
                <span className="text-sm text-white font-medium">Every 30 minutes</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-300 font-medium py-4 rounded-2xl transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={handleComplete}
                disabled={saving}
                className="flex-[3] bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl transition-colors"
              >
                {saving ? "Setting up…" : "Start Tracking →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
