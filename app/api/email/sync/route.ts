import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { syncEmailForCompanies } from "@/lib/email";

export async function POST() {
  const db = getDb();

  // Get all companies that have at least one job, with their current best status
  const companies = db.prepare(`
    SELECT DISTINCT c.id, c.name,
      COALESCE(
        (SELECT a.status FROM applications a JOIN jobs j ON a.job_id = j.id
         WHERE j.company_id = c.id ORDER BY a.updated_at DESC LIMIT 1),
        'new'
      ) as current_status
    FROM companies c
    JOIN jobs j ON j.company_id = c.id
    WHERE c.is_active = 1
  `).all() as { id: number; name: string; current_status: string }[];

  if (companies.length === 0) {
    return NextResponse.json({ ok: true, updated: 0, message: "No companies with jobs to sync" });
  }

  try {
    const matches = await syncEmailForCompanies(companies);

    const updateApp = db.prepare(`
      UPDATE applications
      SET status = ?, email_subject = ?, email_from = ?, email_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE job_id IN (SELECT id FROM jobs WHERE company_id = ?)
        AND (status = 'new' OR status = 'applied')
    `);

    let updated = 0;
    const doUpdates = db.transaction(() => {
      for (const [companyId, match] of matches) {
        const r = updateApp.run(match.detectedStatus, match.subject, match.from, match.date, companyId);
        updated += r.changes;
      }
    });
    doUpdates();

    db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('last_email_sync', ?)").run(new Date().toISOString());

    return NextResponse.json({ ok: true, updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
