import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  deleteUser,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { AppShell } from "@/components/AppShell";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, logout } = useSession();
  const router = useRouter();

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdMsg, setPwdMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pwdSaving, setPwdSaving] = useState(false);

  const [deletePwd, setDeletePwd] = useState("");
  const [delMsg, setDelMsg] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (!user) {
    return (
      <AppShell title="Profile">
        <div className="text-sm text-muted-foreground">Please sign in to view your profile.</div>
      </AppShell>
    );
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdMsg(null);
    if (newPwd.length < 8) {
      setPwdMsg({ type: "err", text: "New password must be at least 8 characters." });
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdMsg({ type: "err", text: "Passwords don't match." });
      return;
    }
    const fbUser = auth.currentUser;
    if (!fbUser?.email) {
      setPwdMsg({ type: "err", text: "No active session." });
      return;
    }
    setPwdSaving(true);
    try {
      const cred = EmailAuthProvider.credential(fbUser.email, currentPwd);
      await reauthenticateWithCredential(fbUser, cred);
      await updatePassword(fbUser, newPwd);
      setPwdMsg({ type: "ok", text: "Password updated successfully." });
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not update password.";
      setPwdMsg({ type: "err", text: msg });
    } finally {
      setPwdSaving(false);
    }
  }

  async function handleDeleteAccount() {
    setDelMsg(null);
    const fbUser = auth.currentUser;
    if (!fbUser?.email) {
      setDelMsg("No active session.");
      return;
    }
    setDeleting(true);
    try {
      const cred = EmailAuthProvider.credential(fbUser.email, deletePwd);
      await reauthenticateWithCredential(fbUser, cred);
      await deleteUser(fbUser);
      logout();
      router.navigate({ to: "/login" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not delete account.";
      setDelMsg(msg);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AppShell title="Profile" subtitle="Manage your account">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Account info */}
        <section className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">
              {user.initials}
            </div>
            <div className="min-w-0">
              <div className="text-base font-bold">{user.name}</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                {user.role}
              </div>
              <div className="mt-1 truncate text-xs text-muted-foreground">{user.email}</div>
            </div>
          </div>
        </section>

        {/* Change password */}
        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider">Change Password</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Enter your current password and choose a new one.
          </p>
          <form onSubmit={handleChangePassword} className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="current-pwd">Current password</Label>
              <Input
                id="current-pwd"
                type="password"
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-pwd">New password</Label>
              <Input
                id="new-pwd"
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-pwd">Confirm new password</Label>
              <Input
                id="confirm-pwd"
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                required
              />
            </div>
            {pwdMsg && (
              <div
                className={`text-xs ${
                  pwdMsg.type === "ok" ? "text-green-500" : "text-destructive"
                }`}
              >
                {pwdMsg.text}
              </div>
            )}
            <Button type="submit" disabled={pwdSaving}>
              {pwdSaving ? "Updating..." : "Update password"}
            </Button>
          </form>
        </section>

        {/* Delete account */}
        <section className="rounded-lg border border-destructive/40 bg-card p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-destructive">
            Delete Account
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Permanently delete your account and sign-in credentials. This action cannot be undone.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="mt-4">
                Delete my account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete your sign-in credentials. Confirm your password to
                  proceed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-1.5">
                <Label htmlFor="del-pwd">Current password</Label>
                <Input
                  id="del-pwd"
                  type="password"
                  value={deletePwd}
                  onChange={(e) => setDeletePwd(e.target.value)}
                />
                {delMsg && <div className="text-xs text-destructive">{delMsg}</div>}
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    handleDeleteAccount();
                  }}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? "Deleting..." : "Delete permanently"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      </div>
    </AppShell>
  );
}
