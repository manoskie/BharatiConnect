import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fsSubscribeUserReadingLogs } from "@/lib/firebase-service";
import { useAppState } from "@/lib/store";
import type { ReadingLog } from "@/lib/types";

export function ReadingLogTimeline() {
  const { t, i18n } = useTranslation();
  const { sessionUser } = useAppState();
  const [logs, setLogs] = useState<ReadingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const uid = sessionUser?.id;

  useEffect(() => {
    if (!uid) {
      setLogs([]);
      setLoading(false);
      return;
    }

    setLogs([]);
    setLoading(true);
    setHasError(false);
    return fsSubscribeUserReadingLogs(
      uid,
      (userLogs) => {
        setLogs(userLogs);
        setLoading(false);
      },
      (error) => {
        console.error("Reading history subscription failed:", error);
        setHasError(true);
        setLoading(false);
      },
    );
  }, [uid]);

  const dateLocale = i18n.language === "mr" ? "mr-IN" : "en-IN";

  return (
    <section className="glass space-y-3 rounded-3xl p-5">
      <h2 className="text-base font-semibold">{t("reading.myTakeaways")}</h2>
      {loading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : hasError ? (
        <p role="alert" className="text-sm text-destructive">
          {t("reading.historyLoadFailed")}
        </p>
      ) : logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("reading.noTakeaways")}</p>
      ) : (
        <ol className="space-y-3">
          {logs.map((log) => (
            <li key={log.id} className="rounded-2xl border border-border/60 p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium">{log.bookTitle}</p>
                <time dateTime={log.date} className="text-xs text-muted-foreground">
                  {new Date(`${log.date}T12:00:00`).toLocaleDateString(dateLocale, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {log.pages} {t("common.pages")}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm">
                {log.note?.trim() || t("reading.noReflection")}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
