import { useEffect, useState } from "react";
import { Medal, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { fsSubscribeLeaderboard, type LeaderboardStaff } from "@/lib/firebase-service";
import { useAppState } from "@/lib/store";

export function Leaderboard() {
  const { t, i18n } = useTranslation();
  const { departments } = useAppState();
  const [staff, setStaff] = useState<LeaderboardStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setHasError(false);
    return fsSubscribeLeaderboard(
      (results) => {
        setStaff(results);
        setLoading(false);
      },
      (error) => {
        console.error("Leaderboard subscription failed:", error);
        setHasError(true);
        setLoading(false);
      },
    );
  }, []);

  return (
    <section className="glass space-y-4 rounded-3xl p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <Trophy className="size-5 text-streak" />
        {t("home.leaderboard")}
      </h2>

      <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] gap-3 border-b border-border/60 pb-2 text-[11px] font-medium text-muted-foreground">
        <span>{t("home.rank")}</span>
        <span>{t("home.nameAndDepartment")}</span>
        <span className="text-right">{t("home.totalPoints")}</span>
      </div>

      {loading ? (
        <p className="py-2 text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : hasError ? (
        <p role="alert" className="py-2 text-sm text-destructive">
          {t("home.leaderboardUnavailable")}
        </p>
      ) : staff.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">{t("home.leaderboardEmpty")}</p>
      ) : (
        <ol className="space-y-2">
          {staff.map((member, index) => {
            const department = departments.find((item) => item.id === member.departmentId);
            const departmentName = department
              ? i18n.language === "mr"
                ? department.nameMr
                : department.nameEn
              : "—";

            return (
              <li
                key={member.id}
                className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-background/50 px-3 py-2.5"
              >
                <span
                  className={`flex size-8 items-center justify-center rounded-full text-xs font-bold ${
                    index === 0
                      ? "bg-streak text-streak-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {index === 0 ? <Medal className="size-4" /> : index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {member.name || "—"}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {departmentName}
                  </span>
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  {member.points.toLocaleString(i18n.language === "mr" ? "mr-IN" : "en-IN")}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
