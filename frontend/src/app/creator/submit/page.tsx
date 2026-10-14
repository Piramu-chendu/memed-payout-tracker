
"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Platform = "instagram" | "youtube";

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
  status: "live" | "paused" | "completed";
  milestones: Milestone[];
}

interface CampaignResponse {
  success: boolean;
  message?: string;
  campaigns?: Campaign[];
}

interface SubmissionResponse {
  success: boolean;
  message?: string;
  submission?: {
    _id?: string;
    id?: string;
    postUrl: string;
  };
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

function getCampaignId(campaign: Campaign): string {
  return campaign._id ?? campaign.id ?? "";
}

function formatCurrency(value: number): string {
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

function isValidPlatformUrl(value: string, platform: Platform): boolean {
  try {
    const url = new URL(value.trim());

    if (url.protocol !== "https:") {
      return false;
    }

    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");

    if (platform === "instagram") {
      return (
        hostname === "instagram.com" ||
        hostname.endsWith(".instagram.com")
      );
    }

    return (
      hostname === "youtube.com" ||
      hostname.endsWith(".youtube.com") ||
      hostname === "youtu.be"
    );
  } catch {
    return false;
  }
}

export default function SubmitPostPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [postUrl, setPostUrl] = useState("");
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadCampaigns = useCallback(async () => {
    const token = sessionStorage.getItem("memed_token");
    const storedUser = sessionStorage.getItem("memed_user");

    if (!token || !storedUser) {
      window.location.replace("/");
      return;
    }

    try {
      const user: unknown = JSON.parse(storedUser);

      if (
        typeof user !== "object" ||
        user === null ||
        !("role" in user) ||
        user.role !== "creator"
      ) {
        window.location.replace("/");
        return;
      }

      setLoadingCampaigns(true);
      setError("");

      const response = await fetch(`${API_BASE_URL}/api/campaigns/live`, {
        cache: "no-store",
      });

      const result = (await response.json()) as CampaignResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? "Unable to load live campaigns.");
      }

      const availableCampaigns = (result.campaigns ?? []).filter(
        (campaign) =>
          campaign.status === "live" &&
          campaign.totalBudget > campaign.spentAmount
      );

      setCampaigns(availableCampaigns);

      const queryCampaignId = new URLSearchParams(
        window.location.search
      ).get("campaignId");

      const requestedCampaign = availableCampaigns.find(
        (campaign) => getCampaignId(campaign) === queryCampaignId
      );

      setCampaignId((current) => {
        if (
          current &&
          availableCampaigns.some(
            (campaign) => getCampaignId(campaign) === current
          )
        ) {
          return current;
        }

        return requestedCampaign
          ? getCampaignId(requestedCampaign)
          : getCampaignId(availableCampaigns[0] ?? {
              name: "",
              platform: "instagram",
              totalBudget: 0,
              spentAmount: 0,
              status: "live",
              milestones: [],
            });
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to connect to the backend."
      );
    } finally {
      setLoadingCampaigns(false);
    }
  }, []);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  const selectedCampaign = campaigns.find(
    (campaign) => getCampaignId(campaign) === campaignId
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const token = sessionStorage.getItem("memed_token");

    if (!token) {
      setError("Your session has expired. Please sign in again.");
      return;
    }

    if (!selectedCampaign) {
      setError("Please select an available campaign.");
      return;
    }

    const normalizedUrl = postUrl.trim();

    if (!isValidPlatformUrl(normalizedUrl, selectedCampaign.platform)) {
      setError(
        selectedCampaign.platform === "instagram"
          ? "Enter a valid HTTPS Instagram post or Reel URL."
          : "Enter a valid HTTPS YouTube video or Shorts URL."
      );
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/submissions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campaignId: getCampaignId(selectedCampaign),
          postUrl: normalizedUrl,
        }),
      });

      const result = (await response.json()) as SubmissionResponse;

      if (response.status === 401 || response.status === 403) {
        sessionStorage.removeItem("memed_token");
        sessionStorage.removeItem("memed_user");
        window.location.replace("/");
        return;
      }

      if (!response.ok || !result.success) {
        const message = result.message ?? "Unable to submit your post.";

        if (message === "POST_ALREADY_SUBMITTED") {
          throw new Error("This post has already been submitted to this campaign.");
        }

        if (message === "CAMPAIGN_NOT_AVAILABLE") {
          throw new Error("This campaign is no longer available.");
        }

        if (message === "CAMPAIGN_BUDGET_EXHAUSTED") {
          throw new Error("This campaign has no remaining budget.");
        }

        if (message === "POST_PLATFORM_MISMATCH") {
          throw new Error("The post URL does not match the campaign platform.");
        }

        throw new Error(message);
      }

      setSuccess(
        "Your post was submitted successfully! You can return to the Creator Dashboard."
      );
      setPostUrl("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to connect to the backend."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function signOut() {
    sessionStorage.removeItem("memed_token");
    sessionStorage.removeItem("memed_user");
    window.location.replace("/");
  }

  return (
    <main className="min-h-screen bg-[#090a0e] px-5 py-8 text-white sm:px-8 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between gap-4">
          <a href="/creator" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500 text-lg font-black">
              M
            </span>
            <span className="text-xl font-bold">
              Meme<span className="text-violet-400">'d</span>
            </span>
          </a>

          <button
            type="button"
            onClick={signOut}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/[0.05]"
          >
            Sign out
          </button>
        </header>

        <a
          href="/creator"
          className="mt-9 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
        >
          <span aria-hidden="true">←</span>
          Back to Creator Dashboard
        </a>

        <header className="mt-7">
          <p className="text-sm font-medium tracking-wide text-violet-300">
            CREATOR SUBMISSION
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Submit your post
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
            Choose a live campaign and provide the public URL of your
            Instagram post or YouTube video.
          </p>
        </header>

        {error && (
          <div
            role="alert"
            className="mt-7 rounded-xl border border-red-400/20 bg-red-400/[0.07] px-4 py-3 text-sm leading-6 text-red-300"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mt-7 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] px-4 py-3 text-sm leading-6 text-emerald-300"
          >
            {success}
          </div>
        )}

        {loadingCampaigns ? (
          <div className="mt-8 h-64 animate-pulse rounded-2xl border border-white/[0.08] bg-[#101116]" />
        ) : campaigns.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-dashed border-white/[0.12] bg-[#101116] px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/15 bg-violet-400/[0.08] text-2xl text-violet-300">
              ◈
            </div>
            <h2 className="mt-5 text-lg font-semibold">
              No campaigns currently available
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
              There are no live campaigns with remaining budgets right now.
              Check back later or return to your dashboard.
            </p>
            <a
              href="/creator"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-violet-500 px-5 text-sm font-semibold transition hover:bg-violet-400"
            >
              Return to dashboard
            </a>
          </section>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-white/[0.08] bg-[#101116] p-5 sm:p-7"
            >
              <h2 className="text-lg font-semibold">Post details</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Select a campaign and enter your published post URL.
              </p>

              <div className="mt-6">
                <label
                  htmlFor="campaign"
                  className="mb-2 block text-sm font-medium text-zinc-300"
                >
                  Select campaign
                </label>
                <select
                  id="campaign"
                  value={campaignId}
                  onChange={(event) => {
                    setCampaignId(event.target.value);
                    setError("");
                    setSuccess("");
                  }}
                  required
                  className="h-12 w-full rounded-xl border border-white/10 bg-[#0b0c10] px-3 text-sm text-white outline-none transition focus:border-violet-400"
                >
                  {campaigns.map((campaign) => (
                    <option
                      key={getCampaignId(campaign)}
                      value={getCampaignId(campaign)}
                    >
                      {campaign.name} — {campaign.platform}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-6">
                <label
                  htmlFor="post-url"
                  className="mb-2 block text-sm font-medium text-zinc-300"
                >
                  Public post URL
                </label>
                <input
                  id="post-url"
                  type="url"
                  value={postUrl}
                  onChange={(event) => {
                    setPostUrl(event.target.value);
                    setError("");
                    setSuccess("");
                  }}
                  required
                  placeholder={
                    selectedCampaign?.platform === "youtube"
                      ? "https://www.youtube.com/shorts/..."
                      : "https://www.instagram.com/reel/..."
                  }
                  className="h-12 w-full rounded-xl border border-white/10 bg-black/25 px-4 text-sm outline-none transition placeholder:text-zinc-600 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/10"
                />
                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  Use an HTTPS URL from the selected platform. The backend
                  will also validate the URL and campaign eligibility.
                </p>
              </div>

              <div className="mt-6 rounded-xl border border-white/[0.07] bg-black/20 p-4">
                <p className="text-sm font-medium text-zinc-200">
                  Before submitting
                </p>
                <ul className="mt-3 space-y-2 text-xs leading-5 text-zinc-500">
                  <li>• Make sure the post URL is correct.</li>
                  <li>• Select the campaign that matches your platform.</li>
                  <li>• Each post can be submitted only once per campaign.</li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={submitting || loadingCampaigns || !selectedCampaign}
                className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-5 text-sm font-semibold text-white shadow-lg shadow-violet-500/15 transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Submitting post..." : "Submit post"}
                {!submitting && <span aria-hidden="true">→</span>}
              </button>
            </form>

            <aside className="space-y-6">
              {selectedCampaign && (
                <section className="rounded-2xl border border-white/[0.08] bg-[#101116] p-5 sm:p-6">
                  <p className="text-xs font-medium tracking-wide text-violet-300">
                    SELECTED CAMPAIGN
                  </p>
                  <div className="mt-4 flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-xl">
                      {selectedCampaign.platform === "instagram" ? "◎" : "▶"}
                    </div>
                    <div className="min-w-0">
                      <h2 className="break-words font-semibold">
                        {selectedCampaign.name}
                      </h2>
                      <p className="mt-1 text-xs capitalize text-zinc-500">
                        {selectedCampaign.platform} · Live campaign
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-zinc-500">Total budget</p>
                      <p className="mt-1.5 text-base font-semibold">
                        {formatCurrency(selectedCampaign.totalBudget)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Remaining</p>
                      <p className="mt-1.5 text-base font-semibold text-emerald-300">
                        {formatCurrency(
                          Math.max(
                            selectedCampaign.totalBudget -
                              selectedCampaign.spentAmount,
                            0
                          )
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-white/[0.07] pt-5">
                    <p className="text-sm font-medium">Payout milestones</p>
                    <div className="mt-3 space-y-3">
                      {selectedCampaign.milestones.map((milestone, index) => (
                        <div
                          key={`${milestone.viewThreshold}-${index}`}
                          className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-3"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {formatViews(milestone.viewThreshold)} views
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">
                              Milestone {index + 1}
                            </p>
                          </div>
                          <p className="shrink-0 text-sm font-semibold text-violet-200">
                            {formatCurrency(milestone.payout)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              <section className="rounded-2xl border border-violet-400/15 bg-violet-400/[0.045] p-5">
                <h3 className="text-sm font-semibold">How payouts work</h3>
                <p className="mt-2 text-xs leading-6 text-zinc-400">
                  Payout eligibility is based on the campaign&apos;s view
                  milestones. Your final allocated payout is limited by the
                  campaign&apos;s remaining budget.
                </p>
              </section>
            </aside>
          </div>
        )}

        <footer className="py-8 text-center text-xs text-zinc-600">
          Meme&apos;d Campaign Payout Tracker · Creator workspace
        </footer>
      </div>
    </main>
  );
}
