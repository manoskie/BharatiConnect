import { useEffect, useState } from "react";
import { BookPlus, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { actions } from "@/lib/store";
import type { BookLanguage, BookStatus } from "@/lib/types";

interface GoogleBookResult {
  id: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    pageCount?: number;
    language?: string;
  };
}

export function AddBookDialog({ defaultStatus = "want_to_read" }: { defaultStatus?: BookStatus }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<
    { googleBooksId: string; title: string; author: string; totalPages: number; language: BookLanguage }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [manual, setManual] = useState({
    title: "",
    author: "",
    totalPages: "",
    language: "mr" as BookLanguage,
  });

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setResults([]);
      setSearchError(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearching(true);
      setSearchError(null);
      const params = new URLSearchParams({ q: query, maxResults: "10" });
      const apiKey = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY;
      if (apiKey) params.set("key", apiKey);
      void fetch(
        `https://www.googleapis.com/books/v1/volumes?${params.toString()}`,
        { signal: controller.signal },
      )
        .then(async (response) => {
          if (response.status === 429) {
            setSearchError("Google Books is rate-limited. Try adding the book manually.");
            return { items: [] };
          }
          if (!response.ok) throw new Error(`Google Books search failed (${response.status}).`);
          const payload = (await response.json()) as { items?: GoogleBookResult[] };
          const books = (payload.items ?? []).flatMap((item) => {
            const info = item.volumeInfo;
            const language = info?.language;
            if (
              !info?.title ||
              !info.pageCount ||
              info.pageCount < 1 ||
              (language !== "en" && language !== "mr" && language !== "hi")
            ) {
              return [];
            }
            const supportedLanguage: BookLanguage = language;
            return [
              {
                googleBooksId: item.id,
                title: info.title,
                author: info.authors?.join(", ") || "Unknown author",
                totalPages: info.pageCount,
                language: supportedLanguage,
              },
            ];
          });
          setResults(books);
          if (books.length === 0) {
            setSearchError("No usable Google Books results. Try adding the book manually.");
          }
          return payload;
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setSearchError(error instanceof Error ? error.message : "Google Books search failed.");
        })
        .finally(() => setSearching(false));
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  const add = async (book: {
    title: string;
    author: string;
    totalPages: number;
    language: BookLanguage;
    sourceId?: string;
  }) => {
    setSaving(true);
    try {
      await actions.addBook({ ...book, status: defaultStatus });
      setOpen(false);
      setQ("");
      setManual({ title: "", author: "", totalPages: "", language: "mr" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add this book.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="touch-target w-full gap-2 rounded-2xl">
          <BookPlus className="size-4" /> {t("reading.addBook")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("reading.addBook")}</DialogTitle>
          <DialogDescription>{t("reading.searchBooks")}</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="search">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">{t("reading.searchBooks")}</TabsTrigger>
            <TabsTrigger value="manual">{t("reading.manualEntry")}</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-3">
            <div className="relative">
              <Search className="absolute top-3.5 left-3 size-4 text-muted-foreground" />
              <Input
                className="h-12 pl-9"
                placeholder={t("common.search")}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            {results.map((b) => (
              <button
                key={b.googleBooksId}
                disabled={saving}
                onClick={() => void add({ ...b, sourceId: `google_${b.googleBooksId}` })}
                className="flex w-full items-center gap-3 rounded-2xl border border-border p-3 text-left"
              >
                <span className="size-12 shrink-0 rounded-lg bg-primary/20" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{b.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {b.author} · {b.totalPages} {t("common.pages")}
                  </span>
                </span>
              </button>
            ))}
            {results.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {searching
                  ? "Searching Google Books..."
                  : searchError ||
                    (q.trim().length < 2
                      ? "Enter at least 2 characters to search."
                      : "No usable Google Books results. Try manual entry.")}
              </p>
            )}
          </TabsContent>

          <TabsContent value="manual" className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t("reading.title")}</Label>
              <Input
                className="h-12"
                value={manual.title}
                onChange={(e) => setManual({ ...manual, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("reading.author")}</Label>
              <Input
                className="h-12"
                value={manual.author}
                onChange={(e) => setManual({ ...manual, author: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("reading.totalPages")}</Label>
                <Input
                  className="h-12"
                  type="number"
                  value={manual.totalPages}
                  onChange={(e) => setManual({ ...manual, totalPages: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("reading.language")}</Label>
                <Select
                  value={manual.language}
                  onValueChange={(v) => {
                    if (v === "en" || v === "mr" || v === "hi") {
                      setManual({ ...manual, language: v });
                    }
                  }}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mr">मराठी</SelectItem>
                    <SelectItem value="hi">हिन्दी</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              className="h-12 w-full"
              disabled={!manual.title.trim() || !manual.author.trim() || !manual.totalPages || saving}
              onClick={() => {
                const totalPages = Number(manual.totalPages);
                if (!Number.isInteger(totalPages) || totalPages < 1) {
                  toast.error("Enter a valid total page count.");
                  return;
                }
                void add({
                  title: manual.title,
                  author: manual.author,
                  totalPages,
                  language: manual.language,
                });
              }}
            >
              {t("common.add")}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
