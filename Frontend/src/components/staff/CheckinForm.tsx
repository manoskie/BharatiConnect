import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { actions, useAppState } from "@/lib/store";

export function CheckinForm() {
  const { t } = useTranslation();
  const { books, settings, todayLogged } = useAppState();
  const reading = books.filter((b) => b.status === "reading");
  const [bookId, setBookId] = useState(reading[0]?.id ?? "");
  const book = reading.find((b) => b.id === bookId);
  const [page, setPage] = useState<string>(
    String(Math.min((book?.currentPage ?? 0) + 15, book?.totalPages ?? 15)),
  );
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedBookId, setCompletedBookId] = useState<string | null>(null);

  useEffect(() => {
    if (!bookId && reading[0]) {
      setBookId(reading[0].id);
      setPage(String(Math.min(reading[0].currentPage + 15, reading[0].totalPages)));
    }
  }, [bookId, reading]);

  const pagesRead = Math.max(0, Number(page || 0) - (book?.currentPage ?? 0));
  const canSubmit =
    !!book &&
    Number.isInteger(Number(page)) &&
    pagesRead >= settings.minimumPages &&
    Number(page) <= book.totalPages;

  return (
    <div className="glass space-y-5 rounded-3xl p-5">
      {todayLogged && (
        <p className="rounded-2xl bg-success/15 px-3 py-2 text-xs font-medium text-success-foreground dark:text-success">
          {t("home.logged")}
        </p>
      )}

      <div className="space-y-2">
        <Label>{t("reading.selectBook")}</Label>
        <Select
          value={bookId}
          onValueChange={(v) => {
            setBookId(v);
            const b = reading.find((x) => x.id === v);
            setPage(String(Math.min((b?.currentPage ?? 0) + 15, b?.totalPages ?? 15)));
          }}
        >
          <SelectTrigger className="h-12">
            <SelectValue placeholder={t("reading.selectBook")} />
          </SelectTrigger>
          <SelectContent>
            {reading.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.title} · {b.currentPage}/{b.totalPages}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="page">{t("reading.currentPage")}</Label>
        <Input
          id="page"
          type="number"
          inputMode="numeric"
          className="h-12 text-lg"
          value={page}
          min={book?.currentPage ?? 0}
          max={book?.totalPages ?? 9999}
          onChange={(e) => setPage(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          {t("reading.pagesRead", { count: pagesRead })}
        </p>
        {pagesRead < settings.minimumPages && (
          <p className="text-xs text-destructive">
            {t("admin.minimumPages")}: {settings.minimumPages}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">
          {t("reading.reflectionPrompt")}{" "}
          <span className="text-muted-foreground">({note.length}/280)</span>
        </Label>
        <Textarea
          id="note"
          maxLength={280}
          rows={3}
          placeholder={t("reading.notePlaceholder")}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {settings.proofMode !== "off" && (
        <p className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">
          Photo proof is not part of Release 1. Ask an administrator to turn proof mode off.
        </p>
      )}

      {errorMessage && (
        <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
          {errorMessage}
        </p>
      )}

      <Button
        size="lg"
        disabled={!canSubmit || saving || settings.proofMode !== "off"}
        className="h-14 w-full rounded-2xl text-base"
        onClick={async () => {
          if (!book) return;
          setSaving(true);
          setErrorMessage(null);
          try {
            await actions.checkIn({
              bookId: book.id,
              toPage: Number(page),
              ...(note ? { note } : {}),
            });
            setNote("");
            if (Number(page) === book.totalPages) setCompletedBookId(book.id);
            toast.success(t("reading.submitCheckin"));
          } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Unable to save this check-in.");
          } finally {
            setSaving(false);
          }
        }}
      >
        {saving ? "..." : t("reading.submitCheckin")}
      </Button>
      {completedBookId === book?.id && book.status !== "finished" && (
        <Button
          variant="outline"
          className="w-full"
          onClick={async () => {
            try {
              await actions.setBookStatus(book.id, "finished");
              setCompletedBookId(null);
              toast.success(t("reading.finished"));
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Unable to mark this book as finished.");
            }
          }}
        >
          {t("reading.finished")}
        </Button>
      )}
    </div>
  );
}
