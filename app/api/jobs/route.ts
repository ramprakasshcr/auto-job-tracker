import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { fetchGreenhouseJobs } from "@/lib/greenhouse";
import { fetchLeverJobs } from "@/lib/lever";
import { fetchAshbyJobs } from "@/lib/ashby";

export async function GET() {
  const db = getDb();
  const rows = db.prepare(`
    SELECT
      a.id,
      a.job_id,
      a.status,
      a.notes,
      a.marked_complete,
      a.email_subject,
      a.email_from,
      a.email_date,
      a.updated_at,
      j.greenhouse_id,
      j.title,
      j.job_url,
      j.location,
      j.department,
      j.posted_at,
      j.experience,
      j.fetched_at,
      c.id AS company_id,
      c.name AS company_name,
      c.website_url AS company_website,
      c.greenhouse_slug,
      c.source AS company_source
    FROM applications a
    JOIN jobs j ON a.job_id = j.id
    JOIN companies c ON j.company_id = c.id
    WHERE c.is_active = 1
    ORDER BY j.posted_at DESC NULLS LAST, j.fetched_at DESC
  `).all();

  const lastRefreshed = db.prepare("SELECT value FROM meta WHERE key = 'last_refreshed'").get() as { value: string } | undefined;
  const roleRow = db.prepare("SELECT value FROM meta WHERE key = 'target_role'").get() as { value: string } | undefined;
  const locationRow = db.prepare("SELECT value FROM meta WHERE key = 'target_location'").get() as { value: string } | undefined;

  return NextResponse.json({
    jobs: rows,
    lastRefreshed: lastRefreshed?.value ?? null,
    targetRole: roleRow?.value ?? null,
    targetLocation: locationRow?.value ?? null,
  });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const { companyId } = await req.json().catch(() => ({}));

  // Read user's target role for filtering
  const roleRow = db.prepare("SELECT value FROM meta WHERE key = 'target_role'").get() as { value: string } | undefined;
  const targetRole = roleRow?.value ?? "";
  const keywords = targetRole
    ? targetRole.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const companies = (
    companyId
      ? db.prepare("SELECT * FROM companies WHERE id = ? AND is_active = 1").all(companyId)
      : db.prepare("SELECT * FROM companies WHERE is_active = 1").all()
  ) as { id: number; greenhouse_slug: string; source: string }[];

  const insertJob = db.prepare(`
    INSERT INTO jobs (greenhouse_id, company_id, title, job_url, location, department, posted_at, experience, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(greenhouse_id) DO UPDATE SET
      posted_at = excluded.posted_at WHERE posted_at IS NULL
  `);
  const updateExperience = db.prepare(`
    UPDATE jobs SET experience = ? WHERE greenhouse_id = ? AND experience IS NULL
  `);
  const insertApp = db.prepare(`
    INSERT OR IGNORE INTO applications (job_id) VALUES (?)
  `);
  const getJobId = db.prepare("SELECT id FROM jobs WHERE greenhouse_id = ?");

  let newCount = 0;
  const BATCH = 5;

  for (let i = 0; i < companies.length; i += BATCH) {
    const batch = companies.slice(i, i + BATCH);

    const results = await Promise.all(
      batch.map((c) => {
        const src = c.source ?? "greenhouse";
        if (src === "lever") return fetchLeverJobs(c.greenhouse_slug, keywords);
        if (src === "ashby") return fetchAshbyJobs(c.greenhouse_slug, keywords);
        return fetchGreenhouseJobs(c.greenhouse_slug, keywords);
      })
    );

    const upsert = db.transaction(() => {
      for (let j = 0; j < batch.length; j++) {
        const company = batch[j];
        const jobs = results[j];
        const src = company.source ?? "greenhouse";
        for (const job of jobs) {
          insertJob.run(
            job.greenhouse_id, company.id, job.title, job.job_url,
            job.location, job.department, job.posted_at, job.experience, src
          );
          if (job.experience) updateExperience.run(job.experience, job.greenhouse_id);
          const existing = getJobId.get(job.greenhouse_id) as { id: number };
          const appResult = insertApp.run(existing.id);
          if (appResult.changes > 0) newCount++;
        }
      }
    });
    upsert();

    if (i + BATCH < companies.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('last_refreshed', ?)").run(new Date().toISOString());

  return NextResponse.json({ ok: true, newJobs: newCount });
}
