import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StaffShell } from "@/components/staff/StaffShell";
import { CheckinForm } from "@/components/staff/CheckinForm";
import { AddBookDialog } from "@/components/staff/AddBookDialog";
import { BookDetailDialog } from "@/components/staff/BookDetailDialog";
import { HistoryCalendar } from "@/components/staff/HistoryCalendar";
import { ReadingLogTimeline } from "@/components/staff/ReadingLogTimeline";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { actions, useAppState } from "@/lib/store";
import type { Book, BookStatus } from "@/lib/types";

export const Route = createFileRoute("/reading")({
  head: () => ({
    meta: [
      { title: "Reading — BharatiConnect" },
      {
        name: "description",
        content: "Daily check-in, your bookshelf and a month-by-month reading history.",
      },
      { property: "og:title", content: "Reading — BharatiConnect" },
      {
        property: "og:description",
        content: "Log pages, manage your bookshelf and review your reading calendar.",
      },
    ],
  }),
  component: Reading,
});

function Reading() {
  const { t } = useTranslation();
  const { books } = useAppState();
  const [detail, setDetail] = useState<Book | null>(null);
  const [bookToComplete, setBookToComplete] = useState<Book | null>(null);
  const [completingBook, setCompletingBook] = useState(false);

  const shelf = (status: BookStatus) => books.filter((b) => b.status === status);

  const markBookCompleted = async () => {
    if (!bookToComplete) return;
    setCompletingBook(true);
    try {
      const updated = await actions.setBookStatus(bookToComplete.id, "finished");
      if (!updated) {
        toast.error(t("reading.readingLimit"));
        return;
      }
      toast.success(t("reading.markCompletedSuccess"));
      setBookToComplete(null);
    } catch (error) {
      console.error("Unable to mark book as completed:", error);
      toast.error(error instanceof Error ? error.message : t("reading.markCompletedFailed"));
    } finally {
      setCompletingBook(false);
    }
  };

  return (
    <StaffShell>
      <Tabs defaultValue="checkin" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="checkin">{t("reading.checkin")}</TabsTrigger>
          <TabsTrigger value="shelf">{t("reading.bookshelf")}</TabsTrigger>
          <TabsTrigger value="history">{t("reading.history")}</TabsTrigger>
        </TabsList>

        <TabsContent value="checkin">
          <CheckinForm />
        </TabsContent>

        <TabsContent value="shelf" className="space-y-4">
          <Tabs defaultValue="reading">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="want">{t("reading.wantToRead")}</TabsTrigger>
              <TabsTrigger value="reading">{t("reading.readingNow")}</TabsTrigger>
              <TabsTrigger value="finished">{t("reading.finished")}</TabsTrigger>
            </TabsList>
            {(
              [
                ["want", "want_to_read"],
                ["reading", "reading"],
                ["finished", "finished"],
              ] as const
            ).map(([tab, status]) => (
              <TabsContent key={tab} value={tab} className="space-y-3 pt-3">
                {status === "reading" && (
                  <p className="text-xs text-muted-foreground">{t("reading.readingLimit")}</p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {shelf(status).map((b) => (
                    <div
                      key={b.firestoreId ?? b.id}
                      className="glass space-y-2 rounded-2xl p-3"
                    >
                      <button
                        type="button"
                        onClick={() => setDetail(b)}
                        className="w-full text-left"
                      >
                        <span
                          className="block h-28 w-full rounded-xl"
                          style={{ backgroundColor: b.coverColor }}
                        />
                        <span className="mt-2 block truncate text-sm font-medium">{b.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {b.author}
                        </span>
                        <Progress
                          value={(b.currentPage / b.totalPages) * 100}
                          className="mt-2 h-1.5"
                        />
                      </button>
                      {status === "reading" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => setBookToComplete(b)}
                        >
                          {t("reading.markAsCompleted")}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                {shelf(status).length === 0 && (
                  <p className="text-sm text-muted-foreground">{t("common.none")}</p>
                )}
                <AddBookDialog defaultStatus={status} />
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>

        <TabsContent value="history">
          <div className="space-y-4">
            <HistoryCalendar />
            <ReadingLogTimeline />
          </div>
        </TabsContent>
      </Tabs>

      <BookDetailDialog book={detail} onOpenChange={(o) => !o && setDetail(null)} />
      <AlertDialog
        open={bookToComplete !== null}
        onOpenChange={(open) => {
          if (!open && !completingBook) setBookToComplete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("reading.confirmCompletedTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("reading.confirmCompleted", { title: bookToComplete?.title ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={completingBook}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={completingBook}
              onClick={(event) => {
                event.preventDefault();
                void markBookCompleted();
              }}
            >
              {completingBook ? t("common.loading") : t("reading.markAsCompleted")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </StaffShell>
  );
}
