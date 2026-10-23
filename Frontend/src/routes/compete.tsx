import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { StaffShell } from "@/components/staff/StaffShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useLeaderboard } from "@/lib/queries";
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
  const { t } = useTranslation();
  const { sessionUser } = useAppState();
  const [scope, setScope] = useState<"department" | "individual">("department");
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const { data: rows = [] } = useLeaderboard(scope, period);

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
            <ToggleGroup
              type="single"
              value={period}
              onValueChange={(v) => v && setPeriod(v as typeof period)}
              variant="outline"
            >
              <ToggleGroupItem value="weekly">{t("common.weekly")}</ToggleGroupItem>
              <ToggleGroupItem value="monthly">{t("common.monthly")}</ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="space-y-2">
            {rows.map((row, i) => (
              <motion.div
                key={row.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={cn(
                  "glass flex items-center gap-3 rounded-2xl p-3",
                  row.isCurrentUser && "border-primary bg-primary/10",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full text-xs font-bold",
                    i === 0 ? "bg-streak text-streak-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {row.label}
                  {row.isCurrentUser && (
                    <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">
                      {t("compete.you")}
                    </span>
                  )}
                </span>
                <span className="text-sm font-semibold tabular-nums">{row.points}</span>
              </motion.div>
            ))}
          </div>
        </TabsContent>

      </Tabs>
    </StaffShell>
  );
}
