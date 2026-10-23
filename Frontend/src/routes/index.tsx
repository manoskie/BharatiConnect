import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, ChevronRight, Circle, Flame, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { StaffShell } from "@/components/staff/StaffShell";
import { GamificationCard } from "@/components/staff/GamificationCard";
import { Leaderboard } from "@/components/staff/Leaderboard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAppState } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BharatiConnect — Daily reading for Akshar Bharati staff" },
      {
        name: "description",
        content:
          "Log your daily reading, keep your streak alive and follow Akshar Bharati notices in Marathi or English.",
      },
      { property: "og:title", content: "BharatiConnect — Daily reading for Akshar Bharati staff" },
      {
        property: "og:description",
        content: "Streaks, challenges, bookshelf and notices for Akshar Bharati staff.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { t, i18n } = useTranslation();
  const { sessionUser, todayLogged, todayPagesRead, challenges, books } = useAppState();
  const user = sessionUser;
  const challenge = challenges.find((c) => c.joined) ?? challenges[0]!;
  const readingNow = books.filter((b) => b.status === "reading");
  const firstName = (user?.name ?? "Staff").split(" ")[0] ?? "Staff";

  return (
    <StaffShell>
      <div className="space-y-5">
        <div>
          <h1 className="font-serif text-2xl font-semibold">
            {t("home.greeting", { name: firstName })}
          </h1>
          <p className="text-sm text-muted-foreground">{t("home.subtitle")}</p>
        </div>

        {user && (
          <GamificationCard
            uid={user.id}
            initialPoints={user.points}
            streak={user.streak}
          />
        )}
        <Leaderboard />

        <div className="glass rounded-3xl p-5">
          <div className="flex justify-center">
            <span
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                todayLogged
                  ? "bg-success/20 text-success-foreground dark:text-success"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {todayLogged ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
              {todayLogged ? t("home.logged") : t("home.notLogged")}
            </span>
          </div>

          <Button asChild size="lg" className="mt-4 h-14 w-full rounded-2xl text-base shadow-lg">
            <Link to="/reading">
              <Flame className="size-5" /> {t("home.quickCheckin")}
            </Link>
          </Button>
        </div>

        {challenge && <Link to="/compete" className="glass block rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Trophy className="size-4 text-streak" /> {t("home.activeChallenge")}
            </p>
            <ChevronRight className="size-4 text-muted-foreground" />
          </div>
          <p className="mt-2 font-medium">
            {i18n.language === "mr" ? challenge.titleMr : challenge.titleEn}
          </p>
          <Progress value={(challenge.progress / challenge.target) * 100} className="mt-3" />
          <p className="mt-2 text-xs text-muted-foreground">
            {challenge.progress} / {challenge.target} · +{challenge.rewardPoints}{" "}
            {t("common.points")}
          </p>
        </Link>}

        <div className="glass rounded-3xl p-5">
          <p className="text-xs text-muted-foreground">{t("home.pagesReadToday")}</p>
          <p className="text-3xl font-bold tabular-nums">{todayPagesRead}</p>
        </div>

        <div className="space-y-2">
          {readingNow.map((b) => (
            <Link
              key={b.id}
              to="/reading"
              className="glass flex items-center gap-3 rounded-2xl p-3"
            >
              <span
                className="size-12 shrink-0 rounded-lg"
                style={{ backgroundColor: b.coverColor }}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{b.title}</span>
                <Progress value={(b.currentPage / b.totalPages) * 100} className="mt-2 h-1.5" />
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {b.currentPage}/{b.totalPages}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </StaffShell>
  );
}
