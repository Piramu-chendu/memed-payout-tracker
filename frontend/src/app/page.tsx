
"use client";

import { FormEvent, useState } from "react";

type UserRole = "brand" | "creator";
type AuthMode = "login" | "signup";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthSuccess {
  success: true;
  token: string;
  user: AuthUser;
}

interface AuthFailure {
  success: false;
  message: string;
}

type AuthResponse = AuthSuccess | AuthFailure;

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export default function Home() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [role, setRole] = useState<UserRole>("creator");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (mode === "signup" && name.trim().length < 2) {
      setError("Your name must contain at least 2 characters.");
      return;
    }

    if (password.length < (mode === "signup" ? 8 : 1)) {
      setError(
        mode === "signup"
          ? "Your password must contain at least 8 characters."
          : "Please enter your password."
      );
      return;
    }

    setLoading(true);

    try {
      const endpoint =
        mode === "signup" ? "/api/auth/signup" : "/api/auth/login";

      const payload =
        mode === "signup"
          ? {
              name: name.trim(),
              email: email.trim(),
              password,
              role,
            }
          : {
              email: email.trim(),
              password,
            };

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as AuthResponse;

      if (!response.ok || !result.success) {
        setError(
          result.success
            ? "Something went wrong. Please try again."
            : result.message
        );
        return;
      }

      sessionStorage.setItem("memed_token", result.token);
      sessionStorage.setItem("memed_user", JSON.stringify(result.user));

setSuccessMessage(
  `Welcome${result.user.name ? `, ${result.user.name}` : ""}! Authentication successful.`
);

if (result.user.role === "brand") {
  window.location.assign("/brand");
} else {
  window.location.assign("/creator");
}

      // Dashboard navigation will be added after authentication is tested.
    } catch {
      setError(
        "Unable to connect to the server. Make sure your backend is running on port 5000."
      );
    } finally {
      setLoading(false);
    }
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setSuccessMessage("");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#08090c] text-white">
      <div className="pointer-events-none absolute -left-40 top-20 h-96 w-96 rounded-full bg-violet-600/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-48 right-0 h-[32rem] w-[32rem] rounded-full bg-fuchsia-600/10 blur-[140px]" />

      <header className="relative z-10 mx-auto flex w-full max-w-[1440px] items-center justify-between px-6 py-6 sm:px-10 lg:px-16">
        <a href="/" className="flex items-center gap-3" aria-label="Meme'd home">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500 text-lg font-black shadow-lg shadow-violet-500/20">
            M
          </span>
          <span className="text-xl font-bold tracking-tight">
            Meme<span className="text-violet-400">'d</span>
          </span>
        </a>

        <div className="hidden items-center gap-2 text-sm text-zinc-400 sm:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Campaign payouts, made clear.
        </div>
      </header>

      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-88px)] w-full max-w-[1440px] items-center gap-12 px-6 pb-12 pt-4 sm:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20 lg:px-16 lg:pb-20">
        <div className="max-w-2xl">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/[0.07] px-4 py-2 text-xs font-medium tracking-wide text-violet-200 sm:text-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            THE CREATOR CAMPAIGN PLATFORM
          </div>

          <h1 className="max-w-xl text-4xl font-semibold leading-[1.12] tracking-tight sm:text-5xl lg:text-7xl">
            Create buzz.
            <br />
            Track impact.
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent">
              Get rewarded.
            </span>
          </h1>

          <p className="mt-6 max-w-lg text-base leading-7 text-zinc-400 sm:text-lg sm:leading-8">
            A simpler way for brands to launch meme campaigns and for creators
            to turn post performance into milestone-based earnings.
          </p>

          <div className="mt-10 grid max-w-lg grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 sm:p-5">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-violet-400/10 text-violet-300">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                  <path d="M4 7.5h16M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="m8 12 2.5 2.5L16 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-sm font-semibold sm:text-base">Campaigns</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500 sm:text-sm">Discover opportunities</p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 sm:p-5">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-fuchsia-400/10 text-fuchsia-300">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                  <path d="M12 3v18M16.5 7.5c0-1.7-1.8-3-4.5-3S7.5 5.7 7.5 7.5 9.3 10 12 10s4.5 1.3 4.5 3-1.8 3.5-4.5 3.5-4.5-1.3-4.5-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </div>
              <p className="text-sm font-semibold sm:text-base">Milestones</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500 sm:text-sm">Performance-based rewards</p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 sm:p-5">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                  <path d="M4 19V5m0 14h16M7 15l4-4 3 2 5-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M15 7h4v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-sm font-semibold sm:text-base">Insights</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500 sm:text-sm">Monitor your results</p>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-zinc-500">
            <span className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span>
              Clear payout milestones
            </span>
            <span className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span>
              Campaign budget tracking
            </span>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="rounded-[28px] border border-white/[0.10] bg-[#101116]/95 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-9">
            <div className="mb-8">
              <p className="text-sm font-medium text-violet-300">
                YOUR NEXT CHAPTER STARTS HERE
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                {mode === "login" ? "Welcome back." : "Join Meme'd."}
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                {mode === "login"
                  ? "Sign in to continue to your campaign workspace."
                  : "Create an account to get started with your campaigns."}
              </p>
            </div>

            <div className="mb-7 grid grid-cols-2 rounded-xl border border-white/[0.08] bg-black/30 p-1">
              <button
                type="button"
                onClick={() => changeMode("login")}
                className={`rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                  mode === "login"
                    ? "bg-white text-zinc-950 shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => changeMode("signup")}
                className={`rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                  mode === "signup"
                    ? "bg-white text-zinc-950 shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Create account
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === "signup" && (
                <>
                  <div>
                    <label htmlFor="name" className="mb-2 block text-sm font-medium text-zinc-300">
                      Full name
                    </label>
                    <input
                      id="name"
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      minLength={2}
                      maxLength={80}
                      required
                      placeholder="Enter your name"
                      className="h-12 w-full rounded-xl border border-white/[0.10] bg-black/25 px-4 text-sm outline-none transition placeholder:text-zinc-600 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/10"
                    />
                  </div>

                  <fieldset>
                    <legend className="mb-2 text-sm font-medium text-zinc-300">
                      I am joining as a
                    </legend>
                    <div className="grid grid-cols-2 gap-3">
                      {(["creator", "brand"] as const).map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setRole(item)}
                          aria-pressed={role === item}
                          className={`rounded-xl border px-4 py-3 text-left transition ${
                            role === item
                              ? "border-violet-400/70 bg-violet-400/10 text-white"
                              : "border-white/[0.10] bg-black/20 text-zinc-400 hover:border-white/20"
                          }`}
                        >
                          <span className="block text-sm font-semibold">
                            {item === "creator" ? "Creator" : "Brand"}
                          </span>
                          <span className="mt-1 block text-xs text-zinc-500">
                            {item === "creator"
                              ? "Publish & earn"
                              : "Launch campaigns"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </>
              )}

              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-zinc-300">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  maxLength={254}
                  required
                  placeholder="you@example.com"
                  className="h-12 w-full rounded-xl border border-white/[0.10] bg-black/25 px-4 text-sm outline-none transition placeholder:text-zinc-600 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/10"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label htmlFor="password" className="block text-sm font-medium text-zinc-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="text-xs font-medium text-violet-300 transition hover:text-violet-200"
                  >
                    {showPassword ? "Hide password" : "Show password"}
                  </button>
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={mode === "signup" ? 8 : undefined}
                  maxLength={128}
                  required
                  placeholder={mode === "signup" ? "At least 8 characters" : "Enter your password"}
                  className="h-12 w-full rounded-xl border border-white/[0.10] bg-black/25 px-4 text-sm outline-none transition placeholder:text-zinc-600 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/10"
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-400/20 bg-red-400/[0.08] px-4 py-3 text-sm leading-6 text-red-300"
                >
                  {error}
                </div>
              )}

              {successMessage && (
                <div
                  role="status"
                  className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.08] px-4 py-3 text-sm leading-6 text-emerald-300"
                >
                  {successMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Please wait..."
                  : mode === "login"
                    ? "Sign in to your account"
                    : "Create your account"}
                {!loading && <span aria-hidden="true">→</span>}
              </button>
            </form>

            <p className="mt-6 text-center text-xs leading-5 text-zinc-500">
              By continuing, you agree to use the platform responsibly and
              provide accurate campaign information.
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-zinc-600">
            Meme'd Campaign Payout Tracker · Built for creators and brands
          </p>
        </div>
      </section>
    </main>
  );
}
