import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { StaffShell } from "@/components/staff/StaffShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { fsSubscribeLeaderboard, type LeaderboardStaff } from "@/lib/firebase-service";
import { useAppState } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/compete")({
  head: () => ({
    meta: [
      { title: "Compete — BharatiConnect" },
      {
        name: "description",
        content: "Department and individual leaderboards, reading challenges and badges.",
      },
      { property: "og:title", content: "Compete — BharatiConnect" },
      {
        property: "og:description",
        content: "Leaderboards, challenges and badges for Akshar Bharati staff.",
      },
    ],
  }),
  component: Compete,
});

function Compete() {
  const { t, i18n } = useTranslation();
  const { sessionUser, departments } = useAppState();
  const [scope, setScope] = useState<"department" | "individual">("department");
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
        console.error("Compete leaderboard subscription failed:", error);
        setHasError(true);
        setLoading(false);
      },
    );
  }, []);

  const rows =
    scope === "individual"
      ? staff.map((member) => ({
          id: member.id,
          label: member.name || "—",
          department: (() => {
            const department = departments.find(
              (item) => item.id === member.departmentId,
            );
            return department
              ? i18n.language === "mr"
                ? department.nameMr
                : department.nameEn
              : "—";
          })(),
          points: member.points,
          streak: member.streak,
          isCurrentUser: member.id === sessionUser?.id,
        }))
      : departments
          .map((department) => {
            const departmentStaff = staff.filter(
              (member) => member.departmentId === department.id,
            );
            return {
              id: department.id,
              label: i18n.language === "mr" ? department.nameMr : department.nameEn,
              department: "",
              points: departmentStaff.reduce((total, member) => total + member.points, 0),
              streak: departmentStaff.reduce((total, member) => total + member.streak, 0),
              isCurrentUser: department.id === sessionUser?.departmentId,
            };
          })
          .filter((department) =>
            staff.some((member) => member.departmentId === department.id),
          )
          .sort((a, b) => b.points - a.points || b.streak - a.streak);

  return (
    <StaffShell>
      <Tabs defaultValue="leaderboard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="leaderboard">{t("compete.leaderboard")}</TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard" className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <ToggleGroup
              type="single"
              value={scope}
              onValueChange={(v) => v && setScope(v as typeof scope)}
              variant="outline"
            >
              <ToggleGroupItem value="department">{t("compete.department")}</ToggleGroupItem>
              <ToggleGroupItem value="individual">{t("compete.individual")}</ToggleGroupItem>
            </ToggleGroup>
          </div>

          {loading ? (
            <p className="py-3 text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : hasError ? (
            <p role="alert" className="py-3 text-sm text-destructive">
              {t("home.leaderboardUnavailable")}
            </p>
          ) : rows.length === 0 ? (
            <p className="py-3 text-sm text-muted-foreground">{t("home.leaderboardEmpty")}</p>
          ) : (
            <div className="space-y-2">
              {rows.map((row, i) => (
                <motion.div
                  key={row.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={cn(
                    "glass flex items-center gap-3 rounded-2xl p-3",
                    row.isCurrentUser && "border-primary bg-primary/10 ring-1 ring-primary/40",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-8 items-center justify-center rounded-full text-xs font-bold",
                      i === 0
                        ? "bg-amber-400/25 text-amber-700 dark:text-amber-300"
                        : i === 1
                          ? "bg-slate-300/50 text-slate-700 dark:text-slate-200"
                          : i === 2
                            ? "bg-orange-700/20 text-orange-800 dark:text-orange-300"
                            : "bg-muted text-muted-foreground",
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-medium">
                    <span className="block">{row.label}</span>
                    {row.department && (
                      <span className="block text-xs font-normal text-muted-foreground">
                        {row.department}
                      </span>
                    )}
                    {row.isCurrentUser && (
                      <span className="mt-1 inline-block rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">
                        {t("compete.you")}
                      </span>
                    )}
                  </span>
                  {scope === "individual" && (
                    <span className="text-sm tabular-nums">{row.streak}</span>
                  )}
                  <span className="text-sm font-semibold tabular-nums">
                    {row.points.toLocaleString()}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

      </Tabs>
    </StaffShell>
  );
}
