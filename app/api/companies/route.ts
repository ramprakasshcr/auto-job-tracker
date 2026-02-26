import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const companies = db.prepare("SELECT * FROM companies ORDER BY name ASC").all();
  return NextResponse.json({ companies });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const { name, slug, website, source } = await req.json();

  if (!name || !slug) {
    return NextResponse.json({ error: "name and slug are required" }, { status: 400 });
  }

  const validSource = ["greenhouse", "lever", "ashby"].includes(source) ? source : "greenhouse";

  try {
    const result = db.prepare(
      "INSERT INTO companies (name, greenhouse_slug, website_url, source) VALUES (?, ?, ?, ?)"
    ).run(name.trim(), slug.trim().toLowerCase(), website?.trim() ?? "", validSource);
    const company = db.prepare("SELECT * FROM companies WHERE id = ?").get(result.lastInsertRowid);
    return NextResponse.json({ company });
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e?.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return NextResponse.json({ error: "Company with this slug already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to add company" }, { status: 500 });
  }
}
