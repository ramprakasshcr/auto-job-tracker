# Auto Job Tracker

A personal, self-hosted job application tracker that automatically discovers open roles from company job boards, lets you track your application status, and syncs with Gmail to detect recruiter responses — all from a local dashboard with zero cloud dependencies.

---

## What it does

### Auto-discovery across 150+ companies
On first launch, the tracker fetches open roles from 150+ pre-seeded companies across Greenhouse, Lever, and Ashby ATS platforms. No scraping — it uses their public job board APIs directly. Refreshes every 30 minutes in the background.

**Supported sources:**
- **Greenhouse** — `boards-api.greenhouse.io`
- **Lever** — `api.lever.co`
- **Ashby** — `boards-api.ashbyhq.com`

Companies span tech (Stripe, Notion, Linear, Vercel, Anthropic, OpenAI, Figma, Discord, Brex, Ramp, Rippling), logistics (Flexport, Samsara, Tesla, Rivian), consumer/marketplace (Airbnb, DoorDash, Instacart, Robinhood, Plaid), and more.

### Role-based filtering
Set your target role(s) during onboarding (e.g. `Product Manager, PM`). Only matching jobs are shown and counted — the tracker isn't limited to any single role type. Comma-separate for multiple keywords.

### Application status tracking
Each discovered job gets an application row. Update status through an inline dropdown:

`New` → `Applied` → `Phone Screen` → `Interview` → `Offer` → `Rejected` → `Withdrawn` → `Complete`

Mark any job as complete to gray it out and optionally hide it from the list.

### Gmail email sync
Connect your Gmail via IMAP + App Password. The tracker scans your inbox for emails from tracked companies and auto-classifies them:
- `"interview"` / `"schedule"` / `"next steps"` → **Interview**
- `"unfortunately"` / `"not moving forward"` → **Rejected**
- `"offer letter"` → **Offer**
- `"thank you for applying"` → **Applied**

Only updates statuses that haven't been manually set beyond `Applied`.

### Search & filters
- **Fuzzy search** across company name and role title — characters don't need to be consecutive (`"stpe"` matches `"Stripe"`)
- **Location combobox** — type to fuzzy-filter locations from actual job data, or pick from the dropdown
- **Work type** — All / Remote / Hybrid / On-site
- **Experience range** — Any / 0–3y / 3–5y / 5–8y / 8+y (extracted from job descriptions)
- **Listing freshness** — Any / Last 7d / Last 30d / Last 60d
- **Hide completed** toggle
- **Sort** by date listed, company name, or status — ascending or descending

### Pagination
10 / 20 / 50 results per page with consistent row heights (no layout shift between pages).

### Profile preferences
Persistent preferences saved to local DB: target role, work type, location, experience range, and listing freshness. Applied automatically on every load. Editable anytime via the Preferences panel.

### Add any company
Add any company not in the seed list by providing its ATS slug and source (Greenhouse / Lever / Ashby). Jobs are fetched immediately on add.

---

## Tech stack

| Concern | Choice |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 |
| Database | SQLite via `better-sqlite3` (local, zero-setup, WAL mode) |
| Job sources | Greenhouse, Lever, Ashby public APIs (no auth required) |
| Email sync | Gmail IMAP via `imapflow` + App Password |
| Refresh | Client-side polling every 30 min + manual button |

No external database, no cloud services, no subscriptions. Everything runs locally.

---

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/ramprakasshcr/auto-job-tracker.git
cd auto-job-tracker
npm install
```

### 2. Set up Gmail sync (optional)

Create a `.env.local` file:

```
GMAIL_USER=you@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

To get an App Password: Google Account → Security → 2-Step Verification → App Passwords → create one for "Mail".

Skip this step if you don't need email sync.

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). On first load, the onboarding wizard walks you through setting your target role and location. The database and initial job fetch happen automatically.

---

## Project structure

```
├── app/
│   ├── page.tsx                        # Main dashboard
│   └── api/
│       ├── jobs/route.ts               # Job fetch + refresh
│       ├── companies/route.ts          # List / add companies
│       ├── companies/[id]/route.ts     # Delete company
│       ├── applications/[id]/route.ts  # Update application status
│       ├── profile/route.ts            # Get / save preferences
│       └── email/sync/route.ts         # Gmail IMAP sync
├── components/
│   ├── JobsTable.tsx                   # Main table
│   ├── StatusBadge.tsx                 # Colored status badges
│   ├── AddCompanyModal.tsx             # Add company form
│   ├── ProfileModal.tsx                # Preferences panel
│   └── OnboardingModal.tsx             # First-run wizard
└── lib/
    ├── db.ts                           # SQLite init + schema
    ├── greenhouse.ts                   # Greenhouse API fetcher
    ├── lever.ts                        # Lever API fetcher
    ├── ashby.ts                        # Ashby API fetcher
    ├── email.ts                        # Gmail IMAP sync logic
    └── companies-seed.ts               # 150+ company list
```

---

## Notes

- The SQLite database (`job-tracker.db`) is created automatically on first run and is gitignored — your data stays local.
- No data ever leaves your machine unless you configure Gmail sync.
- To reset and re-run onboarding: `DELETE FROM meta WHERE key = 'target_role';` in the DB.
