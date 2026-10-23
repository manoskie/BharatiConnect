import { useEffect, useState } from "react";
import { Award, Flame, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { fsSubscribeUserPoints } from "@/lib/firebase-service";

interface GamificationCardProps {
  uid: string;
  initialPoints: number;
  streak: number;
}

export function GamificationCard({ uid, initialPoints, streak }: GamificationCardProps) {
  const { t } = useTranslation();
  const [points, setPoints] = useState(initialPoints);
  const level =
    points <= 100
      ? t("home.beginner")
      : points <= 500
        ? t("home.reader")
        : t("home.scholar");

  useEffect(() => {
    setPoints(initialPoints);
    return fsSubscribeUserPoints(
      uid,
      setPoints,
      (error) => console.error("Gamification stats subscription failed:", error),
    );
  }, [uid, initialPoints]);

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/80 p-5 text-primary-foreground shadow-lg">
      <div className="pointer-events-none absolute -right-8 -top-12 size-36 rounded-full bg-white/10 blur-2xl" />
      <div className="relative">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold tracking-wide">
          <Award className="size-4" />
          {t("home.gamification")}
        </h2>
        <div className="grid grid-cols-3 divide-x divide-white/20">
          <div className="min-w-0 pr-2">
            <p className="text-[11px] leading-tight text-primary-foreground/75">
              {t("home.pointsBalance")}
            </p>
            <p className="mt-1 truncate text-2xl font-bold tabular-nums">{points}</p>
            <p className="text-[11px] text-primary-foreground/75">{t("common.points")}</p>
          </div>
          <div className="min-w-0 px-3">
            <p className="text-[11px] leading-tight text-primary-foreground/75">
              {t("home.currentLevel")}
            </p>
            <p className="mt-1 flex items-center gap-1 truncate text-lg font-bold">
              <Sparkles className="size-4 shrink-0" />
              <span className="truncate">{level}</span>
            </p>
          </div>
          <div className="min-w-0 pl-3">
            <p className="text-[11px] leading-tight text-primary-foreground/75">
              {t("home.readingStreak")}
            </p>
            <p className="mt-1 flex items-center gap-1 text-2xl font-bold tabular-nums">
              <Flame className="size-5 shrink-0" />
              {streak}
            </p>
            <p className="text-[11px] text-primary-foreground/75">{t("common.days")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
