"use client";

import { StatusBadge, STATUS_OPTIONS } from "./StatusBadge";

export interface JobRow {
  id: number;
  job_id: number;
  status: string;
  notes: string | null;
  marked_complete: number;
  email_subject: string | null;
  email_from: string | null;
  email_date: string | null;
  updated_at: string;
  greenhouse_id: string;
  title: string;
  job_url: string;
  location: string | null;
  department: string | null;
  posted_at: string | null;
  experience: string | null;
  fetched_at: string;
  company_id: number;
  company_name: string;
  company_website: string | null;
  greenhouse_slug: string;
}

interface Props {
  jobs: JobRow[];
  onStatusChange: (id: number, status: string) => void;
  onMarkComplete: (id: number) => void;
}

function LocationCell({ location }: { location: string | null }) {
  if (!location) return <span className="text-zinc-600">—</span>;
  const parts = location.split(";").map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 1) return <span>{location}</span>;
  return (
    <div className="group/loc relative inline-block">
      <span className="text-blue-400 cursor-default underline decoration-dotted underline-offset-2">
        Multiple ({parts.length})
      </span>
      <div className="absolute left-0 top-full mt-1.5 z-50 hidden group-hover/loc:block w-56 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl p-2">
        <ul className="space-y-1">
          {parts.map((p, i) => (
            <li key={i} className="text-xs text-zinc-300 px-1.5 py-0.5 rounded hover:bg-zinc-700">
              {p}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysAgo(iso: string | null) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function JobsTable({ jobs, onStatusChange, onMarkComplete }: Props) {
  if (jobs.length === 0) {
    return (
      <div className="text-center py-20 text-zinc-500">
        <p className="text-lg">No jobs found</p>
        <p className="text-sm mt-1">Click &quot;Refresh Jobs&quot; to fetch PM roles from Greenhouse</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-left">
            <th className="pb-3 pr-4 text-xs font-medium text-zinc-500 uppercase tracking-wide">Company</th>
            <th className="pb-3 pr-4 text-xs font-medium text-zinc-500 uppercase tracking-wide">Role</th>
            <th className="pb-3 pr-4 text-xs font-medium text-zinc-500 uppercase tracking-wide hidden xl:table-cell">Exp. Required</th>
            <th className="pb-3 pr-4 text-xs font-medium text-zinc-500 uppercase tracking-wide hidden md:table-cell">Location</th>
            <th className="pb-3 pr-4 text-xs font-medium text-zinc-500 uppercase tracking-wide hidden sm:table-cell">Date Listed</th>
            <th className="pb-3 pr-4 text-xs font-medium text-zinc-500 uppercase tracking-wide">Status</th>
            <th className="pb-3 pr-4 text-xs font-medium text-zinc-500 uppercase tracking-wide hidden lg:table-cell">Email</th>
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">
          {jobs.map((job) => (
            <tr
              key={job.id}
              className={`group h-[53px] transition-colors hover:bg-zinc-800/30 ${
                job.marked_complete ? "opacity-40" : ""
              }`}
            >
              <td className="py-3 pr-4">
                {job.company_website ? (
                  <a
                    href={job.company_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white font-medium hover:text-blue-400 transition-colors"
                  >
                    {job.company_name}
                  </a>
                ) : (
                  <span className="text-white font-medium">{job.company_name}</span>
                )}
              </td>

              <td className="py-3 pr-4 max-w-xs overflow-hidden">
                <a
                  href={job.job_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={job.title}
                  className="text-zinc-200 hover:text-blue-400 transition-colors truncate block"
                >
                  {job.title}
                </a>
                {job.department && (
                  <p className="text-xs text-zinc-600 truncate">{job.department}</p>
                )}
              </td>

              <td className="py-3 pr-4 hidden xl:table-cell">
                {job.experience ? (
                  <div className="group/exp relative inline-block">
                    <span className="text-xs text-zinc-400 whitespace-nowrap cursor-default underline decoration-dotted underline-offset-2">
                      {job.experience.match(/^\d+\+?\s*(?:[-–]\s*\d+\+?)?\s*years?/i)?.[0] ?? job.experience}
                    </span>
                    <div className="absolute left-0 top-full mt-1.5 z-50 hidden group-hover/exp:block w-64 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl p-2">
                      <p className="text-xs text-zinc-300 px-1.5 py-0.5">{job.experience}</p>
                    </div>
                  </div>
                ) : (
                  <span className="text-zinc-700 text-xs">—</span>
                )}
              </td>

              <td className="py-3 pr-4 text-zinc-400 hidden md:table-cell whitespace-nowrap text-xs">
                <LocationCell location={job.location} />
              </td>

              <td className="py-3 pr-4 hidden sm:table-cell whitespace-nowrap">
                <p className="text-zinc-300 text-xs">{formatDate(job.posted_at)}</p>
                {daysAgo(job.posted_at) && (
                  <p className="text-zinc-600 text-xs mt-0.5">{daysAgo(job.posted_at)}</p>
                )}
              </td>

              <td className="py-3 pr-4">
                <div className="flex items-center gap-2">
                  <StatusBadge status={job.status} />
                  <select
                    value={job.status}
                    onChange={(e) => onStatusChange(job.id, e.target.value)}
                    className="bg-transparent text-zinc-600 text-xs border-0 outline-none cursor-pointer hover:text-zinc-300 transition-colors"
                    aria-label="Change status"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s} className="bg-zinc-900">
                        {s.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </td>

              <td className="py-3 pr-4 hidden lg:table-cell">
                {job.email_subject ? (
                  <div className="max-w-[200px]">
                    <p className="text-xs text-zinc-300 truncate" title={job.email_subject}>
                      {job.email_subject}
                    </p>
                    <p className="text-xs text-zinc-600 mt-0.5">
                      {job.email_from?.split("@")[1] ?? job.email_from}
                      {job.email_date && ` · ${new Date(job.email_date).toLocaleDateString()}`}
                    </p>
                  </div>
                ) : (
                  <span className="text-zinc-700 text-xs">—</span>
                )}
              </td>

              <td className="py-3">
                {!job.marked_complete ? (
                  <button
                    onClick={() => onMarkComplete(job.id)}
                    className="text-xs text-zinc-500 hover:text-green-400 transition-colors whitespace-nowrap border border-zinc-700 hover:border-green-700 rounded px-2 py-1"
                  >
                    ✓ Complete
                  </button>
                ) : (
                  <button
                    onClick={() => onMarkComplete(job.id)}
                    className="text-xs text-zinc-700 hover:text-zinc-400 transition-colors border border-zinc-800 rounded px-2 py-1"
                  >
                    Undo
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
