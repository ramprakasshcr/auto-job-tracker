import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const KEYS = [
  "target_role",
  "target_location",
  "target_location_type",
  "target_exp",
  "target_date_within",
] as const;

function getMeta(db: ReturnType<typeof getDb>, key: string): string | null {
  const row = db.prepare("SELECT value FROM meta WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export async function GET() {
  const db = getDb();
  return NextResponse.json({
    targetRole:        getMeta(db, "target_role"),
    targetLocation:    getMeta(db, "target_location"),
    targetLocationType: getMeta(db, "target_location_type") ?? "all",
    targetExp:         getMeta(db, "target_exp") ?? "all",
    targetDateWithin:  getMeta(db, "target_date_within") ?? "any",
  });
}

export async function PATCH(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const upsert = db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)");

  const pairs: [string, string | undefined][] = [
    ["target_role",          body.targetRole],
    ["target_location",      body.targetLocation],
    ["target_location_type", body.targetLocationType],
    ["target_exp",           body.targetExp],
    ["target_date_within",   body.targetDateWithin],
  ];

  const run = db.transaction(() => {
    for (const [key, val] of pairs) {
      if (val !== undefined) upsert.run(key, val);
    }
  });
  run();

  return NextResponse.json({ ok: true });
}
