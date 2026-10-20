import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookPlus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  fsCreateCuratedBook,
  fsDeleteCuratedBook,
  fsSubscribeCuratedBooks,
} from "@/lib/firebase-service";
import type { BookLanguage, CuratedBook } from "@/lib/types";

interface GoogleBookResult {
  id: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    pageCount?: number;
    language?: string;
    imageLinks?: { thumbnail?: string };
  };
}

interface BookDraft {
  title: string;
  author: string;
  totalPages: string;
  language: BookLanguage;
  coverUrl: string;
  staffPick: boolean;
}

const emptyDraft: BookDraft = {
  title: "",
  author: "",
  totalPages: "",
  language: "mr",
  coverUrl: "",
  staffPick: true,
};

export const Route = createFileRoute("/admin/books")({
  head: () => ({
    meta: [
      { title: "Book Curation — BharatiConnect Admin" },
      { name: "description", content: "Curate the shared book catalogue and staff picks." },
    ],
  }),
  component: AdminBooks,
});

function AdminBooks() {
  const [books, setBooks] = useState<CuratedBook[]>([]);
  const [draft, setDraft] = useState<BookDraft>(emptyDraft);
  const [googleBooksId, setGoogleBooksId] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<GoogleBookResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(
    () =>
      fsSubscribeCuratedBooks(
        (catalogue) => {
          setBooks(catalogue);
          setListError(null);
        },
        (error) => {
          console.error("Unable to load the curated book catalogue:", error);
          setListError(error.message);
        },
      ),
    [],
  );

  const searchGoogleBooks = async () => {
    if (search.trim().length < 2 || searching) return;
    setSearching(true);
    setResults([]);
    setSearchError(null);
    try {
      const params = new URLSearchParams({ q: search.trim(), maxResults: "10" });
      const apiKey = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY;
      if (apiKey) params.set("key", apiKey);
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?${params.toString()}`,
      );
      if (response.status === 429) {
        setSearchError("Google Books is rate-limited. Use the manual book form below.");
        return;
      }
      if (!response.ok) throw new Error(`Google Books search failed (${response.status}).`);
      const payload = (await response.json()) as { items?: GoogleBookResult[] };
      const items = payload.items ?? [];
      setResults(items);
      if (items.length === 0) {
        setSearchError("No Google Books results found. Use the manual book form below.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Google Books search failed.";
      setSearchError(`${message} You can use the manual book form below.`);
    } finally {
      setSearching(false);
    }
  };

  const selectGoogleBook = (result: GoogleBookResult) => {
    const info = result.volumeInfo;
    if (!info?.title) {
      toast.error("This Google Books result does not include a title.");
      return;
    }
    const googleLanguage = info.language;
    const language: BookLanguage =
      googleLanguage === "en" || googleLanguage === "mr" || googleLanguage === "hi"
        ? googleLanguage
        : "en";
    setGoogleBooksId(result.id);
    setDraft({
      title: info.title,
      author: info.authors?.join(", ") || "",
      totalPages: info.pageCount && info.pageCount > 0 ? String(info.pageCount) : "",
      language,
      coverUrl: info.imageLinks?.thumbnail?.replace(/^http:/, "https:") || "",
      staffPick: true,
    });
  };

  const addBook = async () => {
    const totalPages = Number(draft.totalPages);
    if (
      !draft.title.trim() ||
      !draft.author.trim() ||
      !Number.isInteger(totalPages) ||
      totalPages < 1
    ) {
      toast.error("Enter a title, author, and positive whole-number page count.");
      return;
    }
    setSaving(true);
    try {
      const created = await fsCreateCuratedBook({
        title: draft.title,
        author: draft.author,
        totalPages,
        language: draft.language,
        coverUrl: draft.coverUrl,
        staffPick: draft.staffPick,
        ...(googleBooksId ? { googleBooksId } : {}),
      });
      setBooks((current) => [created, ...current.filter((book) => book.id !== created.id)]);
      setDraft(emptyDraft);
      setGoogleBooksId(undefined);
      toast.success("Book added to the shared catalogue.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add this book.");
    } finally {
      setSaving(false);
    }
  };

  const removeBook = async (book: CuratedBook) => {
    setDeletingId(book.id);
    try {
      await fsDeleteCuratedBook(book.id);
      setBooks((current) => current.filter((item) => item.id !== book.id));
      toast.success("Book removed from the catalogue.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to remove this book.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminShell title="Book Curation">
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="glass space-y-4 rounded-3xl p-5" aria-labelledby="google-books-heading">
          <div>
            <h2 id="google-books-heading" className="font-semibold">Search Google Books</h2>
            <p className="text-sm text-muted-foreground">
              Search for a book, select its details, then review and add it to the shared catalogue.
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              aria-label="Search Google Books"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void searchGoogleBooks();
              }}
              placeholder="Title or author"
            />
            <Button
              type="button"
              variant="outline"
              disabled={searching || search.trim().length < 2}
              onClick={() => void searchGoogleBooks()}
            >
              <Search className="mr-2 size-4" />
              {searching ? "Searching..." : "Search"}
            </Button>
          </div>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {results.map((result) => (
              <div
                key={result.id}
                className="flex items-center gap-3 rounded-xl border border-border p-3"
              >
                {result.volumeInfo?.imageLinks?.thumbnail && (
                  <img
                    className="h-16 w-11 rounded object-cover"
                    src={result.volumeInfo.imageLinks.thumbnail.replace(/^http:/, "https:")}
                    alt=""
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{result.volumeInfo?.title ?? "Untitled"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {result.volumeInfo?.authors?.join(", ") || "Author not listed"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {result.volumeInfo?.pageCount ? `${result.volumeInfo.pageCount} pages` : "Page count not listed"}
                  </p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => selectGoogleBook(result)}>
                  Use details
                </Button>
              </div>
            ))}
            {!searching && results.length === 0 && (
              <p className="py-3 text-sm text-muted-foreground">
                {searchError ?? "Search results will appear here. You can also enter a book manually."}
              </p>
            )}
          </div>
        </section>

        <section className="glass space-y-4 rounded-3xl p-5" aria-labelledby="book-form-heading">
          <div>
            <h2 id="book-form-heading" className="font-semibold">Add catalogue book</h2>
            <p className="text-sm text-muted-foreground">
              Add a selected Google Books result or enter a book manually.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="catalog-title">Title</Label>
              <Input id="catalog-title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="catalog-author">Author</Label>
              <Input id="catalog-author" value={draft.author} onChange={(e) => setDraft({ ...draft, author: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="catalog-pages">Total pages</Label>
              <Input
                id="catalog-pages"
                type="number"
                min={1}
                step={1}
                value={draft.totalPages}
                onChange={(e) => setDraft({ ...draft, totalPages: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Language</Label>
              <Select
                value={draft.language}
                onValueChange={(value) => setDraft({ ...draft, language: value as BookLanguage })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="mr">Marathi</SelectItem>
                  <SelectItem value="hi">Hindi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="catalog-cover">Cover image URL (optional)</Label>
              <Input id="catalog-cover" type="url" value={draft.coverUrl} onChange={(e) => setDraft({ ...draft, coverUrl: e.target.value })} />
            </div>
          </div>
          <label className="flex items-center gap-3 text-sm">
            <Switch
              checked={draft.staffPick}
              onCheckedChange={(staffPick) => setDraft({ ...draft, staffPick })}
            />
            Show as a staff pick
          </label>
          <Button
            type="button"
            className="w-full gap-2"
            disabled={saving || !draft.title.trim() || !draft.author.trim() || !Number.isInteger(Number(draft.totalPages)) || Number(draft.totalPages) < 1}
            onClick={() => void addBook()}
          >
            <BookPlus className="size-4" />
            {saving ? "Adding..." : "Add to catalogue"}
          </Button>
        </section>
      </div>

      <section className="glass mt-5 space-y-3 rounded-3xl p-5" aria-labelledby="catalogue-heading">
        <h2 id="catalogue-heading" className="font-semibold">Shared catalogue</h2>
        {listError && <p role="alert" className="text-sm text-destructive">{listError}</p>}
        {!listError && books.length === 0 && (
          <p className="text-sm text-muted-foreground">No curated books have been added yet.</p>
        )}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {books.map((book) => (
            <article key={book.id} className="flex min-w-0 items-center gap-3 rounded-xl border border-border p-3">
              {book.coverUrl ? (
                <img className="h-16 w-11 rounded object-cover" src={book.coverUrl} alt="" />
              ) : (
                <div className="flex h-16 w-11 shrink-0 items-center justify-center rounded bg-muted">
                  <BookPlus className="size-5 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{book.title}</p>
                <p className="truncate text-xs text-muted-foreground">{book.author}</p>
                <p className="text-xs text-muted-foreground">
                  {book.totalPages} pages · {book.language.toUpperCase()}
                  {book.staffPick ? " · Staff pick" : ""}
                </p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={`Delete ${book.title}`}
                disabled={deletingId === book.id}
                onClick={() => void removeBook(book)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </article>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
