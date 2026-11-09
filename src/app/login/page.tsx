"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Sparkles, Mail, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devCodeTip, setDevCodeTip] = useState<string | null>(null);

  // Request 6-digit code
  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDevCodeTip(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send code");
      }

      setStep("code");
      if (data.devCode) {
        setDevCodeTip(`Development OTP: ${data.devCode}`);
        setCode(data.devCode); // Auto-fill for convenience during dev
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  }

  // Verify 6-digit code and authenticate
  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanCode = code.trim();
    if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      setError("Please enter the 6-digit code");
      return;
    }

    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: email.trim(),
        code: cleanCode,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid or expired code. Please request a new one.");
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("An unexpected error occurred during sign-in.");
      setLoading(false);
    }
  }

  // Google OAuth sign-in
  async function handleGoogleSignIn() {
    setError(null);
    setLoading(true);
    try {
      await signIn("google", { callbackUrl: "/" });
    } catch {
      setError("Google sign-in is not configured yet. Please use the 6-digit email code.");
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col justify-between h-full pt-safe pb-safe px-6 select-none bg-[var(--background)]">
      {/* Top Branding */}
      <div className="pt-8 flex flex-col items-center text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-accent-blue via-indigo-600 to-accent-green p-0.5 shadow-lg shadow-blue-500/20 flex items-center justify-center">
          <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-accent-blue" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            Remidify
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Fast swipe reminders for iPhone
          </p>
        </div>
      </div>

      {/* Auth Card Form */}
      <div className="w-full bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 shadow-xl space-y-5 my-auto">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center space-x-2 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {devCodeTip && (
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center space-x-2 text-emerald-400 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-mono font-medium">{devCodeTip}</span>
          </div>
        )}

        {step === "email" ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label
                htmlFor="email-input"
                className="block text-xs font-semibold text-zinc-300 mb-1.5"
              >
                Sign in with Email
              </label>
              <div className="relative">
                <input
                  id="email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                  className="w-full h-12 bg-zinc-900/90 border border-[var(--border)] rounded-xl px-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-accent-blue hover:bg-blue-600 active:scale-[0.98] text-white font-semibold rounded-xl text-sm flex items-center justify-center space-x-2 shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Send 6-Digit Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="code-input"
                  className="text-xs font-semibold text-zinc-300"
                >
                  Enter 6-Digit Code
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setCode("");
                  }}
                  className="text-[11px] text-accent-blue hover:underline"
                >
                  Change email
                </button>
              </div>
              <p className="text-[11px] text-zinc-400 mb-2">
                Sent to <span className="text-zinc-200">{email}</span>
              </p>
              <input
                id="code-input"
                type="text"
                pattern="[0-9]*"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                autoFocus
                required
                className="w-full h-12 bg-zinc-900/90 border border-[var(--border)] rounded-xl px-4 text-center font-mono text-xl tracking-widest text-white placeholder-zinc-600 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-accent-green hover:bg-emerald-600 active:scale-[0.98] text-white font-semibold rounded-xl text-sm flex items-center justify-center space-x-2 shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Verify & Sign In</span>
                  <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-[var(--border)]"></div>
          <span className="flex-shrink mx-3 text-[11px] text-zinc-500 uppercase tracking-wider">
            or
          </span>
          <div className="flex-grow border-t border-[var(--border)]"></div>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full h-12 bg-zinc-900 border border-[var(--border)] hover:bg-zinc-800 active:scale-[0.98] text-zinc-200 font-medium rounded-xl text-sm flex items-center justify-center space-x-3 transition-all"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>
      </div>

      {/* Persistent Sign-In Notice */}
      <div className="pb-4 flex items-center justify-center space-x-2 text-zinc-500 text-[11px] text-center">
        <ShieldCheck className="w-4 h-4 text-accent-blue/70 shrink-0" />
        <span>Stay signed in for 365 days inside the installed app</span>
      </div>
    </div>
  );
}
