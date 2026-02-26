export const STATUS_OPTIONS = [
  "new",
  "applied",
  "phone_screen",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
  "complete",
] as const;

export type Status = (typeof STATUS_OPTIONS)[number];

const STATUS_STYLES: Record<Status, string> = {
  new: "bg-zinc-700 text-zinc-300",
  applied: "bg-blue-900/60 text-blue-300 border border-blue-700/40",
  phone_screen: "bg-yellow-900/60 text-yellow-300 border border-yellow-700/40",
  interview: "bg-orange-900/60 text-orange-300 border border-orange-700/40",
  offer: "bg-green-900/60 text-green-300 border border-green-700/40",
  rejected: "bg-red-900/60 text-red-400 border border-red-700/40",
  withdrawn: "bg-zinc-800 text-zinc-500 border border-zinc-700/40",
  complete: "bg-purple-900/60 text-purple-300 border border-purple-700/40",
};

const STATUS_LABELS: Record<Status, string> = {
  new: "New",
  applied: "Applied",
  phone_screen: "Phone Screen",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  complete: "Complete",
};

export function StatusBadge({ status }: { status: string }) {
  const s = (STATUS_OPTIONS.includes(status as Status) ? status : "new") as Status;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[s]}`}>
      {STATUS_LABELS[s]}
    </span>
  );
}
