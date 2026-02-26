import Database from "better-sqlite3";
import path from "path";
import { seedCompanies } from "./companies-seed";

const DB_PATH = path.join(process.cwd(), "job-tracker.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    initSchema(_db);
  }
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      greenhouse_slug TEXT UNIQUE NOT NULL,
      website_url TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      greenhouse_id TEXT UNIQUE NOT NULL,
      company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      job_url TEXT NOT NULL,
      location TEXT,
      department TEXT,
      fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'new',
      notes TEXT,
      marked_complete INTEGER DEFAULT 0,
      email_subject TEXT,
      email_from TEXT,
      email_date TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Migrations — safe to run on existing DBs
  try { db.exec("ALTER TABLE jobs ADD COLUMN posted_at TEXT"); } catch { /* already exists */ }
  try { db.exec("ALTER TABLE jobs ADD COLUMN experience TEXT"); } catch { /* already exists */ }
  try { db.exec("ALTER TABLE companies ADD COLUMN source TEXT DEFAULT 'greenhouse'"); } catch { /* already exists */ }
  try { db.exec("ALTER TABLE jobs ADD COLUMN source TEXT DEFAULT 'greenhouse'"); } catch { /* already exists */ }
  // Correct known ATS sources for existing seeded companies
  db.exec(`UPDATE companies SET source = 'ashby' WHERE greenhouse_slug IN ('linear','vercel','retool','mercury','loom','deel') AND (source IS NULL OR source = 'greenhouse')`);
  db.exec(`UPDATE companies SET source = 'lever' WHERE greenhouse_slug IN ('lyft','yelp','eventbrite','descript') AND (source IS NULL OR source = 'greenhouse')`);

  const seeded = db.prepare("SELECT value FROM meta WHERE key = 'seeded'").get() as { value: string } | undefined;
  if (!seeded) {
    seedCompanies(db);
    db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('seeded', '1')").run();
  }
}
