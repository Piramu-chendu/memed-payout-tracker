
"use client";

import { useCallback, useEffect, useState } from "react";

type CampaignStatus = "live" | "paused" | "completed";
type Platform = "instagram" | "youtube";

interface CampaignMilestone {
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
  milestones: CampaignMilestone[];
}

interface CampaignSummary {
  campaignCount: number;
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number;
}

interface CampaignListResponse {
  success: boolean;
  message?: string;
  summary?: CampaignSummary;
  campaigns?: Campaign[];
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatViews(views: number): string {
  if (views >= 1_000_000) {
    return `${(views / 1_000_000).toLocaleString("en-IN", {
      maximumFractionDigits: 1,
    })}M`;
  }

  if (views >= 1_000) {
    return `${(views / 1_000).toLocaleString("en-IN", {
      maximumFractionDigits: 1,
    })}K`;
  }

  return views.toLocaleString("en-IN");
}

function getCampaignId(campaign: Campaign): string {
  return campaign._id ?? campaign.id ?? "";
}

function statusClasses(status: CampaignStatus): string {
  switch (status) {
    case "live":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
    case "paused":
      return "border-amber-400/20 bg-amber-400/10 text-amber-300";
    case "completed":
      return "border-zinc-400/20 bg-zinc-400/10 text-zinc-300";
  }
}

export default function BrandDashboardPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [summary, setSummary] = useState<CampaignSummary>({
    campaignCount: 0,
    totalBudget: 0,
    totalSpent: 0,
    remainingBudget: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userName, setUserName] = useState("Brand");

  const loadCampaigns = useCallback(async () => {
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
        parsedUser.role !== "brand"
      ) {
        window.location.replace("/");
        return;
      }

      if (
        "name" in parsedUser &&
        typeof parsedUser.name === "string"
      ) {
        setUserName(parsedUser.name);
      }

      setLoading(true);
      setError("");

      const response = await fetch(`${API_BASE_URL}/api/campaigns/mine`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const result = (await response.json()) as CampaignListResponse;

      if (response.status === 401 || response.status === 403) {
        sessionStorage.removeItem("memed_token");
        sessionStorage.removeItem("memed_user");
        window.location.replace("/");
        return;
      }

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? "Unable to load campaigns.");
      }

      setCampaigns(result.campaigns ?? []);
      setSummary(
        result.summary ?? {
          campaignCount: 0,
          totalBudget: 0,
          totalSpent: 0,
          remainingBudget: 0,
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
    void loadCampaigns();
  }, [loadCampaigns]);

  function signOut() {
    sessionStorage.removeItem("memed_token");
    sessionStorage.removeItem("memed_user");
    window.location.replace("/");
  }

  const spentPercentage =
    summary.totalBudget > 0
      ? Math.min((summary.totalSpent / summary.totalBudget) * 100, 100)
      : 0;

  return (
    <main className="min-h-screen bg-[#090a0e] text-white">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-white/[0.08] bg-[#0d0e13] px-5 py-7 lg:flex">
        <a href="/brand" className="flex items-center gap-3 px-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500 text-lg font-black">
            M
          </span>
          <span className="text-xl font-bold">
            Meme<span className="text-violet-400">'d</span>
          </span>
        </a>

        <p className="mb-3 mt-12 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Workspace
        </p>

        <nav className="space-y-2">
          <a
            href="/brand"
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
            My campaigns
          </a>
          <a
            href="#budget"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"
          >
            <span aria-hidden="true">₹</span>
            Budget overview
          </a>
        </nav>

        <div className="mt-auto rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
          <p className="text-sm font-semibold">Campaign control</p>
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Track your campaign spending and available budget in one place.
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
            <p className="text-xs text-zinc-500">Brand workspace</p>
            <h1 className="mt-1 text-lg font-semibold sm:text-xl">
              Campaign overview
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void loadCampaigns()}
              disabled={loading}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/[0.05] disabled:opacity-50 sm:px-4"
            >
              Refresh
            </button>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{userName}</p>
              <p className="text-xs text-zinc-500">Brand account</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-violet-400/20 bg-violet-400/10 text-sm font-semibold text-violet-200">
              {userName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <section className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm text-violet-300">YOUR CAMPAIGNS</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Welcome back, {userName}.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
                Monitor campaign performance, manage budgets, and keep track
                of your available funds.
              </p>
            </div>

            <a
              href="/brand/campaigns/new"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-500 px-5 text-sm font-semibold text-white shadow-lg shadow-violet-500/15 transition hover:bg-violet-400"
            >
              <span aria-hidden="true">+</span>
              Create campaign
            </a>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-7 flex flex-col justify-between gap-3 rounded-2xl border border-red-400/20 bg-red-400/[0.06] p-4 sm:flex-row sm:items-center"
            >
              <p className="text-sm text-red-300">{error}</p>
              <button
                type="button"
                onClick={() => void loadCampaigns()}
                className="self-start text-sm font-medium text-red-200 underline underline-offset-4 sm:self-auto"
              >
                Try again
              </button>
            </div>
          )}

          <div className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Total campaigns"
              value={loading ? "—" : summary.campaignCount.toLocaleString("en-IN")}
              detail="Campaigns created by you"
              icon="◈"
              accent="violet"
            />
            <MetricCard
              label="Total budget"
              value={loading ? "—" : formatCurrency(summary.totalBudget)}
              detail="Combined campaign budgets"
              icon="₹"
              accent="blue"
            />
            <MetricCard
              label="Total spent"
              value={loading ? "—" : formatCurrency(summary.totalSpent)}
              detail="Payouts allocated so far"
              icon="↗"
              accent="pink"
            />
            <MetricCard
              label="Available budget"
              value={loading ? "—" : formatCurrency(summary.remainingBudget)}
              detail="Budget remaining across campaigns"
              icon="◉"
              accent="green"
            />
          </div>

          <section
            id="budget"
            className="mt-7 rounded-2xl border border-white/[0.08] bg-[#101116] p-5 sm:p-7"
          >
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-base font-semibold">Overall budget usage</h3>
                <p className="mt-1 text-sm text-zinc-500">
                  Across all campaigns belonging to your account
                </p>
              </div>
              <p className="text-lg font-semibold">
                {loading ? "—" : `${spentPercentage.toFixed(1)}%`}
                <span className="ml-2 text-sm font-normal text-zinc-500">
                  utilized
                </span>
              </p>
            </div>

            <div
              className="mt-5 h-2.5 overflow-hidden rounded-full bg-white/[0.06]"
              role="progressbar"
              aria-label="Overall budget usage"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={loading ? 0 : spentPercentage}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-all duration-500"
                style={{ width: `${loading ? 0 : spentPercentage}%` }}
              />
            </div>

            <div className="mt-4 flex flex-wrap justify-between gap-2 text-xs text-zinc-500">
              <span>
                Spent: {loading ? "—" : formatCurrency(summary.totalSpent)}
              </span>
              <span>
                Remaining:{" "}
                {loading ? "—" : formatCurrency(summary.remainingBudget)}
              </span>
            </div>
          </section>

          <section id="campaigns" className="mt-10">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">Your campaigns</h3>
                <p className="mt-2 text-sm text-zinc-500">
                  Review the budgets and milestone structures for your campaigns.
                </p>
              </div>
              <span className="shrink-0 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-400">
                {loading ? "Loading..." : `${campaigns.length} campaigns`}
              </span>
            </div>

            {loading ? (
              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                {[1, 2].map((item) => (
                  <div
                    key={item}
                    className="h-56 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.025]"
                  />
                ))}
              </div>
            ) : campaigns.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.015] px-6 py-14 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/15 bg-violet-400/[0.08] text-2xl text-violet-300">
                  ◈
                </div>
                <h4 className="mt-5 text-lg font-semibold">
                  Your next campaign starts here
                </h4>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
                  You have not created a campaign yet. Start by setting a
                  budget and defining the view milestones that creators can earn.
                </p>
                <a
                  href="/brand/campaigns/new"
                  className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-violet-500 px-4 text-sm font-semibold transition hover:bg-violet-400"
                >
                  Create your first campaign
                </a>
              </div>
            ) : (
              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                {campaigns.map((campaign) => {
                  const id = getCampaignId(campaign);
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
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-lg">
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

                        <span
                          className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${statusClasses(campaign.status)}`}
                        >
                          {campaign.status}
                        </span>
                      </div>

                      <div className="mt-6 grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-zinc-500">Total budget</p>
                          <p className="mt-1.5 text-lg font-semibold">
                            {formatCurrency(campaign.totalBudget)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500">Remaining</p>
                          <p className="mt-1.5 text-lg font-semibold text-emerald-300">
                            {formatCurrency(remaining)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5">
                        <div className="flex justify-between gap-3 text-xs">
                          <span className="text-zinc-500">Budget utilization</span>
                          <span className="text-zinc-300">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className="h-full rounded-full bg-violet-400 transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-6 border-t border-white/[0.07] pt-5">
                        <p className="text-xs font-medium text-zinc-400">
                          Payout milestones
                        </p>
                        {campaign.milestones.length === 0 ? (
                          <p className="mt-3 text-sm text-zinc-500">
                            No milestones available.
                          </p>
                        ) : (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {campaign.milestones.map((milestone, index) => (
                              <div
                                key={`${milestone.viewThreshold}-${index}`}
                                className="rounded-lg border border-white/[0.07] bg-black/20 px-3 py-2"
                              >
                                <p className="text-xs text-zinc-500">
                                  {formatViews(milestone.viewThreshold)} views
                                </p>
                                <p className="mt-1 text-sm font-semibold text-violet-200">
                                  {formatCurrency(milestone.payout)}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <footer className="mt-12 border-t border-white/[0.07] py-6 text-center text-xs text-zinc-600">
            Meme&apos;d Campaign Payout Tracker · Brand workspace
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
  accent: "violet" | "blue" | "pink" | "green";
}

function MetricCard({
  label,
  value,
  detail,
  icon,
  accent,
}: MetricCardProps) {
  const accentClasses: Record<MetricCardProps["accent"], string> = {
    violet: "border-violet-400/15 bg-violet-400/[0.08] text-violet-300",
    blue: "border-sky-400/15 bg-sky-400/[0.08] text-sky-300",
    pink: "border-fuchsia-400/15 bg-fuchsia-400/[0.08] text-fuchsia-300",
    green: "border-emerald-400/15 bg-emerald-400/[0.08] text-emerald-300",
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
      <p className="mt-2 text-xs leading-5 text-zinc-500">{detail}</p>
    </article>
  );
}
