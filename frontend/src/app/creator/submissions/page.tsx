"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, CircleDollarSign, Compass, ExternalLink, Eye, FileVideo, Home, Layers3, Camera, Play, PlayCircle,
 } from "lucide-react";

type Platform = "instagram" | "youtube";
type CampaignStatus = "live" | "paused" | "completed";

interface Milestone {
  viewThreshold: number;
  payout: number;
}

interface SubmissionCampaign {
  id: string;
  name: string;
  platform: Platform;
  status: CampaignStatus;
  milestones: Milestone[];
}

interface Submission {
  id: string;
  campaign: SubmissionCampaign | null;
  postUrl: string;
  views: number;
  previousViews: number;
  payoutAmount: number;
  highestMilestonePayout: number;
  flaggedUnusualSpike: boolean;
  lastViewsUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SubmissionsResponse {
  success: boolean;
  message?: string;
  count?: number;
  submissions?: Submission[];
}

interface StoredUser {
  name: string;
  email: string;
  role: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

function currency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatViews(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("en-IN", {
      maximumFractionDigits: 1,
    })}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toLocaleString("en-IN", {
      maximumFractionDigits: 1,
    })}K`;
  }

  return value.toLocaleString("en-IN");
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function platformLabel(platform: Platform): string {
  return platform === "instagram" ? "Instagram" : "YouTube";
}

function platformIcon(platform: Platform): ReactNode {
  return platform === "instagram" ? (
    <Camera className="h-5 w-5" aria-label="Instagram" />
  ) : (
    <Play className="h-5 w-5" aria-label="YouTube" />
  );
}

function nextMilestone(
  milestones: Milestone[],
  currentViews: number
): Milestone | null {
  const sorted = [...milestones].sort(
    (first, second) =>
      first.viewThreshold - second.viewThreshold
  );

  return (
    sorted.find(
      (milestone) => currentViews < milestone.viewThreshold
    ) ?? null
  );
}

function milestoneProgress(
  currentViews: number,
  milestone: Milestone
): number {
  if (milestone.viewThreshold <= 0) {
    return 100;
  }

  return Math.min(
    100,
    Math.max(
      0,
      (currentViews / milestone.viewThreshold) * 100
    )
  );
}

export default function CreatorSubmissionsPage() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [platformFilter, setPlatformFilter] = useState<
    "all" | Platform
  >("all");
  const [viewInputs, setViewInputs] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [viewUpdateError, setViewUpdateError] = useState("");
  const [viewUpdateSuccess, setViewUpdateSuccess] = useState("");

  const loadSubmissions = useCallback(async () => {
    const token = sessionStorage.getItem("memed_token");
    const storedUser = sessionStorage.getItem("memed_user");

    if (!token || !storedUser) {
      window.location.replace("/");
      return;
    }

    try {
      const parsedUser: unknown = JSON.parse(storedUser);

      if (
        typeof parsedUser !== "object" ||
        parsedUser === null ||
        !("role" in parsedUser) ||
        parsedUser.role !== "creator"
      ) {
        window.location.replace("/");
        return;
      }

      if (
        !("name" in parsedUser) ||
        typeof parsedUser.name !== "string" ||
        !("email" in parsedUser) ||
        typeof parsedUser.email !== "string"
      ) {
        throw new Error(
          "Stored account information is invalid. Please sign in again."
        );
      }

      setUser({
        name: parsedUser.name,
        email: parsedUser.email,
        role: "creator",
      });

      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/api/submissions/mine`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const data =
        (await response.json()) as SubmissionsResponse;

      if (response.status === 401 || response.status === 403) {
        sessionStorage.removeItem("memed_token");
        sessionStorage.removeItem("memed_user");
        window.location.replace("/");
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ?? "Unable to load your submissions."
        );
      }

      setSubmissions(data.submissions ?? []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to connect to the backend."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSubmissions();
  }, [loadSubmissions]);

  async function updateViews(submission: Submission) {
    setViewUpdateError("");
    setViewUpdateSuccess("");

    const rawValue = viewInputs[submission.id] ?? String(submission.views);
    const newViews = Number(rawValue);

    if (!Number.isSafeInteger(newViews) || newViews < 0) {
      setViewUpdateError("Enter a valid whole number of views (zero or more).");
      return;
    }

    if (newViews < submission.views) {
      setViewUpdateError("The new view count cannot be lower than the current recorded count.");
      return;
    }

    if (newViews === submission.views) {
      setViewUpdateError("Enter a view count higher than the current count to update this submission.");
      return;
    }

    setUpdatingId(submission.id);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/submissions/${encodeURIComponent(submission.id)}/views`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ views: newViews }),
        }
      );

      const data = (await response.json()) as {
        success: boolean;
        message?: string;
      };

      if (!response.ok || !data.success) {
        throw new Error(data.message ?? "Unable to update views. Please try again.");
      }

      setViewUpdateSuccess(`Views updated to ${newViews.toLocaleString("en-IN")}. Refreshing payout progress…`);
      setViewInputs((current) => ({ ...current, [submission.id]: String(newViews) }));
      await loadSubmissions();
    } catch (requestError) {
      setViewUpdateError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to connect to the backend."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  function signOut() {
    sessionStorage.removeItem("memed_token");
    sessionStorage.removeItem("memed_user");
    window.location.replace("/");
  }

  const filteredSubmissions = submissions.filter((submission) => {
    if (platformFilter === "all") {
      return true;
    }

    return submission.campaign?.platform === platformFilter;
  });

  const totalViews = submissions.reduce(
    (total, submission) => total + submission.views,
    0
  );

  const totalEarnings = submissions.reduce(
    (total, submission) => total + submission.payoutAmount,
    0
  );

  const flaggedCount = submissions.filter(
    (submission) => submission.flaggedUnusualSpike
  ).length;

  return (
    <main className="min-h-screen bg-[#090a0e] text-white">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-white/[0.08] bg-[#0d0e13] px-5 py-7 lg:flex">
        <a href="/creator" className="flex items-center gap-3 px-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500 text-lg font-black">
            M
          </span>
          <span className="text-xl font-bold">
            Meme<span className="text-violet-400">&apos;d</span>
          </span>
        </a>

        <p className="mb-3 mt-12 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Creator workspace
        </p>

        <nav className="space-y-2">
          <a
            href="/creator"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Overview
          </a>

          <a
            href="/creator#campaigns"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"
          >
            <Compass className="h-4 w-4" aria-hidden="true" />
            Live campaigns
          </a>

          <a
            href="/creator/submissions"
            className="flex items-center gap-3 rounded-xl border border-violet-400/15 bg-violet-400/10 px-4 py-3 text-sm font-medium text-violet-200"
          >
            <FileVideo className="h-4 w-4" aria-hidden="true" />
            My submissions
          </a>
        </nav>

        <div className="mt-auto rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
          <p className="text-sm font-semibold">Creator workspace</p>
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Track your posts, views, milestones, and campaign payouts.
          </p>
          <button
            type="button"
            onClick={signOut}
            className="mt-4 w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/[0.05]"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.08] bg-[#090a0e]/90 px-5 py-4 backdrop-blur-xl sm:px-8 lg:px-10">
          <div>
            <p className="text-xs text-zinc-500">Creator workspace</p>
            <h1 className="mt-1 text-lg font-semibold sm:text-xl">
              My submissions
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void loadSubmissions()}
              disabled={loading}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/[0.05] disabled:opacity-50 sm:px-4"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>

            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">
                {user?.name ?? "Creator"}
              </p>
              <p className="text-xs text-zinc-500">Creator account</p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-violet-400/20 bg-violet-400/10 text-sm font-semibold text-violet-200">
              {(user?.name ?? "C").charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <section className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
          <div>
            <p className="text-sm text-violet-300">
              CONTENT PERFORMANCE
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Your submissions.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
              Track submitted posts, monitor recorded views, and see
              how your content progresses toward campaign rewards.
            </p>
          </div>

          {viewUpdateError && (
            <div role="alert" className="mt-5 rounded-xl border border-red-400/20 bg-red-400/[0.06] p-3 text-sm text-red-300">
              {viewUpdateError}
            </div>
          )}

          {viewUpdateSuccess && !viewUpdateError && (
            <div role="status" className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3 text-sm text-emerald-300">
              {viewUpdateSuccess}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mt-7 flex flex-col justify-between gap-3 rounded-2xl border border-red-400/20 bg-red-400/[0.06] p-4 sm:flex-row sm:items-center"
            >
              <p className="text-sm text-red-300">{error}</p>
              <button
                type="button"
                onClick={() => void loadSubmissions()}
                className="self-start text-sm font-medium text-red-200 underline underline-offset-4 sm:self-auto"
              >
                Try again
              </button>
            </div>
          )}

          <div className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Posts submitted"
              value={
                loading
                  ? "—"
                  : submissions.length.toLocaleString("en-IN")
              }
              detail="Posts registered to your account"
              icon={<FileVideo className="h-4 w-4" aria-hidden="true" />}
              accent="violet"
            />

            <MetricCard
              label="Total recorded views"
              value={loading ? "—" : formatViews(totalViews)}
              detail="Combined views across your submissions"
              icon={<Eye className="h-4 w-4" aria-hidden="true" />}
              accent="blue"
            />

            <MetricCard
              label="Total earnings"
              value={loading ? "—" : currency(totalEarnings)}
              detail="Payout allocated to your posts"
              icon={<CircleDollarSign className="h-4 w-4" aria-hidden="true" />}
              accent="green"
            />

            <MetricCard
              label="Review flags"
              value={
                loading
                  ? "—"
                  : flaggedCount.toLocaleString("en-IN")
              }
              detail="Posts flagged for unusual view spikes"
              icon={<AlertTriangle className="h-4 w-4" aria-hidden="true" />}
              accent="amber"
            />
          </div>

          <section className="mt-10">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <h3 className="text-xl font-semibold">
                  Submitted posts
                </h3>
                <p className="mt-2 text-sm text-zinc-500">
                  View each post&apos;s performance and payout progress.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["all", "All platforms"],
                    ["instagram", "Instagram"],
                    ["youtube", "YouTube"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPlatformFilter(value)}
                    aria-pressed={platformFilter === value}
                    className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                      platformFilter === value
                        ? "border-violet-400/30 bg-violet-400/10 text-violet-200"
                        : "border-white/[0.08] text-zinc-400 hover:bg-white/[0.04] hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                {[1, 2].map((item) => (
                  <div
                    key={item}
                    className="h-80 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.025]"
                  />
                ))}
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.015] px-6 py-14 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/15 bg-violet-400/[0.08] text-2xl text-violet-300">
                  <Layers3 className="h-6 w-6" aria-hidden="true" />
                </div>

                <h4 className="mt-5 text-lg font-semibold">
                  {submissions.length === 0
                    ? "No submissions yet"
                    : "No submissions for this platform"}
                </h4>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
                  {submissions.length === 0
                    ? "Submit a post to a live campaign to start tracking its performance and rewards here."
                    : "Choose another platform filter to see your other submissions."}
                </p>

                {submissions.length === 0 ? (
                  <a
                    href="/creator#campaigns"
                    className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-violet-500 px-5 text-sm font-semibold text-white transition hover:bg-violet-400"
                  >
                    Explore campaigns
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPlatformFilter("all")}
                    className="mt-5 rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/[0.04]"
                  >
                    Show all platforms
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                {filteredSubmissions.map((submission) => {
                  const campaign = submission.campaign;
                  const milestone = campaign
                    ? nextMilestone(
                        campaign.milestones,
                        submission.views
                      )
                    : null;

                  const progress = milestone
                    ? milestoneProgress(
                        submission.views,
                        milestone
                      )
                    : 100;

                  const remainingViews = milestone
                    ? Math.max(
                        milestone.viewThreshold - submission.views,
                        0
                      )
                    : 0;

                  return (
                    <article
                      key={submission.id}
                      className="rounded-2xl border border-white/[0.08] bg-[#101116] p-5 transition hover:border-white/[0.15] sm:p-6"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-xl">
                            {campaign
                              ? platformIcon(campaign.platform)
                              : <Layers3 className="h-5 w-5" aria-hidden="true" />}
                          </div>

                          <div className="min-w-0">
                            <h4 className="break-words font-semibold">
                              {campaign?.name ?? "Campaign unavailable"}
                            </h4>
                            <p className="mt-1 text-xs text-zinc-500">
                              {campaign
                                ? platformLabel(campaign.platform)
                                : "Campaign details unavailable"}
                              {" · "}
                              Submitted {formatDate(submission.createdAt)}
                            </p>
                          </div>
                        </div>

                        <span className="shrink-0 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
                          Submitted
                        </span>
                      </div>

                      <a
                        href={submission.postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-5 block break-all rounded-xl border border-white/[0.07] bg-black/20 p-3 text-xs leading-5 text-violet-300 transition hover:text-violet-200"
                      >
                        {submission.postUrl}
                        <span className="ml-2 inline-block">
                          <ExternalLink className="ml-2 inline-block h-3 w-3" aria-hidden="true" />
                        </span>
                      </a>

                      <form
                        className="mt-4 rounded-xl border border-violet-400/15 bg-violet-400/[0.04] p-4"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void updateViews(submission);
                        }}
                      >
                        <label
                          htmlFor={`views-${submission.id}`}
                          className="block text-sm font-medium text-zinc-200"
                        >
                          Update recorded views
                        </label>
                        <p className="mt-1 text-xs leading-5 text-zinc-500">
                          Assignment simulation: enter the latest view count shown by the platform. This does not fetch views automatically.
                        </p>
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                          <input
                            id={`views-${submission.id}`}
                            type="number"
                            inputMode="numeric"
                            min={submission.views + 1}
                            step={1}
                            required
                            value={viewInputs[submission.id] ?? String(submission.views)}
                            onChange={(event) =>
                              setViewInputs((current) => ({
                                ...current,
                                [submission.id]: event.target.value,
                              }))
                            }
                            disabled={updatingId !== null}
                            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#090a0e] px-3 py-2.5 text-sm text-white outline-none transition focus:border-violet-400/50 disabled:opacity-50"
                          />
                          <button
                            type="submit"
                            disabled={updatingId !== null}
                            className="rounded-lg bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {updatingId === submission.id ? "Updating…" : "Update views"}
                          </button>
                        </div>
                      </form>

                      <div className="mt-5 grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-zinc-500">
                            Current views
                          </p>
                          <p className="mt-1.5 text-xl font-semibold">
                            {formatViews(submission.views)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-zinc-500">
                            Previous views
                          </p>
                          <p className="mt-1.5 text-xl font-semibold text-zinc-300">
                            {formatViews(submission.previousViews)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-zinc-500">
                            Payout earned
                          </p>
                          <p className="mt-1.5 text-lg font-semibold text-emerald-300">
                            {currency(submission.payoutAmount)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-zinc-500">
                            Highest milestone payout
                          </p>
                          <p className="mt-1.5 text-lg font-semibold text-violet-200">
                            {currency(
                              submission.highestMilestonePayout
                            )}
                          </p>
                        </div>
                      </div>

                      {campaign && (
                        <div className="mt-6 border-t border-white/[0.07] pt-5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-medium text-zinc-400">
                                {milestone
                                  ? "Next payout milestone"
                                  : "Milestone progress"}
                              </p>
                              <p className="mt-1.5 text-sm font-semibold">
                                {milestone
                                  ? `${formatViews(milestone.viewThreshold)} views`
                                  : "All view thresholds reached"}
                              </p>
                            </div>

                            {milestone && (
                              <span className="text-sm font-semibold text-violet-200">
                                {currency(milestone.payout)}
                              </span>
                            )}
                          </div>

                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                            <div
                              className="h-full rounded-full bg-violet-400 transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>

                          <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-zinc-500">
                            <span>
                              {formatViews(submission.views)} views recorded
                            </span>
                            {milestone ? (
                              <span>
                                {formatViews(remainingViews)} views to go
                              </span>
                            ) : (
                              <span>Thresholds reached</span>
                            )}
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {campaign.milestones.map(
                              (item, index) => {
                                const reached =
                                  submission.views >= item.viewThreshold;

                                return (
                                  <span
                                    key={`${item.viewThreshold}-${index}`}
                                    className={`rounded-lg border px-3 py-2 text-xs ${
                                      reached
                                        ? "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300"
                                        : "border-white/[0.07] bg-black/20 text-zinc-400"
                                    }`}
                                  >
                                    {formatViews(item.viewThreshold)}
                                    {" · "}
                                    {currency(item.payout)}
                                    {reached ? " ✓" : ""}
                                  </span>
                                );
                              }
                            )}
                          </div>
                        </div>
                      )}

                      {submission.flaggedUnusualSpike && (
                        <div
                          role="status"
                          className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-3"
                        >
                          <p className="text-sm font-medium text-amber-200">
                            Unusual view activity flagged
                          </p>
                          <p className="mt-1 text-xs leading-5 text-amber-100/70">
                            This post has been flagged for review because
                            its recorded view increase met the unusual-spike
                            rule.
                          </p>
                        </div>
                      )}

                      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.07] pt-4 text-xs text-zinc-500">
                        <span>
                          {submission.lastViewsUpdatedAt
                            ? `Last updated ${formatDate(
                                submission.lastViewsUpdatedAt
                              )}`
                            : "Waiting for first view update"}
                        </span>

                        <span className="capitalize">
                          Campaign: {campaign?.status ?? "unavailable"}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <footer className="mt-12 border-t border-white/[0.07] py-6 text-center text-xs text-zinc-600">
            Meme&apos;d Campaign Payout Tracker · Creator workspace
          </footer>
        </section>
      </div>
    </main>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  accent: "violet" | "blue" | "green" | "amber";
}

function MetricCard({
  label,
  value,
  detail,
  icon,
  accent,
}: MetricCardProps) {
  const accentClasses: Record<MetricCardProps["accent"], string> = {
    violet:
      "border-violet-400/15 bg-violet-400/[0.08] text-violet-300",
    blue: "border-sky-400/15 bg-sky-400/[0.08] text-sky-300",
    green:
      "border-emerald-400/15 bg-emerald-400/[0.08] text-emerald-300",
    amber:
      "border-amber-400/15 bg-amber-400/[0.08] text-amber-300",
  };

  return (
    <article className="rounded-2xl border border-white/[0.08] bg-[#101116] p-5 transition hover:border-white/[0.14]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-400">{label}</p>
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl border text-sm font-semibold ${accentClasses[accent]}`}
        >
          {icon}
        </span>
      </div>

      <p className="mt-5 break-words text-2xl font-semibold tracking-tight sm:text-3xl">
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-zinc-500">
        {detail}
      </p>
    </article>
  );
}