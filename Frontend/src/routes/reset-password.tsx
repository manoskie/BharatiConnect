import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { KeyRound, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LangThemeToggle } from "@/components/LangThemeToggle";
import { completePasswordReset, validatePasswordResetCode } from "@/lib/firebase";

export const Route = createFileRoute("/reset-password")({
  validateSearch: z.object({
    mode: z.string().optional(),
    oobCode: z.string().optional(),
  }),
  head: () => ({
    meta: [
      { title: "Reset Password — BharatiConnect" },
      { name: "description", content: "Reset your BharatiConnect account password." },
      { property: "og:title", content: "Reset Password — BharatiConnect" },
      { property: "og:description", content: "Create a new password for your account." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const { t } = useTranslation();
  const { mode, oobCode } = Route.useSearch();
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [checkingCode, setCheckingCode] = useState(true);
  const valid =
    pw.length >= 8 && pw === confirm && !!oobCode && mode === "resetPassword" && !!accountEmail;

  useEffect(() => {
    if (!oobCode || mode !== "resetPassword") {
      setErrorMsg("Password reset link is missing or invalid. Request a new reset email.");
      setCheckingCode(false);
      return;
    }
    void validatePasswordResetCode(oobCode)
      .then(setAccountEmail)
      .catch((error: unknown) => {
        setErrorMsg(error instanceof Error ? error.message : "This password reset link is invalid or expired.");
      })
      .finally(() => setCheckingCode(false));
  }, [mode, oobCode]);

  const handleReset = async () => {
    if (!valid || loading) return;
    setErrorMsg(null);
    setLoading(true);
    try {
      await completePasswordReset(oobCode!, pw);
      setSuccess(true);
      setTimeout(() => {
        void navigate({ to: "/login" });
      }, 2500);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Failed to reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-b from-brand-soft/70 via-background to-background p-6">
      <LangThemeToggle />
      <div className="glass w-full max-w-sm space-y-5 rounded-3xl p-7">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <KeyRound className="size-5" />
          </span>
          <div>
            <p className="font-semibold">{t("auth.resetPassword", "Reset Password")}</p>
            <p className="text-xs text-muted-foreground">
              {t("auth.resetPasswordHelp", "Enter your new password below.")}
            </p>
          </div>
        </div>

        {accountEmail && (
          <p className="text-xs text-muted-foreground">Set a new password for {accountEmail}.</p>
        )}

        {!oobCode && (
          <p className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
            Reset code missing — request a new password reset email.
          </p>
        )}

        {errorMsg && (
          <p className="rounded-xl bg-destructive/10 p-2.5 text-xs text-destructive">
            {errorMsg}
          </p>
        )}

        {success ? (
          <div className="space-y-4 text-center">
            <div className="flex justify-center text-success">
              <CheckCircle2 className="size-12" />
            </div>
            <p className="text-sm font-medium">
              {t("auth.resetSuccess", "Password reset successful! Redirecting to login...")}
            </p>
            <Button asChild className="w-full">
              <Link to="/login">{t("auth.login", "Log In")}</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="pw">{t("auth.newPassword", "New Password")}</Label>
              <Input
                id="pw"
                type="password"
                className="h-12"
                placeholder="At least 8 characters"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c">{t("auth.confirmPassword", "Confirm Password")}</Label>
              <Input
                id="c"
                type="password"
                className="h-12"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            {pw.length > 0 && pw.length < 8 && (
              <p className="text-xs text-muted-foreground">
                Password must be at least 8 characters.
              </p>
            )}
            {confirm.length > 0 && pw !== confirm && (
              <p className="text-xs text-destructive">
                Passwords do not match.
              </p>
            )}
            <Button
              className="h-12 w-full"
              disabled={!valid || loading || checkingCode}
              onClick={handleReset}
            >
              {checkingCode ? "Checking link..." : loading ? "..." : t("auth.resetPassword", "Reset Password")}
            </Button>
            <div className="text-center">
              <Link to="/login" className="text-xs text-muted-foreground hover:underline">
                Back to Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
