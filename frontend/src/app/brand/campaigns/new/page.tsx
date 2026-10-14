
"use client";

import { FormEvent, useEffect, useState } from "react";

type Platform = "instagram" | "youtube";

interface Milestone {
  viewThreshold: string;
  payout: string;
}

interface AuthUser {
  role: string;
}

interface CreateCampaignResponse {
  success: boolean;
  message?: string;
  campaign?: {
    _id?: string;
    id?: string;
    name: string;
  };
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export default function CreateCampaignPage() {
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [totalBudget, setTotalBudget] = useState("");
  const [milestones, setMilestones] = useState<Milestone[]>([
    { viewThreshold: "10000", payout: "500" },
    { viewThreshold: "50000", payout: "2000" },
    { viewThreshold: "100000", payout: "5000" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
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
        (user as AuthUser).role !== "brand"
      ) {
        window.location.replace("/");
      }
    } catch {
      sessionStorage.removeItem("memed_token");
      sessionStorage.removeItem("memed_user");
      window.location.replace("/");
    }
  }, []);

  function updateMilestone(
    index: number,
    field: keyof Milestone,
    value: string
  ) {
    setMilestones((current) =>
      current.map((milestone, currentIndex) =>
        currentIndex === index
          ? { ...milestone, [field]: value }
          : milestone
      )
    );
  }

  function addMilestone() {
    setMilestones((current) => [
      ...current,
      { viewThreshold: "", payout: "" },
    ]);
  }

  function removeMilestone(index: number) {
    setMilestones((current) =>
      current.filter((_, currentIndex) => currentIndex !== index)
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const token = sessionStorage.getItem("memed_token");

    if (!token) {
      setError("Your session has expired. Please sign in again.");
      return;
    }

    const budget = Number(totalBudget);

    if (!Number.isSafeInteger(budget) || budget <= 0) {
      setError("Enter a valid positive whole-number campaign budget.");
      return;
    }

    if (milestones.length === 0) {
      setError("Add at least one payout milestone.");
      return;
    }

    const parsedMilestones = milestones.map((milestone) => ({
      viewThreshold: Number(milestone.viewThreshold),
      payout: Number(milestone.payout),
    }));

    for (let index = 0; index < parsedMilestones.length; index += 1) {
      const milestone = parsedMilestones[index];

      if (
        !Number.isSafeInteger(milestone.viewThreshold) ||
        milestone.viewThreshold <= 0 ||
        !Number.isSafeInteger(milestone.payout) ||
        milestone.payout <= 0
      ) {
        setError(
          `Milestone ${index + 1}: enter positive whole numbers for views and payout.`
        );
        return;
      }

      if (
        index > 0 &&
        milestone.viewThreshold <=
          parsedMilestones[index - 1].viewThreshold
      ) {
        setError("View thresholds must be in strictly increasing order.");
        return;
      }

      if (
        index > 0 &&
        milestone.payout < parsedMilestones[index - 1].payout
      ) {
        setError("Payout amounts must not decrease as view thresholds rise.");
        return;
      }

      if (milestone.payout > budget) {
        setError(
          `Milestone ${index + 1}: the payout cannot exceed the campaign budget.`
        );
        return;
      }
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/campaigns`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          platform,
          totalBudget: budget,
          milestones: parsedMilestones,
        }),
      });

      const result =
        (await response.json()) as CreateCampaignResponse;

      if (response.status === 401 || response.status === 403) {
        sessionStorage.removeItem("memed_token");
        sessionStorage.removeItem("memed_user");
        window.location.replace("/");
        return;
      }

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ?? "Unable to create the campaign."
        );
      }

      setSuccess("Campaign created successfully. Redirecting to your dashboard...");

      window.setTimeout(() => {
        window.location.assign("/brand");
      }, 900);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to connect to the backend."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#090a0e] px-5 py-8 text-white sm:px-8 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <a
          href="/brand"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
        >
          <span aria-hidden="true">←</span>
          Back to dashboard
        </a>

        <header className="mt-8">
          <p className="text-sm font-medium tracking-wide text-violet-300">
            CAMPAIGN SETUP
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Create a campaign
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
            Define your campaign budget and the view milestones creators can
            reach to earn rewards.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <section className="rounded-2xl border border-white/[0.08] bg-[#101116] p-5 sm:p-7">
            <div className="mb-6">
              <h2 className="text-lg font-semibold">Campaign details</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Give your campaign a name and choose its social platform.
              </p>
            </div>

            <div>
              <label
                htmlFor="campaign-name"
                className="mb-2 block text-sm font-medium text-zinc-300"
              >
                Campaign name
              </label>
              <input
                id="campaign-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                minLength={2}
                maxLength={120}
                required
                placeholder="e.g. Summer Meme Campaign"
                className="h-12 w-full rounded-xl border border-white/10 bg-black/25 px-4 text-sm outline-none transition placeholder:text-zinc-600 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/10"
              />
            </div>

            <fieldset className="mt-6">
              <legend className="mb-3 text-sm font-medium text-zinc-300">
                Social platform
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {(["instagram", "youtube"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPlatform(item)}
                    aria-pressed={platform === item}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                      platform === item
                        ? "border-violet-400/60 bg-violet-400/[0.08]"
                        : "border-white/[0.08] bg-black/20 hover:border-white/20"
                    }`}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] text-xl">
                      {item === "instagram" ? "◎" : "▶"}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">
                        {item === "instagram" ? "Instagram" : "YouTube"}
                      </span>
                      <span className="mt-1 block text-xs text-zinc-500">
                        {item === "instagram"
                          ? "Reels and posts"
                          : "Videos and Shorts"}
                      </span>
                    </span>
                    <span className="ml-auto text-violet-300">
                      {platform === item ? "✓" : ""}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="mt-6">
              <label
                htmlFor="campaign-budget"
                className="mb-2 block text-sm font-medium text-zinc-300"
              >
                Total budget (₹)
              </label>
              <input
                id="campaign-budget"
                type="number"
                min="1"
                step="1"
                value={totalBudget}
                onChange={(event) => setTotalBudget(event.target.value)}
                required
                placeholder="e.g. 10000"
                className="h-12 w-full rounded-xl border border-white/10 bg-black/25 px-4 text-sm outline-none transition placeholder:text-zinc-600 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/10"
              />
              <p className="mt-2 text-xs text-zinc-500">
                All payouts allocated to this campaign are limited by this budget.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-[#101116] p-5 sm:p-7">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-semibold">Payout milestones</h2>
                <p className="mt-1 text-sm leading-5 text-zinc-500">
                  Set the view count needed to unlock each payout.
                </p>
              </div>
              <button
                type="button"
                onClick={addMilestone}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-violet-400/25 px-4 text-sm font-medium text-violet-200 transition hover:bg-violet-400/[0.08]"
              >
                <span aria-hidden="true">+</span>
                Add milestone
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {milestones.map((milestone, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-white/[0.07] bg-black/15 p-4 sm:p-5"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">
                      Milestone {index + 1}
                    </p>
                    {milestones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMilestone(index)}
                        className="text-xs font-medium text-red-300 transition hover:text-red-200"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor={`views-${index}`}
                        className="mb-2 block text-sm text-zinc-400"
                      >
                        Required views
                      </label>
                      <input
                        id={`views-${index}`}
                        type="number"
                        min="1"
                        step="1"
                        value={milestone.viewThreshold}
                        onChange={(event) =>
                          updateMilestone(
                            index,
                            "viewThreshold",
                            event.target.value
                          )
                        }
                        required
                        placeholder="e.g. 10000"
                        className="h-11 w-full rounded-lg border border-white/10 bg-[#101116] px-3 text-sm outline-none transition placeholder:text-zinc-600 focus:border-violet-400"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`payout-${index}`}
                        className="mb-2 block text-sm text-zinc-400"
                      >
                        Payout amount (₹)
                      </label>
                      <input
                        id={`payout-${index}`}
                        type="number"
                        min="1"
                        step="1"
                        value={milestone.payout}
                        onChange={(event) =>
                          updateMilestone(index, "payout", event.target.value)
                        }
                        required
                        placeholder="e.g. 500"
                        className="h-11 w-full rounded-lg border border-white/10 bg-[#101116] px-3 text-sm outline-none transition placeholder:text-zinc-600 focus:border-violet-400"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
              <p className="text-xs leading-5 text-zinc-400">
                Thresholds must increase from one milestone to the next, and
                payout amounts cannot decrease. Payouts are cumulative
                entitlements, not added together at every threshold.
              </p>
            </div>
          </section>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-400/20 bg-red-400/[0.07] px-4 py-3 text-sm leading-6 text-red-300"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] px-4 py-3 text-sm leading-6 text-emerald-300"
            >
              {success}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <a
              href="/brand"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-white/10 px-6 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.04]"
            >
              Cancel
            </a>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-violet-500 px-6 text-sm font-semibold text-white shadow-lg shadow-violet-500/15 transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating campaign..." : "Create campaign"}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </div>
        </form>

        <footer className="py-8 text-center text-xs text-zinc-600">
          Meme&apos;d Campaign Payout Tracker
        </footer>
      </div>
    </main>
  );
}
