"use client";

import { useState } from "react";

type Source = "greenhouse" | "lever" | "ashby";

const SOURCE_INFO: Record<Source, { label: string; hint: string }> = {
  greenhouse: {
    label: "Greenhouse",
    hint: "boards-api.greenhouse.io/v1/boards/{slug}/jobs",
  },
  lever: {
    label: "Lever",
    hint: "api.lever.co/v0/postings/{slug}",
  },
  ashby: {
    label: "Ashby",
    hint: "boards-api.ashbyhq.com/posting-public/job-board?organizationHostedJobsPageName={slug}",
  },
};

interface Props {
  onClose: () => void;
  onAdded: () => void;
}

export default function AddCompanyModal({ onClose, onAdded }: Props) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [website, setWebsite] = useState("");
  const [source, setSource] = useState<Source>("greenhouse");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, website, source }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add company");
        return;
      }

      const company = data.company as { id: number };
      await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: company.id }),
      });

      onAdded();
      onClose();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white mb-1">Add Company</h2>
        <p className="text-xs text-zinc-500 mb-5">Jobs will be fetched immediately after adding.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Source selector */}
          <div>
            <label className="block text-xs text-zinc-400 mb-2">Job board source</label>
            <div className="grid grid-cols-3 gap-1.5 bg-zinc-800 p-1 rounded-xl">
              {(Object.keys(SOURCE_INFO) as Source[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSource(s)}
                  className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    source === s
                      ? "bg-zinc-700 text-white shadow"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {SOURCE_INFO[s].label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Company Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Stripe"
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-blue-500 placeholder:text-zinc-600"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">
              Slug
              <span className="ml-1 text-zinc-600 font-normal">
                ({SOURCE_INFO[source].hint})
              </span>
            </label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().trim())}
              placeholder="e.g. stripe"
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white font-mono outline-none focus:border-blue-500 placeholder:text-zinc-600"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Website URL (optional)</label>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://company.com"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-blue-500 placeholder:text-zinc-600"
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 text-sm hover:border-zinc-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              {loading ? "Adding…" : "Add & Fetch"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
