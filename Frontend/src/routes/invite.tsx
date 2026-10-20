import { createFileRoute, Link } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { LangThemeToggle } from "@/components/LangThemeToggle";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/invite")({
  head: () => ({
    meta: [
      { title: "Accept invitation — BharatiConnect" },
      { name: "description", content: "Activate your BharatiConnect staff account." },
      { property: "og:title", content: "Accept invitation — BharatiConnect" },
      { property: "og:description", content: "Set your password to join BharatiConnect." },
    ],
  }),
  component: Invite,
});

function Invite() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-b from-brand-soft/70 via-background to-background p-6">
      <LangThemeToggle />
      <div className="glass w-full max-w-sm space-y-5 rounded-3xl p-7">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <MailCheck className="size-5" />
          </span>
          <div>
            <p className="font-semibold">{t("auth.acceptInvite")}</p>
            <p className="text-xs text-muted-foreground">{t("auth.inviteHelp")}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          This invitation link is no longer valid. Ask your administrator to resend the Firebase
          password setup email, then follow the link in that email.
        </p>
        <Button asChild className="h-12 w-full">
          <Link to="/login">{t("auth.login")}</Link>
        </Button>
      </div>
    </div>
  );
}
