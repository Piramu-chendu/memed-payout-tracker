
"use client";

import { useCallback, useEffect, useState } from "react";

type Platform = "instagram" | "youtube";
type CampaignStatus = "live" | "paused" | "completed";

interface Milestone {
  viewThreshold: number;
  payout: number;
}

interface Campaign {
  _id?: string;
  id?: string;
  name: string;
  platform: Platform;
  totalBudget: number;
  spentAmount: number;
  status: CampaignStatus;
  milestones: Milestone[];
}

interface Earnings {
  totalEarnings: number;
  submissionCount: number;
}

interface CampaignResponse {
  success: boolean;
  message?: string;
  count?: number;
  campaigns?: Campaign[];
}

interface EarningsResponse {
  success: boolean;
  message?: string;
  earnings?: Earnings;
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

function views(value: number): string {
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

function campaignId(campaign: Campaign): string {
  return campaign._id ?? campaign.id ?? "";
}

export default function CreatorDashboardPage() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [earnings, setEarnings] = useState<Earnings>({
    totalEarnings: 0,
    submissionCount: 0,
  });
  const [platformFilter, setPlatformFilter] = useState<
    "all" | Platform
  >("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
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
        throw new Error("Stored account information is invalid. Please sign in again.");
      }

      setUser({
        name: parsedUser.name,
        email: parsedUser.email,
        role: "creator",
      });

      setLoading(true);
      setError("");

      const [campaignResponse, earningsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/campaigns/live`, {
          cache: "no-store",
        }),
        fetch(`${API_BASE_URL}/api/submissions/earnings`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }),
      ]);

      const campaignData =
        (await campaignResponse.json()) as CampaignResponse;
      const earningsData =
        (await earningsResponse.json()) as EarningsResponse;

      if (
        campaignResponse.status === 401 ||
        campaignResponse.status === 403 ||
        earningsResponse.status === 401 ||
        earningsResponse.status === 403
      ) {
        sessionStorage.removeItem("memed_token");
        sessionStorage.removeItem("memed_user");
        window.location.replace("/");
        return;
      }

      if (!campaignResponse.ok || !campaignData.success) {
        throw new Error(
          campaignData.message ?? "Unable to load live campaigns."
        );
      }

      if (!earningsResponse.ok || !earningsData.success) {
        throw new Error(
          earningsData.message ?? "Unable to load your earnings."
        );
      }

      setCampaigns(campaignData.campaigns ?? []);
      setEarnings(
        earningsData.earnings ?? {
          totalEarnings: 0,
          submissionCount: 0,
        }
      );
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
    void loadDashboard();
  }, [loadDashboard]);

  function signOut() {
    sessionStorage.removeItem("memed_token");
    sessionStorage.removeItem("memed_user");
    window.location.replace("/");
  }

  const filteredCampaigns = campaigns.filter(
    (campaign) =>
      platformFilter === "all" || campaign.platform === platformFilter
  );

  return (
    <main className="min-h-screen bg-[#090a0e] text-white">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-white/[0.08] bg-[#0d0e13] px-5 py-7 lg:flex">
        <a href="/creator" className="flex items-center gap-3 px-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500 text-lg font-black">
            M
          </span>
          <span className="text-xl font-bold">
            Meme<span className="text-violet-400">'d</span>
          </span>
        </a>

        <p className="mb-3 mt-12 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Creator workspace
        </p>

        <nav className="space-y-2">
          <a
            href="/creator"
            className="flex items-center gap-3 rounded-xl border border-violet-400/15 bg-violet-400/10 px-4 py-3 text-sm font-medium text-violet-200"
          >
            <span aria-hidden="true">▦</span>
            Overview
          </a>
          <a
            href="#campaigns"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"
          >
            <span aria-hidden="true">◈</span>
            Live campaigns
          </a>
<a
  href="/creator/submissions"
  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"
>
  <span aria-hidden="true">▤</span>
  My submissions
</a>
        </nav>

        <div className="mt-auto rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
          <p className="text-sm font-semibold">Creator workspace</p>
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Find campaigns, publish content, and track milestone rewards.
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
              Creator overview
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void loadDashboard()}
              disabled={loading}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/[0.05] disabled:opacity-50 sm:px-4"
            >
              Refresh
            </button>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{user?.name ?? "Creator"}</p>
              <p className="text-xs text-zinc-500">Creator account</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-violet-400/20 bg-violet-400/10 text-sm font-semibold text-violet-200">
              {(user?.name ?? "C").charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <section className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
          <div>
            <p className="text-sm text-violet-300">YOUR CREATOR JOURNEY</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Welcome back{user?.name ? `, ${user.name}` : ""}.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
              Discover live brand campaigns, understand their payout milestones,
              and keep track of your earnings.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-7 flex flex-col justify-between gap-3 rounded-2xl border border-red-400/20 bg-red-400/[0.06] p-4 sm:flex-row sm:items-center"
            >
              <p className="text-sm text-red-300">{error}</p>
              <button
                type="button"
                onClick={() => void loadDashboard()}
                className="self-start text-sm font-medium text-red-200 underline underline-offset-4 sm:self-auto"
              >
                Try again
              </button>
            </div>
          )}

          <div id="earnings" className="mt-9 grid gap-4 sm:grid-cols-2">
            <MetricCard
              label="Total earnings"
              value={loading ? "—" : currency(earnings.totalEarnings)}
              detail="Total payout allocated to your posts"
              icon="₹"
              accent="green"
            />
            <MetricCard
              label="Posts submitted"
              value={
                loading
                  ? "—"
                  : earnings.submissionCount.toLocaleString("en-IN")
              }
              detail="Posts submitted under your account"
              icon="↗"
              accent="violet"
            />
          </div>

          <section id="campaigns" className="mt-10">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <h3 className="text-xl font-semibold">Live campaigns</h3>
                <p className="mt-2 text-sm text-zinc-500">
                  Explore campaigns with available budgets and their payout milestones.
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
                    className="h-60 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.025]"
                  />
                ))}
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.015] px-6 py-14 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/15 bg-violet-400/[0.08] text-2xl text-violet-300">
                  ◈
                </div>
                <h4 className="mt-5 text-lg font-semibold">
                  {campaigns.length === 0
                    ? "No live campaigns available"
                    : "No campaigns for this platform"}
                </h4>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
                  {campaigns.length === 0
                    ? "Check back later when brands launch campaigns with available budgets."
                    : "Choose another platform filter to see more campaigns."}
                </p>
                {platformFilter !== "all" && (
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
                {filteredCampaigns.map((campaign) => {
                  const id = campaignId(campaign);
                  const remaining = Math.max(
                    campaign.totalBudget - campaign.spentAmount,
                    0
                  );
                  const percentage =
                    campaign.totalBudget > 0
                      ? Math.min(
                          (campaign.spentAmount / campaign.totalBudget) * 100,
                          100
                        )
                      : 0;

                  return (
                    <article
                      key={id || campaign.name}
                      className="rounded-2xl border border-white/[0.08] bg-[#101116] p-5 transition hover:border-white/[0.15] sm:p-6"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-xl">
                            {campaign.platform === "instagram" ? "◎" : "▶"}
                          </div>
                          <div className="min-w-0">
                            <h4 className="break-words font-semibold">
                              {campaign.name}
                            </h4>
                            <p className="mt-1 text-xs capitalize text-zinc-500">
                              {campaign.platform} campaign
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
                          Live
                        </span>
                      </div>

                      <div className="mt-6 grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-zinc-500">Campaign budget</p>
                          <p className="mt-1.5 text-lg font-semibold">
                            {currency(campaign.totalBudget)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500">Budget remaining</p>
                          <p className="mt-1.5 text-lg font-semibold text-emerald-300">
                            {currency(remaining)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5">
                        <div className="flex justify-between gap-3 text-xs">
                          <span className="text-zinc-500">Budget utilized</span>
                          <span className="text-zinc-300">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className="h-full rounded-full bg-violet-400"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-6 border-t border-white/[0.07] pt-5">
                        <p className="text-xs font-medium text-zinc-400">
                          Payout milestones
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {campaign.milestones.map((milestone, index) => (
                            <div
                              key={`${milestone.viewThreshold}-${index}`}
                              className="rounded-lg border border-white/[0.07] bg-black/20 px-3 py-2"
                            >
                              <p className="text-xs text-zinc-500">
                                {views(milestone.viewThreshold)} views
                              </p>
                              <p className="mt-1 text-sm font-semibold text-violet-200">
                                {currency(milestone.payout)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <a
                        href={`/creator/submit?campaignId=${encodeURIComponent(id)}`}
                        className="mt-6 flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white transition hover:bg-violet-400"
                      >
                        Submit a post
                        <span aria-hidden="true">→</span>
                      </a>
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
  icon: string;
  accent: "green" | "violet";
}

function MetricCard({
  label,
  value,
  detail,
  icon,
  accent,
}: MetricCardProps) {
  const accentClass =
    accent === "green"
      ? "border-emerald-400/15 bg-emerald-400/[0.08] text-emerald-300"
      : "border-violet-400/15 bg-violet-400/[0.08] text-violet-300";

  return (
    <article className="rounded-2xl border border-white/[0.08] bg-[#101116] p-5 transition hover:border-white/[0.14]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-400">{label}</p>
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl border text-sm font-semibold ${accentClass}`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-5 break-words text-2xl font-semibold tracking-tight sm:text-3xl">
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-zinc-500">{detail}</p>
    </article>
  );
}
