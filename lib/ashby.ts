import { matchesRole, extractExperience, FetchedJob } from "./greenhouse";

interface AshbyPosting {
  id: string;
  title: string;
  jobUrl: string;
  locationName?: string;
  departmentName?: string;
  publishedDate?: string;
  descriptionHtml?: string;
}

interface AshbyResponse {
  jobPostings?: AshbyPosting[];
}

export async function fetchAshbyJobs(slug: string, keywords: string[]): Promise<FetchedJob[]> {
  try {
    const res = await fetch(
      `https://boards-api.ashbyhq.com/posting-public/job-board?organizationHostedJobsPageName=${slug}`,
      { signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) return [];
    const data: AshbyResponse = await res.json();
    return (data.jobPostings ?? [])
      .filter((p) => matchesRole(p.title, keywords))
      .map((p) => ({
        greenhouse_id: `ashby_${p.id}`,
        title: p.title,
        job_url: p.jobUrl,
        location: p.locationName ?? "",
        department: p.departmentName ?? "",
        posted_at: p.publishedDate ?? null,
        experience: extractExperience(p.descriptionHtml ?? null),
      }));
  } catch {
    return [];
  }
}
