import { ImapFlow } from "imapflow";

export interface EmailMatch {
  subject: string;
  from: string;
  date: string;
  detectedStatus: string;
}

const STATUS_RULES: { keywords: string[]; status: string }[] = [
  { keywords: ["offer letter", "formal offer", "we'd like to offer", "we would like to offer"], status: "offer" },
  { keywords: ["interview", "schedule", "next steps", "move forward", "moving forward", "phone screen", "video call", "hiring manager"], status: "interview" },
  { keywords: ["unfortunately", "not moving forward", "other candidates", "not selected", "decided to move", "will not be moving", "position has been filled", "we won't be"], status: "rejected" },
  { keywords: ["received your application", "thank you for applying", "application received", "we received your", "successfully submitted"], status: "applied" },
];

function classifySubject(subject: string): string {
  const lower = subject.toLowerCase();
  for (const rule of STATUS_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule.status;
    }
  }
  return "";
}

function shouldOverwrite(current: string): boolean {
  return current === "new" || current === "applied";
}

export async function syncEmailForCompanies(
  companies: { id: number; name: string; current_status: string }[]
): Promise<Map<number, EmailMatch>> {
  const results = new Map<number, EmailMatch>();

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error("GMAIL_USER and GMAIL_APP_PASSWORD must be set in .env.local");
  }

  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  await client.connect();

  try {
    await client.mailboxOpen("INBOX");

    for (const company of companies) {
      if (!shouldOverwrite(company.current_status)) continue;

      try {
        // Search for emails mentioning the company name in subject or from
        const uids = await client.search({
          or: [
            { subject: company.name },
            { from: company.name.toLowerCase().replace(/[^a-z0-9]/g, "") },
          ],
        });

        if (!uids || uids.length === 0) continue;

        // Get last 3 matches
        const recent = uids.slice(-3);
        let bestMatch: EmailMatch | null = null;

        for await (const msg of client.fetch(recent, { envelope: true })) {
          const subject = msg.envelope?.subject ?? "";
          const from = msg.envelope?.from?.[0]?.address ?? "";
          const date = msg.envelope?.date?.toISOString() ?? "";
          const detectedStatus = classifySubject(subject);
          if (detectedStatus && (!bestMatch || STATUS_RULES.findIndex((r) => r.status === detectedStatus) < STATUS_RULES.findIndex((r) => r.status === bestMatch!.detectedStatus))) {
            bestMatch = { subject, from, date, detectedStatus };
          }
        }

        if (bestMatch) {
          results.set(company.id, bestMatch);
        }
      } catch {
        // Skip individual company errors
      }
    }
  } finally {
    await client.logout();
  }

  return results;
}
