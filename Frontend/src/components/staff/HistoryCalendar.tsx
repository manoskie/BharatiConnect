import { useState } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { actions, useAppState } from "@/lib/store";
import { api, tokenStore } from "@/lib/api";
import { auth } from "@/lib/firebase";
import { cn } from "@/lib/utils";

type CalendarDayState = "logged" | "missed" | "holiday";

const dotColor: Record<CalendarDayState, string> = {
  logged: "bg-emerald-500",
  missed: "bg-red-500",
  holiday: "bg-amber-500",
};

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function dateKeyFromValue(value: unknown): string | null {
  let date: Date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "string" || typeof value === "number") {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    date = new Date(value);
  } else if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    date = value.toDate();
  } else {
    return null;
  }
  return Number.isNaN(date.getTime()) ? null : localDateKey(date);
}

export function HistoryCalendar() {
  const { t, i18n } = useTranslation();
  const { logs, holidays, sessionUser, adminUser } = useAppState();
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [holidayDialogOpen, setHolidayDialogOpen] = useState(false);
  const [holidayDate, setHolidayDate] = useState(localDateKey(new Date()));
  const [holidayTitle, setHolidayTitle] = useState("");
  const [savingHoliday, setSavingHoliday] = useState(false);
  const canManageHolidays = adminUser?.role === "admin" || adminUser?.role === "owner";

  const base = new Date();
  base.setDate(1);
  base.setMonth(base.getMonth() + offset);
  const year = base.getFullYear();
  const month = base.getMonth();
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const today = localDateKey(new Date());
  const key = (d: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const { data: historyData } = useQuery({
    queryKey: ["reading-history-month", year, month + 1],
    queryFn: async () => {
      if (!tokenStore.access()) return null;
      try {
        const { data } = await api.get(
          `/reading/me/history?month=${month + 1}&year=${year}&limit=100`,
        );
        return data?.logs || [];
      } catch {
        return null;
      }
    },
    enabled: !!tokenStore.access(),
  });

  const apiHistoryLogs = Array.isArray(historyData) ? historyData : [];
  const currentUserLogs = logs.filter((log) => log.userId === sessionUser?.id);
  const loggedDates = new Set<string>([
    ...currentUserLogs.map((log) => log.date),
    ...apiHistoryLogs.map((log: { date?: unknown }) =>
      typeof log.date === "string" ? log.date : "",
    ),
  ]);
  const firebaseUser = auth.currentUser;
  const authCreationDate =
    firebaseUser && firebaseUser.uid === sessionUser?.id
      ? dateKeyFromValue(firebaseUser.metadata.creationTime)
      : null;
  const earliestLogDate = [...loggedDates].filter(Boolean).sort()[0] ?? null;
  const accountCreationDate =
    dateKeyFromValue(sessionUser?.joinedAt) ?? authCreationDate ?? earliestLogDate;
  const activeDayStates: Record<string, CalendarDayState> = {};
  for (let day = 1; day <= days; day += 1) {
    const date = key(day);
    const isPastDate = date < today;
    if (loggedDates.has(date)) {
      activeDayStates[date] = "logged";
      continue;
    }
    if (accountCreationDate && date < accountCreationDate) continue;

    const isHoliday = holidays.some(
      (holiday) =>
        holiday.date === date &&
        (!holiday.userId || holiday.userId === sessionUser?.id),
    );

    if (isHoliday) {
      activeDayStates[date] = "holiday";
    } else if (isPastDate && accountCreationDate) {
      activeDayStates[date] = "missed";
    }
  }

  const selectedApiLogs = apiHistoryLogs.filter((l: any) => l.date === selected);
  const dayLogs =
    selectedApiLogs.length > 0
      ? selectedApiLogs.map((l: any) => ({
          id: String(l._id || l.id),
          bookTitle: l.bookId?.title || "Book",
          fromPage: l.startPage,
          toPage: l.currentPage,
          pages: l.pagesRead,
          note: l.note,
        }))
      : logs.filter((l) => l.date === selected && l.userId === sessionUser?.id);

  const dayHoliday = holidays.find(
    (holiday) =>
      holiday.date === selected && (!holiday.userId || holiday.userId === sessionUser?.id),
  );

  return (
    <div className="glass space-y-4 rounded-3xl p-5">
      {canManageHolidays && (
        <div className="flex justify-end">
          <Button type="button" onClick={() => setHolidayDialogOpen(true)}>
            <CalendarPlus className="size-4" />
            {t("reading.addHoliday")}
          </Button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setOffset(offset - 1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <p className="font-medium">
          {base.toLocaleDateString(i18n.language === "mr" ? "mr-IN" : "en-IN", {
            month: "long",
            year: "numeric",
          })}
        </p>
        <Button
          variant="ghost"
          size="icon"
          disabled={offset >= 0}
          onClick={() => setOffset(offset + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={i} className="text-[10px] text-muted-foreground">
            {d}
          </span>
        ))}
        {Array.from({ length: first }).map((_, i) => (
          <span key={`e${i}`} />
        ))}
        {Array.from({ length: days }).map((_, i) => {
          const d = i + 1;
          const k = key(d);
          const state = activeDayStates[k];
          return (
            <button
              key={k}
              type="button"
              onClick={() => setSelected(k)}
              aria-label={`${k}${state ? `, ${t(`reading.legend${state[0]!.toUpperCase()}${state.slice(1)}`)}` : ""}`}
              className="flex h-11 flex-col items-center justify-center gap-1 rounded-xl hover:bg-muted"
            >
              <span className="text-xs tabular-nums">{d}</span>
              <span
                className={cn("size-1.5 rounded-full", state ? dotColor[state] : "bg-transparent")}
              />
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        {(["logged", "missed", "holiday"] as const).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", dotColor[s])} />
            {t(`reading.legend${s[0]!.toUpperCase()}${s.slice(1)}`)}
          </span>
        ))}
      </div>

      <Drawer open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t("reading.dayLog")}</DrawerTitle>
            <DrawerDescription>{selected}</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-2 px-4 pb-8">
            {dayHoliday && (
              <p className="rounded-xl bg-amber-500/15 px-3 py-2 text-sm">
                {i18n.language === "mr" ? dayHoliday.labelMr : dayHoliday.labelEn}
              </p>
            )}
            {dayLogs.length === 0 && !dayHoliday && (
              <p className="text-sm text-muted-foreground">{t("common.none")}</p>
            )}
            {dayLogs.map((l: any) => (
              <div key={l.id} className="rounded-xl border border-border p-3">
                <p className="text-sm font-medium">{l.bookTitle}</p>
                <p className="text-xs text-muted-foreground">
                  {l.fromPage} → {l.toPage} · {l.pages} {t("common.pages")}
                </p>
                {l.note && <p className="mt-1 text-sm">{l.note}</p>}
              </div>
            ))}
          </div>
        </DrawerContent>
      </Drawer>

      {canManageHolidays && (
        <Dialog open={holidayDialogOpen} onOpenChange={setHolidayDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("reading.addHoliday")}</DialogTitle>
              <DialogDescription>{t("reading.holidayDescription")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="history-holiday-date">{t("reading.holidayDate")}</Label>
                <Input
                  id="history-holiday-date"
                  type="date"
                  value={holidayDate}
                  onChange={(event) => setHolidayDate(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="history-holiday-title">{t("reading.holidayTitle")}</Label>
                <Input
                  id="history-holiday-title"
                  value={holidayTitle}
                  onChange={(event) => setHolidayTitle(event.target.value)}
                  placeholder={t("reading.holidayTitlePlaceholder")}
                  maxLength={120}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                disabled={savingHoliday || !holidayDate || !holidayTitle.trim()}
                onClick={async () => {
                  if (!sessionUser) {
                    toast.error(t("reading.holidayLoginRequired"));
                    return;
                  }
                  setSavingHoliday(true);
                  try {
                    const title = holidayTitle.trim();
                    await actions.addHoliday({
                      date: holidayDate,
                      type: "holiday",
                      title,
                      labelEn: title,
                      labelMr: title,
                      createdBy: sessionUser.id,
                      createdAt: new Date().toISOString(),
                    });
                    setHolidayTitle("");
                    setHolidayDialogOpen(false);
                    toast.success(t("reading.holidayAdded"));
                  } catch (error) {
                    toast.error(
                      error instanceof Error ? error.message : t("reading.holidayAddFailed"),
                    );
                  } finally {
                    setSavingHoliday(false);
                  }
                }}
              >
                {savingHoliday ? t("common.loading") : t("reading.addHoliday")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
