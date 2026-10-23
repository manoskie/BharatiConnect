import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LangThemeToggle } from "@/components/LangThemeToggle";
import { actions, useAppState } from "@/lib/store";
import { loginWithEmail, logoutUser, sendPasswordReset } from "@/lib/firebase";
import { fsGetAdminRole, fsGetUser } from "@/lib/firebase-service";
import type { User } from "@/lib/types";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — BharatiConnect" },
      { name: "description", content: "Log in to BharatiConnect with your Akshar Bharati account." },
      { property: "og:title", content: "Log in — BharatiConnect" },
      { property: "og:description", content: "Staff login for BharatiConnect." },
    ],
  }),
  component: Login,
});

export function LoginCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { authReady, sessionUser } = useAppState();
  const sessionRole = sessionUser?.role;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authReady || !sessionRole) return;
    void navigate({
      to: sessionRole === "admin" || sessionRole === "owner" ? "/admin" : "/reading",
      replace: true,
    });
  }, [authReady, navigate, sessionRole]);

  const submit = async () => {
    if (loading) return;
    if (!email.trim() || !password) {
      setErrorMessage("Enter your email address and password.");
      return;
    }
    setErrorMessage(null);
    setLoading(true);
    try {
      const firebaseUser = await loginWithEmail(email, password);
      const [adminRole, profile] = await Promise.all([
        fsGetAdminRole(firebaseUser.uid),
        fsGetUser(firebaseUser.uid),
      ]);
      if (!profile) {
        await logoutUser();
        throw new Error("This account has not been invited yet. Ask an administrator to add your account.");
      }
      if (!profile.active) {
        await logoutUser();
        throw new Error("This account has been deactivated. Contact an administrator.");
      }
      const profileRole = profile.role;
      const profileIsAdmin = profileRole === "admin" || profileRole === "owner";
      if (
        (profileRole !== "staff" && !profileIsAdmin) ||
        (profileIsAdmin && adminRole !== profileRole) ||
        (profileRole === "staff" && adminRole !== null)
      ) {
        await logoutUser();
        throw new Error("This account's role is not configured correctly. Contact an administrator.");
      }

      const user: User = {
        ...profile,
        id: firebaseUser.uid,
        email: firebaseUser.email || profile.email,
        name: firebaseUser.displayName || profile.name,
        role: profileRole,
      };
      if (profileIsAdmin) actions.adminLogin(user);
      else actions.login(user);
      void navigate({ to: profileIsAdmin ? "/admin" : "/reading", replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("auth.invalidCredentials", "Invalid credentials"));
    } finally {
      setLoading(false);
    }
  };

  const requestPasswordReset = async () => {
    if (!email.trim() || loading) {
      setResetMessage("Enter your email address in the login form first.");
      return;
    }
    setLoading(true);
    setResetMessage(null);
    try {
      await sendPasswordReset(email);
      setResetMessage("If an account exists for this email, Firebase has sent a password reset link.");
    } catch (error) {
      setResetMessage(error instanceof Error ? error.message : "Unable to send the password reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass w-full max-w-sm space-y-5 rounded-3xl p-7">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <BookOpen className="size-5" />
        </span>
        <div>
          <p className="font-serif text-lg font-semibold">{t("app.name")}</p>
          <p className="text-xs text-muted-foreground">{t("app.org")}</p>
        </div>
      </div>

      {errorMessage && (
        <p role="alert" className="rounded-xl bg-destructive/10 p-2.5 text-xs text-destructive">
          {errorMessage}
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          className="h-12"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void submit();
          }}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="login-password">{t("auth.password")}</Label>
        <div className="relative">
          <Input
            id="login-password"
            type={passwordVisible ? "text" : "password"}
            autoComplete="current-password"
            className="h-12 pr-12"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void submit();
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 size-10 -translate-y-1/2"
            aria-label={passwordVisible ? "Hide password" : "Show password"}
            aria-pressed={passwordVisible}
            onClick={() => setPasswordVisible((visible) => !visible)}
          >
            {passwordVisible ? (
              <EyeOff aria-hidden="true" className="size-4" />
            ) : (
              <Eye aria-hidden="true" className="size-4" />
            )}
          </Button>
        </div>
      </div>
      <Button className="h-12 w-full" disabled={loading} onClick={() => void submit()}>
        {loading ? "..." : t("auth.login")}
      </Button>
      <Button variant="link" className="w-full text-xs" onClick={() => setResetOpen(true)}>
        {t("auth.forgot")}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Accounts are invite-only. Contact an administrator if you need access.
      </p>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("auth.forgot")}</DialogTitle>
            <DialogDescription>{t("auth.forgotHelp")}</DialogDescription>
          </DialogHeader>
          {resetMessage && <p role="status" className="text-sm text-muted-foreground">{resetMessage}</p>}
          <Button className="w-full" disabled={loading} onClick={() => void requestPasswordReset()}>
            {loading ? "..." : "Send password reset email"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Login() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-b from-brand-soft/70 via-background to-background p-6">
      <div className="flex items-center gap-2">
        <LangThemeToggle />
      </div>
      <LoginCard />
    </div>
  );
}
