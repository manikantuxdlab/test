import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSession, findUserForgivingly } from "@/lib/session";
import { sendPasswordResetEmail } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { findUserByUsername } from "@/lib/firestore/users";
import { users } from "@/lib/mock-data";

import { Wordmark } from "@/components/AppShell";
import { HardHat, Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — X3 Communications" },
      { name: "description", content: "Secure sign in for X3 crew, foremen, and admin." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, loginWithCredentials, setSelectedMarket, isHydrated } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [resetMsg, setResetMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function resolveEmail(identifier: string): Promise<string> {
    const id = identifier.trim().toLowerCase();
    if (!id) throw new Error("Enter your username or email.");
    if (id.includes("@")) return id;

    // Resolve directory edits to support custom or edited emails
    try {
      const snap = await getDocs(collection(db, "directoryEdits"));
      const edits = snap.docs.map((d) => d.data() as any);
      const editsMap = new Map(edits.map((e) => [e.id, e]));

      const merged = users.map((u) => {
        const e = editsMap.get(u.id);
        if (!e) return u;
        return { ...u, ...(e.patch ?? {}) };
      });
      const added = edits.filter((e) => e.added).map((e) => e.added!);
      const allMerged = [...merged, ...added];

      const mu = findUserForgivingly(id, allMerged);
      if (mu) return mu.email;
    } catch (e) {
      console.error("[login] directoryEdits lookup failed", e);
    }

    const prof = await findUserByUsername(id);
    if (prof) return prof.email;
    const mu = findUserForgivingly(id, users);
    if (!mu) throw new Error("Account not found.");
    return mu.email;
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setResetMsg(null);
    setResetBusy(true);
    try {
      const target = await resolveEmail(resetIdentifier);
      const actionCodeSettings =
        typeof window !== "undefined"
          ? { url: window.location.origin + "/login", handleCodeInApp: false }
          : undefined;
      await sendPasswordResetEmail(auth, target, actionCodeSettings);
      setResetMsg({
        kind: "ok",
        text: `Reset link sent to ${target}. Check your inbox (and spam).`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setResetMsg({ kind: "err", text: msg.replace(/^Firebase:\s*/, "") });
    } finally {
      setResetBusy(false);
    }
  }

  useEffect(() => {
    if (!isHydrated) return;
    if (user) navigate({ to: "/" });
  }, [user, navigate, isHydrated]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await loginWithCredentials(email, password);
      setSelectedMarket(null);
      navigate({ to: "/" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/auth\/invalid|auth\/wrong-password|auth\/user-not-found|invalid-credential/i.test(msg)) {
        setError("Invalid credentials. If this is a fresh install, run /admin-seed first.");
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dark min-h-screen w-full flex items-center justify-center bg-[#050505] px-4 py-8 md:py-16 text-foreground font-sans overflow-x-hidden">
      {/* Constrained width container for the content */}
      <div className="w-full max-w-[400px] flex flex-col min-h-[750px] justify-between p-2">
        {/* Main Top Brand Info */}
        <div className="flex flex-col items-center text-center mt-6">
          {/* White Box Square Logo */}
          <div className="mb-6 flex justify-center drop-shadow-[0_0_15px_rgba(255,255,255,0.08)]">
            <Wordmark size="lg" />
          </div>

          <h1 className="text-xl md:text-2xl font-black uppercase tracking-[0.05em] text-white">
            X3 Communications
          </h1>

          <p className="mt-2 text-[10px] md:text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
            Acknowledgements • Schedule • Directory
          </p>
        </div>

        {/* Form Panel Card */}
        <form
          onSubmit={handleSubmit}
          className="w-full mt-6 mb-8 rounded-2xl border border-zinc-900 bg-[#0d0d0d] p-5 md:p-6 space-y-5 shadow-[0_8px_30px_rgb(0,0,0,0.4)]"
        >
          {/* Field: Username */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500 block">
              Username or Email
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="text"
              required
              placeholder="socal.charlie.tran"
              className="h-12 w-full rounded-md border border-zinc-800 bg-[#121212] px-4 text-sm text-white placeholder:text-zinc-700 outline-none transition focus:border-[#c61a29] focus:ring-1 focus:ring-[#c61a29]"
            />
          </div>

          {/* Field: Password */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500 block">
              Password
            </label>
            <div className="relative">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPw ? "text" : "password"}
                required
                placeholder="••••••••••"
                className="h-12 w-full rounded-md border border-zinc-800 bg-[#121212] px-4 pr-11 text-sm text-white placeholder:text-zinc-700 outline-none transition focus:border-[#c61a29] focus:ring-1 focus:ring-[#c61a29]"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition"
                aria-label={showPw ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error ? (
            <p className="text-xs font-semibold text-red-500 leading-snug text-center">{error}</p>
          ) : null}

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={busy}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-md bg-[#c61a29] text-sm font-bold uppercase tracking-[0.12em] text-white shadow-[0_4px_20px_rgba(198,26,41,0.25)] transition hover:bg-[#b01421] active:scale-[0.98] disabled:opacity-60"
          >
            <HardHat className="h-4.5 w-4.5 text-white" />
            {busy ? "Signing in…" : "Sign In"}
          </button>

          {/* Forgot Password */}
          <button
            type="button"
            onClick={() => {
              setResetIdentifier(email);
              setResetMsg(null);
              setResetOpen(true);
            }}
            className="block w-full text-center text-[10px] md:text-xs font-bold uppercase tracking-[0.15em] text-[#c61a29] hover:underline transition"
          >
            Forgot password?
          </button>
        </form>

        {/* Bottom Footer Info */}
        <div className="text-center text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600 mb-2">
          V1.0 Prototype • Authorized Personnel Only
        </div>
      </div>

      {/* Dialog for password reset */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="dark border-zinc-900 bg-[#0d0d0d] text-white rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white uppercase tracking-wider">
              Reset your password
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-sm">
              Enter your username or email and we'll send a password reset link.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReset} className="space-y-4 pt-2">
            <input
              value={resetIdentifier}
              onChange={(e) => setResetIdentifier(e.target.value)}
              type="text"
              required
              placeholder="Username or email"
              className="h-11 w-full rounded-md border border-zinc-800 bg-[#121212] px-4 text-sm text-white placeholder:text-zinc-700 outline-none focus:border-[#c61a29] focus:ring-1 focus:ring-[#c61a29]"
            />
            {resetMsg ? (
              <p
                className={`text-xs font-semibold ${resetMsg.kind === "ok" ? "text-green-400" : "text-red-400"}`}
              >
                {resetMsg.text}
              </p>
            ) : null}
            <DialogFooter className="sm:justify-start">
              <button
                type="submit"
                disabled={resetBusy}
                className="h-11 w-full rounded-md bg-[#c61a29] px-4 text-xs font-bold uppercase tracking-[0.12em] text-white hover:bg-[#b01421] transition active:scale-[0.98] disabled:opacity-60"
              >
                {resetBusy ? "Sending…" : "Send reset link"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
