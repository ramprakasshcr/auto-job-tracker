// ── Shared utilities (also used by lever.ts / ashby.ts) ───────────────────

export function matchesRole(title: string, keywords: string[]): boolean {
  if (keywords.length === 0) return true;
  const lower = title.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase().trim()));
}

export function extractExperience(html: string | null): string | null {
  if (!html) return null;
  const text = html
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

  const m = text.match(/(\d+\+?\s*(?:[-–]\s*\d+\+?)?\s*years?(?:\s+of(?:\s+\w+){0,4})?)/i);
  if (!m) return null;
  const raw = m[0].trim();
  return raw.length > 45 ? raw.slice(0, 42) + "…" : raw;
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface FetchedJob {
  greenhouse_id: string;
  title: string;
  job_url: string;
  location: string;
  department: string;
  posted_at: string | null;
  experience: string | null;
}

// ── Greenhouse fetcher ─────────────────────────────────────────────────────

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  location: { name: string };
  departments: { name: string }[];
  first_published: string | null;
  updated_at: string | null;
  content: string | null;
}

interface GreenhouseResponse {
  jobs: GreenhouseJob[];
}

export async function fetchGreenhouseJobs(slug: string, keywords: string[]): Promise<FetchedJob[]> {
  try {
    const res = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`,
      { signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) return [];
    const data: GreenhouseResponse = await res.json();
    return data.jobs
      .filter((job) => matchesRole(job.title, keywords))
      .map((job) => ({
        greenhouse_id: String(job.id),
        title: job.title,
        job_url: job.absolute_url,
        location: job.location?.name ?? "",
        department: job.departments?.[0]?.name ?? "",
        posted_at: job.first_published ?? job.updated_at ?? null,
        experience: extractExperience(job.content),
      }));
  } catch {
    return [];
  }
}

/** @deprecated kept for any old imports */
export const fetchPmJobs = fetchGreenhouseJobs;
