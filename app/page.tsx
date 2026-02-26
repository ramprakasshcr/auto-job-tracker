"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import JobsTable, { type JobRow } from "@/components/JobsTable";
import { StatusBadge, STATUS_OPTIONS } from "@/components/StatusBadge";
import AddCompanyModal from "@/components/AddCompanyModal";
import OnboardingModal from "@/components/OnboardingModal";
import ProfileModal, { type ProfilePrefs } from "@/components/ProfileModal";

const REFRESH_MS = 30 * 60 * 1000;

type SortKey = "date" | "company" | "status";
type LocationFilter = "all" | "remote" | "hybrid" | "onsite";
type ExpFilter = "all" | "0-3" | "3-5" | "5-8" | "8+";
type DateFilter = "any" | "7" | "30" | "60";

function fuzzyMatch(str: string, query: string): boolean {
  if (!query) return true;
  const s = str.toLowerCase();
  const q = query.toLowerCase();
  let qi = 0;
  for (let si = 0; si < s.length && qi < q.length; si++) {
    if (s[si] === q[qi]) qi++;
  }
  return qi === q.length;
}

function formatAge(iso: string | null) {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function PillGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-zinc-600 mr-0.5 whitespace-nowrap">{label}:</span>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-2 py-0.5 rounded text-xs transition-colors whitespace-nowrap ${
            value === o.value
              ? "bg-zinc-700 text-white"
              : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function Home() {
  // Profile / onboarding
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [targetRole, setTargetRole] = useState("");
  const [targetLocation, setTargetLocation] = useState("");

  // Data
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState<LocationFilter>("all");
  const [expFilter, setExpFilter] = useState<ExpFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("any");
  const [hideComplete, setHideComplete] = useState(false);

  // Sort
  const [sortBy, setSortBy] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  }

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/jobs");
      const data = await res.json();
      setJobs(data.jobs ?? []);
      setLastRefreshed(data.lastRefreshed);
    } catch {
      // silently fail background refreshes
    }
  }, []);

  const refreshGreenhouse = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json();
      await fetchJobs();
      showToast(`Done — ${data.newJobs} new role${data.newJobs !== 1 ? "s" : ""} found`);
    } catch {
      showToast("Refresh failed. Check console.");
    } finally {
      setRefreshing(false);
    }
  }, [fetchJobs]);

  async function syncEmail() {
    setSyncing(true);
    try {
      const res = await fetch("/api/email/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        showToast(`Email sync failed: ${data.error}`);
      } else {
        await fetchJobs();
        showToast(`Email synced — ${data.updated} status${data.updated !== 1 ? "es" : ""} updated`);
      }
    } catch {
      showToast("Email sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function changeStatus(appId: number, status: string) {
    setJobs((prev) => prev.map((j) => (j.id === appId ? { ...j, status } : j)));
    await fetch(`/api/applications/${appId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function markComplete(appId: number) {
    const job = jobs.find((j) => j.id === appId);
    const newComplete = job?.marked_complete ? 0 : 1;
    setJobs((prev) =>
      prev.map((j) =>
        j.id === appId
          ? { ...j, marked_complete: newComplete, status: newComplete ? "complete" : j.status }
          : j
      )
    );
    await fetch(`/api/applications/${appId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        marked_complete: newComplete,
        ...(newComplete ? { status: "complete" } : {}),
      }),
    });
  }

  function applyProfileToFilters(data: {
    targetLocationType?: string;
    targetExp?: string;
    targetDateWithin?: string;
  }) {
    if (data.targetLocationType) setLocationFilter(data.targetLocationType as LocationFilter);
    if (data.targetExp) setExpFilter(data.targetExp as ExpFilter);
    if (data.targetDateWithin) setDateFilter(data.targetDateWithin as DateFilter);
  }

  // Load profile first, then decide onboarding vs dashboard
  useEffect(() => {
    async function init() {
      const res = await fetch("/api/profile");
      const data = await res.json();
      if (!data.targetRole) {
        setShowOnboarding(true);
        setProfileLoaded(true);
      } else {
        setTargetRole(data.targetRole);
        setTargetLocation(data.targetLocation ?? "");
        applyProfileToFilters(data);
        setProfileLoaded(true);
        setLoading(true);
        await fetchJobs();
        setLoading(false);
      }
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchJobs]);

  // Auto-refresh every 30 min (only after onboarding is done)
  useEffect(() => {
    if (showOnboarding || !profileLoaded) return;
    const t = setInterval(refreshGreenhouse, REFRESH_MS);
    return () => clearInterval(t);
  }, [refreshGreenhouse, showOnboarding, profileLoaded]);

  // After onboarding completes: save profile, trigger first fetch
  async function handleOnboardingComplete() {
    setShowOnboarding(false);
    const res = await fetch("/api/profile");
    const data = await res.json();
    setTargetRole(data.targetRole ?? "");
    setTargetLocation(data.targetLocation ?? "");
    applyProfileToFilters(data);
    setLoading(true);
    await refreshGreenhouse();
    setLoading(false);
  }

  // After profile update — immediately apply new prefs as filters
  function handleProfileSave(prefs: ProfilePrefs) {
    setTargetRole(prefs.role);
    setTargetLocation(prefs.location);
    setLocationFilter(prefs.locationType);
    setExpFilter(prefs.exp);
    setDateFilter(prefs.dateWithin);
    showToast("Preferences saved and applied");
  }

  // Role keywords derived from profile — used both for display filtering and fetch filtering
  const roleKeywords = useMemo(
    () => targetRole.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
    [targetRole]
  );

  // Filtered + sorted jobs
  const filtered = useMemo(() => {
    let result = jobs.filter((j) => {
      if (hideComplete && j.marked_complete) return false;
      if (
        statusFilter !== "all" &&
        j.status !== statusFilter &&
        !(statusFilter === "complete" && j.marked_complete)
      )
        return false;

      // Always filter by profile role — only show jobs matching the user's target role
      if (roleKeywords.length > 0) {
        const title = j.title.toLowerCase();
        if (!roleKeywords.some((kw) => title.includes(kw))) return false;
      }

      if (search && !fuzzyMatch(j.company_name, search) && !fuzzyMatch(j.title, search))
        return false;
      if (locationSearch && !fuzzyMatch(j.location ?? "", locationSearch))
        return false;
      if (locationFilter !== "all") {
        const l = (j.location ?? "").toLowerCase();
        if (locationFilter === "remote" && !l.includes("remote")) return false;
        if (locationFilter === "hybrid" && !l.includes("hybrid")) return false;
        if (locationFilter === "onsite" && (l.includes("remote") || l.includes("hybrid") || !l))
          return false;
      }
      if (expFilter !== "all") {
        const m = j.experience?.match(/(\d+)/);
        const yrs = m ? parseInt(m[1]) : null;
        if (yrs === null) return false;
        if (expFilter === "0-3" && yrs >= 3) return false;
        if (expFilter === "3-5" && (yrs < 3 || yrs >= 5)) return false;
        if (expFilter === "5-8" && (yrs < 5 || yrs >= 8)) return false;
        if (expFilter === "8+" && yrs < 8) return false;
      }
      if (dateFilter !== "any") {
        const days = j.posted_at
          ? Math.floor((Date.now() - new Date(j.posted_at).getTime()) / 86400000)
          : 9999;
        if (days > parseInt(dateFilter)) return false;
      }
      return true;
    });

    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "date") {
        cmp =
          (a.posted_at ? new Date(a.posted_at).getTime() : 0) -
          (b.posted_at ? new Date(b.posted_at).getTime() : 0);
      } else if (sortBy === "company") {
        cmp = a.company_name.localeCompare(b.company_name);
      } else if (sortBy === "status") {
        cmp = a.status.localeCompare(b.status);
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return result;
  }, [jobs, statusFilter, search, locationSearch, locationFilter, expFilter, dateFilter, hideComplete, sortBy, sortDir, roleKeywords]);

  // Reset to page 1 whenever filters/sort change
  useEffect(() => { setPage(1); }, [filtered]);

  // Paginated slice
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageStart = (page - 1) * pageSize;
  const paginated = filtered.slice(pageStart, pageStart + pageSize);

  function getPageNumbers(cur: number, total: number): (number | "…")[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (cur <= 4) return [1, 2, 3, 4, 5, "…", total];
    if (cur >= total - 3) return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
    return [1, "…", cur - 1, cur, cur + 1, "…", total];
  }

  // Stats — scoped to role-matching jobs only
  const stats = useMemo(() => {
    const roleMatched = roleKeywords.length > 0
      ? jobs.filter((j) => {
          const t = j.title.toLowerCase();
          return roleKeywords.some((kw) => t.includes(kw));
        })
      : jobs;
    const applied = roleMatched.filter((j) => j.status === "applied").length;
    const interview = roleMatched.filter(
      (j) => j.status === "interview" || j.status === "phone_screen"
    ).length;
    const offer = roleMatched.filter((j) => j.status === "offer").length;
    return { total: roleMatched.length, applied, interview, offer };
  }, [jobs, roleKeywords]);

  // Unique location options for the dropdown
  const locationOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const j of jobs) {
      if (!j.location) continue;
      j.location.split(/[;|]/).map((s) => s.trim()).filter(Boolean).forEach((l) => seen.add(l));
    }
    return Array.from(seen).sort();
  }, [jobs]);

  // Location combobox state
  const [showLocDropdown, setShowLocDropdown] = useState(false);
  const locDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (locDropdownRef.current && !locDropdownRef.current.contains(e.target as Node)) {
        setShowLocDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredLocOptions = useMemo(() => {
    if (!locationSearch) return locationOptions;
    return locationOptions.filter((l) => fuzzyMatch(l, locationSearch));
  }, [locationOptions, locationSearch]);

  const hasActiveFilters =
    locationSearch !== "" || locationFilter !== "all" || expFilter !== "all" || dateFilter !== "any" || hideComplete;

  function resetFilters() {
    setLocationSearch("");
    setLocationFilter("all");
    setExpFilter("all");
    setDateFilter("any");
    setHideComplete(false);
    setStatusFilter("all");
    setSearch("");
  }

  // Show onboarding until profile is set
  if (showOnboarding) {
    return <OnboardingModal onComplete={handleOnboardingComplete} />;
  }

  // Blank while loading profile
  if (!profileLoaded) {
    return <div className="min-h-screen bg-zinc-950" />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm px-4 py-2.5 rounded-lg shadow-xl">
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              {/* Line 1: Title */}
              <h1 className="text-xl font-bold text-white tracking-tight">Job Tracker</h1>

              {/* Line 2: Stats */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-zinc-500">
                <span>{stats.total} roles tracked</span>
                {stats.applied > 0 && (
                  <span className="text-blue-400">{stats.applied} applied</span>
                )}
                {stats.interview > 0 && (
                  <span className="text-orange-400">{stats.interview} in interview</span>
                )}
                {stats.offer > 0 && (
                  <span className="text-green-400">
                    {stats.offer} offer{stats.offer > 1 ? "s" : ""}
                  </span>
                )}
                <span>Last refreshed: {formatAge(lastRefreshed)}</span>
              </div>

              {/* Line 3: Active preferences */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {targetRole && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
                    <span className="text-blue-500/50 font-medium">Role</span>
                    {targetRole}
                  </span>
                )}
                {locationFilter !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700/60 text-xs text-zinc-400">
                    <span className="text-zinc-600 font-medium">Work</span>
                    {locationFilter === "remote" ? "Remote" : locationFilter === "hybrid" ? "Hybrid" : "On-site"}
                  </span>
                )}
                {targetLocation && locationFilter === "all" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700/60 text-xs text-zinc-400">
                    <span className="text-zinc-600 font-medium">Location</span>
                    {targetLocation}
                  </span>
                )}
                {expFilter !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700/60 text-xs text-zinc-400">
                    <span className="text-zinc-600 font-medium">Exp</span>
                    {expFilter === "0-3" ? "0–3 yrs" : expFilter === "3-5" ? "3–5 yrs" : expFilter === "5-8" ? "5–8 yrs" : "8+ yrs"}
                  </span>
                )}
                {dateFilter !== "any" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700/60 text-xs text-zinc-400">
                    <span className="text-zinc-600 font-medium">Posted</span>
                    Last {dateFilter}d
                  </span>
                )}
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="text-xs text-zinc-700 hover:text-zinc-400 transition-colors"
                >
                  Edit preferences
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowProfileModal(true)}
                className="px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 rounded-lg text-zinc-300 transition-colors"
              >
                ⚙ Preferences
              </button>
              <button
                onClick={refreshGreenhouse}
                disabled={refreshing}
                className="px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 rounded-lg text-zinc-300 disabled:opacity-40 transition-colors"
              >
                {refreshing ? "Refreshing…" : "↻ Refresh Jobs"}
              </button>
              <button
                onClick={syncEmail}
                disabled={syncing}
                className="px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 rounded-lg text-zinc-300 disabled:opacity-40 transition-colors"
              >
                {syncing ? "Syncing…" : "✉ Sync Email"}
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-colors"
              >
                + Add Company
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* Row 1: Search + Location dropdown + Sort */}
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company or role…"
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500 placeholder:text-zinc-600 w-full sm:w-64"
          />
          {/* Location combobox */}
          <div className="relative w-full sm:w-48" ref={locDropdownRef}>
            <input
              value={locationSearch}
              onChange={(e) => { setLocationSearch(e.target.value); setShowLocDropdown(true); }}
              onFocus={() => setShowLocDropdown(true)}
              placeholder="Filter by location…"
              className={`w-full bg-zinc-900 border rounded-lg px-3 pr-7 py-2 text-sm outline-none transition-colors placeholder:text-zinc-600 ${
                locationSearch
                  ? "border-blue-500/50 text-white"
                  : "border-zinc-800 text-zinc-400 hover:border-zinc-700"
              }`}
            />
            {locationSearch ? (
              <button
                onMouseDown={() => { setLocationSearch(""); setShowLocDropdown(false); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs leading-none"
              >✕</button>
            ) : (
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 text-xs pointer-events-none">▾</span>
            )}
            {showLocDropdown && (filteredLocOptions.length > 0 || !locationSearch) && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl z-50 max-h-52 overflow-y-auto">
                {locationSearch && (
                  <button
                    onMouseDown={() => { setLocationSearch(""); setShowLocDropdown(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-zinc-500 hover:bg-zinc-800 border-b border-zinc-800 transition-colors"
                  >
                    Clear — show all locations
                  </button>
                )}
                {filteredLocOptions.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-zinc-600">No matches</p>
                ) : (
                  filteredLocOptions.map((loc) => (
                    <button
                      key={loc}
                      onMouseDown={() => { setLocationSearch(loc); setShowLocDropdown(false); }}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                        locationSearch === loc
                          ? "bg-blue-600/20 text-blue-300"
                          : "text-zinc-300 hover:bg-zinc-800"
                      }`}
                    >
                      {loc}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-xs text-zinc-600">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1.5 text-xs text-zinc-300 outline-none cursor-pointer"
            >
              <option value="date">Date listed</option>
              <option value="company">Company</option>
              <option value="status">Status</option>
            </select>
            <button
              onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
              className="px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors"
              title={sortDir === "desc" ? "Descending" : "Ascending"}
            >
              {sortDir === "desc" ? "↓" : "↑"}
            </button>
          </div>
        </div>

        {/* Row 2: Status tabs */}
        <div className="flex gap-1.5 flex-wrap items-center mb-3">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              statusFilter === "all"
                ? "bg-zinc-700 text-white"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            All ({jobs.length})
          </button>
          {STATUS_OPTIONS.map((s) => {
            const count = jobs.filter((j) => j.status === s).length;
            if (count === 0) return null;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s === statusFilter ? "all" : s)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? "bg-zinc-700 text-white"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                <span className="text-zinc-600">{count}</span>
                <StatusBadge status={s} />
              </button>
            );
          })}
        </div>

        {/* Row 3: Secondary filters */}
        <div className="flex flex-wrap gap-x-5 gap-y-2 items-center mb-6 pb-4 border-b border-zinc-800/60">
          <PillGroup<LocationFilter>
            label="Location"
            value={locationFilter}
            onChange={setLocationFilter}
            options={[
              { value: "all", label: "All" },
              { value: "remote", label: "Remote" },
              { value: "hybrid", label: "Hybrid" },
              { value: "onsite", label: "On-site" },
            ]}
          />
          <PillGroup<DateFilter>
            label="Posted"
            value={dateFilter}
            onChange={setDateFilter}
            options={[
              { value: "any", label: "Any" },
              { value: "7", label: "7d" },
              { value: "30", label: "30d" },
              { value: "60", label: "60d" },
            ]}
          />
          <PillGroup<ExpFilter>
            label="Experience"
            value={expFilter}
            onChange={setExpFilter}
            options={[
              { value: "all", label: "Any" },
              { value: "0-3", label: "0–3y" },
              { value: "3-5", label: "3–5y" },
              { value: "5-8", label: "5–8y" },
              { value: "8+", label: "8+y" },
            ]}
          />

          {/* Hide completed toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer ml-auto select-none">
            <div
              onClick={() => setHideComplete((h) => !h)}
              className={`w-7 h-4 rounded-full transition-colors relative ${
                hideComplete ? "bg-blue-600" : "bg-zinc-700"
              }`}
            >
              <div
                className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${
                  hideComplete ? "translate-x-3.5" : "translate-x-0.5"
                }`}
              />
            </div>
            <span className="text-xs text-zinc-500">Hide completed</span>
          </label>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors underline decoration-dotted"
            >
              Clear filters
            </button>
          )}

          <span className="text-xs text-zinc-700">
            {filtered.length !== jobs.length
              ? `${filtered.length} of ${jobs.length} match`
              : `${jobs.length} total`}
          </span>
        </div>

        {/* Table — fixed-height wrapper prevents layout shift between pages */}
        <div style={{ minHeight: `${pageSize * 53}px` }}>
          {loading ? (
            <div className="flex items-center justify-center py-20 text-zinc-600 text-sm">Loading…</div>
          ) : (
            <JobsTable
              jobs={paginated}
              onStatusChange={changeStatus}
              onMarkComplete={markComplete}
            />
          )}
        </div>

        {/* Pagination — always in place, never shifts */}
        <div className="mt-2 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-zinc-800/60">
          {/* Result info + page size selector */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500 tabular-nums">
              {filtered.length === 0
                ? "0 results"
                : `${pageStart + 1}–${Math.min(pageStart + pageSize, filtered.length)} of ${filtered.length}`}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-xs text-zinc-600">Per page:</span>
              {([10, 20, 50] as const).map((n) => (
                <button
                  key={n}
                  onClick={() => { setPageSize(n); setPage(1); }}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${
                    pageSize === n
                      ? "bg-zinc-700 text-white"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Page navigation */}
          <div className="flex items-center gap-1" style={{ minHeight: "28px" }}>
            {totalPages > 1 && (
              <>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-2.5 py-1 rounded-md text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ← Prev
                </button>

                {getPageNumbers(page, totalPages).map((n, i) =>
                  n === "…" ? (
                    <span key={`ellipsis-${i}`} className="px-1 text-xs text-zinc-700 w-7 text-center">…</span>
                  ) : (
                    <button
                      key={n}
                      onClick={() => setPage(n as number)}
                      className={`w-7 h-7 rounded-md text-xs transition-colors ${
                        page === n
                          ? "bg-blue-600 text-white font-medium"
                          : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
                      }`}
                    >
                      {n}
                    </button>
                  )
                )}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-2.5 py-1 rounded-md text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <AddCompanyModal onClose={() => setShowModal(false)} onAdded={fetchJobs} />
      )}

      {showProfileModal && (
        <ProfileModal
          current={{
            role: targetRole,
            location: targetLocation,
            locationType: locationFilter,
            exp: expFilter,
            dateWithin: dateFilter,
          }}
          onSave={handleProfileSave}
          onClose={() => setShowProfileModal(false)}
        />
      )}
    </div>
  );
}
