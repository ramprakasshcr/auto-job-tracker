import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const { id } = await params;
  db.prepare("DELETE FROM companies WHERE id = ?").run(Number(id));
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const { id } = await params;
  const { is_active } = await req.json();
  db.prepare("UPDATE companies SET is_active = ? WHERE id = ?").run(is_active ? 1 : 0, Number(id));
  return NextResponse.json({ ok: true });
}
