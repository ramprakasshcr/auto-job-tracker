import { matchesRole, extractExperience, FetchedJob } from "./greenhouse";

interface LeverPosting {
  id: string;
  text: string;
  hostedUrl: string;
  createdAt: number;
  categories?: {
    location?: string;
    department?: string;
    team?: string;
  };
  content?: {
    descriptionHtml?: string;
    descriptionPlain?: string;
  };
}

export async function fetchLeverJobs(slug: string, keywords: string[]): Promise<FetchedJob[]> {
  try {
    const res = await fetch(
      `https://api.lever.co/v0/postings/${slug}?mode=json`,
      { signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) return [];
    const data: LeverPosting[] = await res.json();
    if (!Array.isArray(data)) return [];
    return data
      .filter((p) => matchesRole(p.text, keywords))
      .map((p) => ({
        greenhouse_id: `lever_${p.id}`,
        title: p.text,
        job_url: p.hostedUrl,
        location: p.categories?.location ?? "",
        department: p.categories?.department ?? p.categories?.team ?? "",
        posted_at: p.createdAt ? new Date(p.createdAt).toISOString() : null,
        experience: extractExperience(p.content?.descriptionHtml ?? p.content?.descriptionPlain ?? null),
      }));
  } catch {
    return [];
  }
}
