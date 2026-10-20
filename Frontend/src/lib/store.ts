import { useSyncExternalStore } from "react";
import * as demo from "./demo-data";
import { api, tokenStore } from "./api";
import { logoutUser, subscribeToFirebaseAuth, testConnection } from "./firebase";
import {
  fsGetAdminRole,
  fsGetUser,
  fsCreateInvitedUser,
  fsChangeUserRole,
  subscribeToFirestore,
  fsCheckIn,
  fsSaveBook,
  fsUpdateBook,
  fsSaveNotice,
  fsSavePost,
  fsSaveVideo,
  fsSetPinnedVideo,
  fsAddUserActivity,
  fsMarkNotificationRead,
  fsSaveChallenge,
  fsUpdateChallenge,
  fsSaveSuggestion,
  fsUpdateSuggestion,
  fsSaveHoliday,
  fsDeleteHoliday,
  fsUpdateSettings,
  fsUpdateUser,
  fsSaveDepartment,
  fsDeleteDepartment,
  fsUpdateReadingLog,
  fsSaveTakeaway,
  fsSaveAuditEntry,
} from "./firebase-service";
import type {
  AppNotification,
  AuditEntry,
  BadgeDef,
  Book,
  BookStatus,
  Challenge,
  CuratedBook,
  Department,
  HolidayEntry,
  Language,
  Notice,
  Post,
  ProofOutcome,
  ReadingLog,
  Role,
  Settings,
  Suggestion,
  User,
  Video,
  WeeklyTakeaway,
  UserActivity,
} from "./types";

export interface AppState {
  language: Language;
  theme: "light" | "dark";
  authReady: boolean;
  sessionUser: User | null;
  adminUser: User | null;
  adminAuthed: boolean;
  departments: Department[];
  staff: User[];
  books: Book[];
  catalogBooks: CuratedBook[];
  userActivity: UserActivity;
  logs: ReadingLog[];
  challenges: Challenge[];
  badges: BadgeDef[];
  notices: Notice[];
  posts: Post[];
  videos: Video[];
  suggestions: Suggestion[];
  holidays: HolidayEntry[];
  notifications: AppNotification[];
  audit: AuditEntry[];
  settings: Settings;
  dayStates: Record<string, "logged" | "missed" | "frozen" | "holiday">;
  todayLogged: boolean;
  todayPagesRead: number;
  lastCelebration: { points: number; streak: number } | null;
  takeaways: WeeklyTakeaway[];
}

export function normalizeUser(raw: any): User {
  if (!raw) return demo.currentUser;
  return {
    id: String(raw.id || raw._id || ""),
    name: raw.name || "Member",
    email: raw.email || "",
    phone: raw.phone || "",
    role: raw.role || "staff",
    departmentId: String(raw.departmentId?._id || raw.departmentId || "d1"),
    active: raw.active !== false,
    streak: raw.currentStreak ?? raw.streak ?? 0,
    points: raw.points ?? 0,
    level:
      typeof raw.level === "number" ? raw.level : raw.points ? Math.floor(raw.points / 100) + 1 : 1,
    language: raw.language === "en" ? "en" : "mr",
    reminderTime: raw.reminderTime || "20:00",
    joinedAt: raw.createdAt
      ? new Date(raw.createdAt).toISOString().slice(0, 10)
      : demo.iso(new Date()),
    avatarColor: raw.avatarColor || "#6366f1",
  };
}

const initial: AppState = {
  language: "mr",
  theme: "light",
  authReady: false,
  sessionUser: null,
  adminUser: null,
  adminAuthed: false,
  departments: demo.departments,
  staff: demo.staff,
  books: demo.books,
  catalogBooks: [],
  userActivity: { readNoticeIds: [], watchedVideoIds: [], joinedChallengeIds: [] },
  logs: demo.readingLogs,
  challenges: demo.challenges,
  badges: demo.badges,
  notices: demo.notices,
  posts: demo.posts,
  videos: demo.videos,
  suggestions: demo.suggestions,
  holidays: demo.holidays,
  notifications: demo.notifications,
  audit: demo.auditLog,
  settings: demo.settings,
  dayStates: demo.dayStates,
  todayLogged: false,
  todayPagesRead: 0,
  lastCelebration: null,
  takeaways: [],
};

let state = initial;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const set = (patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) => {
  state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
  emit();
};

const uid = () => crypto.randomUUID();

function upsertById<T extends { id: string }>(items: T[], item: T): T[] {
  return [item, ...items.filter((existing) => existing.id !== item.id)];
}

function todayInKolkata() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function calculateCurrentStreak(logs: ReadingLog[]) {
  const dates = new Set(logs.map((log) => log.date));
  const today = todayInKolkata();
  const [year, month, day] = today.split("-").map(Number);
  const todayUtc = Date.UTC(year!, month! - 1, day!);
  const yesterday = new Date(todayUtc - 86_400_000).toISOString().slice(0, 10);
  let cursor = dates.has(today) ? todayUtc : dates.has(yesterday) ? todayUtc - 86_400_000 : null;
  if (cursor === null) return 0;

  let streak = 0;
  while (dates.has(new Date(cursor).toISOString().slice(0, 10))) {
    streak++;
    cursor -= 86_400_000;
  }
  return streak;
}

export const store = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get: () => state,
};

export function useAppState(): AppState {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

function logAudit(action: string, target: string, before?: string, after?: string) {
  const entry: AuditEntry = {
    id: uid(),
    actor: state.adminUser?.name ?? "System",
    action,
    target,
    at: demo.iso(new Date()),
    ...(before !== undefined && { before }),
    ...(after !== undefined && { after }),
  };
  set({ audit: [entry, ...state.audit] });
  if (state.adminUser) {
    void fsSaveAuditEntry(entry).catch((error: unknown) => {
      console.error(`Unable to persist administrator audit entry "${entry.action}":`, error);
    });
  }
}

let hydratingPromise: Promise<void> | null = null;
let authDataUnsubscribe: (() => void) | null = null;
let authStateGeneration = 0;

export const actions = {
  async setLanguage(language: Language) {
    if (state.sessionUser) await fsUpdateUser(state.sessionUser.id, { language });
    set({ language });
    if (typeof window !== "undefined") localStorage.setItem("bc.lang", language);
  },
  setTheme(theme: "light" | "dark") {
    set({ theme });
    if (typeof window !== "undefined") {
      localStorage.setItem("bc.theme", theme);
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
  },
  async setReminderTime(time: string) {
    if (!state.sessionUser) throw new Error("Sign in before changing reminder settings.");
    await fsUpdateUser(state.sessionUser.id, { reminderTime: time });
    set({ sessionUser: { ...state.sessionUser, reminderTime: time } });
  },
  login(user: User) {
    const normalized = normalizeUser(user);
    set({ sessionUser: normalized });
  },
  logout() {
    if (tokenStore.refresh()) {
      api.post("/auth/logout", { refreshToken: tokenStore.refresh() }).catch((error: unknown) => {
        console.error("Legacy API logout failed:", error);
      });
    }
    tokenStore.clear();
    void logoutUser().catch((error) => {
      console.error("Firebase sign-out failed:", error);
    });
    set({ sessionUser: null, adminAuthed: false, adminUser: null });
  },
  adminLogin(user?: any) {
    const normalized = normalizeUser(user);
    set({ sessionUser: normalized, adminAuthed: true, adminUser: normalized });
  },
  adminLogout() {
    actions.logout();
  },

  async checkIn(input: { bookId: string; toPage: number; note?: string }): Promise<ReadingLog> {
    const user = state.sessionUser;
    if (!user) throw new Error("Sign in before recording reading progress.");
    const book = state.books.find((b) => b.id === input.bookId);
    if (!book || book.status !== "reading") {
      throw new Error("Choose a book marked as currently reading.");
    }

    const log = await fsCheckIn(book, input.toPage, input.note, state.settings.minimumPages);
    const logs = [log, ...state.logs.filter((existing) => existing.id !== log.id)];
    const streak = calculateCurrentStreak(logs);
    set({
      logs,
      books: state.books.map((b) =>
        b.id === book.id
          ? {
              ...b,
              currentPage: input.toPage,
            }
          : b,
      ),
      sessionUser: { ...user, streak },
      todayLogged: true,
      todayPagesRead: log.pages,
      dayStates: { ...state.dayStates, [log.date]: "logged" },
      lastCelebration: { points: 0, streak },
    });
    return log;
  },

  clearCelebration() {
    set({ lastCelebration: null });
  },

  async addBook(
    book: Omit<Book, "id" | "currentPage" | "coverColor"> & { sourceId?: string },
  ) {
    if (!state.sessionUser) throw new Error("Sign in before adding books to your shelf.");
    const colors = ["#6366f1", "#10B981", "#F59E0B", "#0ea5e9", "#8b5cf6", "#ef4444"];
    const { sourceId, ...bookDetails } = book;
    const existingBook = sourceId
      ? state.books.find((shelfBook) => shelfBook.id === sourceId)
      : undefined;
    const status =
      existingBook && book.status !== "reading" ? existingBook.status : book.status;
    const newBook: Book = {
      ...bookDetails,
      status,
      id: existingBook?.id ?? sourceId ?? uid(),
      currentPage: 0,
      coverColor: colors[state.books.length % colors.length]!,
      shortRead: book.totalPages < 150,
    };
    if (
      newBook.status === "reading" &&
      existingBook?.status !== "reading" &&
      state.books.filter((shelfBook) => shelfBook.status === "reading").length >= 3
    ) {
      throw new Error("You can have up to 3 books in Reading at a time.");
    }
    const savedBook = await fsSaveBook(newBook);
    set({ books: upsertById(state.books, savedBook) });
    return savedBook;
  },

  async setBookStatus(id: string, status: BookStatus) {
    if (
      status === "reading" &&
      state.books.filter((b) => b.status === "reading" && b.id !== id).length >= 3
    ) {
      return false;
    }
    await fsUpdateBook(id, { status });
    set({ books: state.books.map((b) => (b.id === id ? { ...b, status } : b)) });
    return true;
  },

  async rateBook(id: string, rating: number, review: string) {
    await fsUpdateBook(id, { rating, review });
    set({ books: state.books.map((b) => (b.id === id ? { ...b, rating, review } : b)) });
  },

  async joinChallenge(id: string) {
    const user = state.sessionUser;
    if (!user) throw new Error("Sign in before joining a challenge.");
    await fsAddUserActivity(user.id, "joinedChallengeIds", id);
    set({
      userActivity: {
        ...state.userActivity,
        joinedChallengeIds: [...new Set([...state.userActivity.joinedChallengeIds, id])],
      },
    });
  },

  async markNoticeRead(id: string) {
    const user = state.sessionUser;
    if (!user) throw new Error("Sign in to mark notices as read.");
    await fsAddUserActivity(user.id, "readNoticeIds", id);
    set({
      userActivity: {
        ...state.userActivity,
        readNoticeIds: [...new Set([...state.userActivity.readNoticeIds, id])],
      },
    });
  },

  async markWatched(id: string) {
    const user = state.sessionUser;
    if (!user) throw new Error("Sign in to save watched videos.");
    await fsAddUserActivity(user.id, "watchedVideoIds", id);
    set({
      userActivity: {
        ...state.userActivity,
        watchedVideoIds: [...new Set([...state.userActivity.watchedVideoIds, id])],
      },
    });
  },

  async addSuggestion(title: string, author: string) {
    const newSug = {
      id: uid(),
      title,
      author,
      byName: state.sessionUser?.name ?? "Staff",
      ...(state.sessionUser ? { userId: state.sessionUser.id } : {}),
      status: "pending" as const,
    };
    await fsSaveSuggestion(newSug);
    set({ suggestions: upsertById(state.suggestions, newSug) });
  },

  async setSuggestionStatus(id: string, status: Suggestion["status"]) {
    await fsUpdateSuggestion(id, status);
    set({ suggestions: state.suggestions.map((s) => (s.id === id ? { ...s, status } : s)) });
    logAudit(`suggestion.${status}`, id);
  },

  async markNotificationRead(id: string) {
    await fsMarkNotificationRead(id);
    set({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    });
  },

  // Admin actions
  async addStaff(input: { name: string; email: string; phone: string; departmentId: string }) {
    const user = await fsCreateInvitedUser({ ...input, role: "staff" });
    set({ staff: upsertById(state.staff, user) });
    logAudit("staff.invite", user.name, undefined, "invited");
    return user;
  },

  async toggleStaffActive(id: string) {
    const target = state.staff.find((s) => s.id === id);
    if (!target) return;
    const newActive = !target.active;
    await fsUpdateUser(id, { active: newActive });
    set({ staff: state.staff.map((s) => (s.id === id ? { ...s, active: newActive } : s)) });
    logAudit(
      target.active ? "staff.deactivate" : "staff.reactivate",
      target.name,
      target.active ? "active" : "inactive",
      target.active ? "inactive" : "active",
    );
  },

  async setStaffRole(id: string, role: Role) {
    const target = state.staff.find((s) => s.id === id);
    if (!target || (role !== "staff" && role !== "admin")) return;
    await fsChangeUserRole(id, role);
    set({ staff: state.staff.map((s) => (s.id === id ? { ...s, role } : s)) });
    logAudit("staff.role", target.name, target.role, role);
  },

  async saveDepartment(dept: { id?: string; nameEn: string; nameMr: string }) {
    if (dept.id) {
      const updatedDept = {
        id: dept.id,
        nameEn: dept.nameEn,
        nameMr: dept.nameMr,
        staffCount: state.departments.find((d) => d.id === dept.id)?.staffCount || 0,
      };
      await fsSaveDepartment(updatedDept);
      set({ departments: upsertById(state.departments, updatedDept) });
      logAudit("department.update", dept.nameEn);
    } else {
      const newDept = { id: uid(), ...dept, staffCount: 0 };
      await fsSaveDepartment(newDept);
      set({ departments: upsertById(state.departments, newDept) });
      logAudit("department.create", dept.nameEn);
    }
  },

  async deleteDepartment(id: string) {
    const d = state.departments.find((x) => x.id === id);
    if (!d) return;
    if (state.staff.some((user) => user.departmentId === id)) {
      throw new Error("This department cannot be deleted while user accounts are assigned to it.");
    }
    await fsDeleteDepartment(id);
    set({ departments: state.departments.filter((x) => x.id !== id) });
    logAudit("department.delete", d.nameEn);
  },

  async reviewProof(logId: string, outcome: ProofOutcome, reason?: string) {
    const log = state.logs.find((l) => l.id === logId);
    await fsUpdateReadingLog(logId, {
      proofOutcome: outcome,
      ...(reason ? { proofReviewReason: reason } : {}),
    });
    set({
      logs: state.logs.map((l) => (l.id === logId ? { ...l, proofOutcome: outcome } : l)),
    });
    if (log) {
      logAudit(
        `proof.${outcome}`,
        `${log.userName} — ${log.bookTitle}${reason ? ` (${reason})` : ""}`,
        "needs_review",
        outcome,
      );
    }
  },

  async adjustMissedDay(_date: string, _target: string) {
    throw new Error("Manual reading adjustments are not available until a trusted server-side audit workflow is configured.");
  },

  async addNotice(notice: Omit<Notice, "id" | "read" | "publishedAt">) {
    const newNotice = { ...notice, id: uid(), read: false, publishedAt: demo.iso(new Date()) };
    await fsSaveNotice(newNotice);
    set({ notices: upsertById(state.notices, newNotice) });
    logAudit("notice.publish", notice.titleEn);
  },

  async addPost(post: Omit<Post, "id" | "publishedAt" | "authorName">) {
    const newPost = {
      ...post,
      id: uid(),
      authorName: state.adminUser?.name ?? "Admin",
      publishedAt: demo.iso(new Date()),
    };
    await fsSavePost(newPost);
    set({ posts: upsertById(state.posts, newPost) });
    logAudit("post.publish", post.bodyEn.slice(0, 40));
  },

  async addVideo(video: Omit<Video, "id" | "watched">) {
    const newVideo = { ...video, id: uid(), watched: false };
    await fsSaveVideo(newVideo);
    set({ videos: upsertById(state.videos, newVideo) });
    logAudit("video.create", video.titleEn);
  },

  async pinTip(id: string) {
    await fsSetPinnedVideo(id);
    set({ videos: state.videos.map((v) => ({ ...v, pinnedTip: v.id === id })) });
    logAudit("video.pin_ai_tip", id);
  },

  async saveChallenge(challenge: Omit<Challenge, "id" | "progress" | "joined">) {
    const newChallenge = { ...challenge, id: uid(), progress: 0, joined: false };
    await fsSaveChallenge(newChallenge);
    set({ challenges: upsertById(state.challenges, newChallenge) });
    logAudit("challenge.create", challenge.titleEn);
  },

  async addHoliday(entry: Omit<HolidayEntry, "id">) {
    const newHoliday = { ...entry, id: uid() };
    await fsSaveHoliday(newHoliday);
    set({ holidays: upsertById(state.holidays, newHoliday) });
    logAudit(`calendar.${entry.type}`, entry.labelEn);
  },

  async removeHoliday(id: string) {
    await fsDeleteHoliday(id);
    set({ holidays: state.holidays.filter((h) => h.id !== id) });
    logAudit("calendar.delete", id);
  },

  async updateSettings(patch: Partial<Settings>) {
    const before = state.settings;
    if (
      patch.minimumPages !== undefined &&
      (!Number.isInteger(patch.minimumPages) || patch.minimumPages < 1)
    ) {
      throw new Error("Minimum pages must be a positive whole number.");
    }
    if (
      patch.freezesPerWeek !== undefined &&
      (!Number.isInteger(patch.freezesPerWeek) || patch.freezesPerWeek < 0)
    ) {
      throw new Error("Weekly freezes must be a non-negative whole number.");
    }
    await fsUpdateSettings(patch);
    set((current) => ({ settings: { ...current.settings, ...patch } }));
    Object.entries(patch).forEach(([k, v]) =>
      logAudit("settings.update", k, String(before[k as keyof Settings]), String(v)),
    );
  },

  async createAdmin(input: { name: string; email: string; departmentId: string }) {
    const user = await fsCreateInvitedUser({
      ...input,
      phone: "",
      role: "admin",
    });
    set({ staff: upsertById(state.staff, user) });
    logAudit("admin.create", user.name, undefined, "admin");
    return user;
  },

  async hydrate() {
    if (typeof window === "undefined") return;
    if (hydratingPromise) return hydratingPromise;

    hydratingPromise = (async () => {
      const lang = localStorage.getItem("bc.lang") as Language | null;
      const theme = localStorage.getItem("bc.theme") as "light" | "dark" | null;
      if (lang) set({ language: lang });
      if (theme) {
        set({ theme });
        document.documentElement.classList.toggle("dark", theme === "dark");
      }

      // Connect to Firestore without copying demo records into the configured project.
      void testConnection();
      subscribeToFirebaseAuth((firebaseUser) => {
        const generation = ++authStateGeneration;
        authDataUnsubscribe?.();
        authDataUnsubscribe = null;
        if (!firebaseUser) {
          set({
            authReady: true,
            sessionUser: null,
            adminAuthed: false,
            adminUser: null,
            staff: [],
            books: [],
            catalogBooks: [],
            userActivity: { readNoticeIds: [], watchedVideoIds: [], joinedChallengeIds: [] },
            logs: [],
            challenges: [],
            badges: [],
            notices: [],
            posts: [],
            videos: [],
            suggestions: [],
            holidays: [],
            notifications: [],
            audit: [],
            todayLogged: false,
            todayPagesRead: 0,
            dayStates: {},
          });
          return;
        }

        set({
          authReady: false,
          sessionUser: null,
          adminAuthed: false,
          adminUser: null,
          staff: [],
          books: [],
          catalogBooks: [],
          userActivity: { readNoticeIds: [], watchedVideoIds: [], joinedChallengeIds: [] },
          logs: [],
          challenges: [],
          badges: [],
          notices: [],
          posts: [],
          videos: [],
          suggestions: [],
          holidays: [],
          notifications: [],
          audit: [],
          todayLogged: false,
          todayPagesRead: 0,
          dayStates: {},
        });

        void Promise.all([fsGetAdminRole(firebaseUser.uid), fsGetUser(firebaseUser.uid)])
          .then(([adminRole, profile]) => {
            if (generation !== authStateGeneration) return;
            if (!profile) {
              console.error("Signed-in Firebase account has no BharatiConnect user profile.");
              void logoutUser();
              return;
            }
            if (!profile.active) {
              console.error("A deactivated Firebase account attempted to restore a session.");
              void logoutUser();
              return;
            }
            const normalized = normalizeUser({
              ...profile,
              id: firebaseUser.uid,
              name: firebaseUser.displayName || profile.name,
              email: firebaseUser.email || profile.email,
              role: adminRole ?? "staff",
            });
            set({
              authReady: true,
              sessionUser: normalized,
              adminUser: adminRole ? normalized : null,
              adminAuthed: Boolean(adminRole),
              staff: [],
              books: [],
              logs: [],
              challenges: [],
              badges: [],
              notices: [],
              posts: [],
              videos: [],
              suggestions: [],
              holidays: [],
              notifications: [],
              audit: [],
              todayLogged: false,
              todayPagesRead: 0,
              dayStates: {},
            });
            authDataUnsubscribe = subscribeToFirestore(
              firebaseUser.uid,
              Boolean(adminRole),
              (partial) => {
                if (Array.isArray(partial["logs"])) {
                  const logs = partial["logs"] as ReadingLog[];
                  const today = todayInKolkata();
                  const userLogs = logs.filter((log) => log.userId === firebaseUser.uid);
                  set((current) => ({
                    ...partial,
                    sessionUser: current.sessionUser
                      ? { ...current.sessionUser, streak: calculateCurrentStreak(userLogs) }
                      : null,
                    todayLogged: userLogs.some((log) => log.date === today),
                    todayPagesRead: userLogs
                      .filter((log) => log.date === today)
                      .reduce((total, log) => total + log.pages, 0),
                    dayStates: Object.fromEntries(userLogs.map((log) => [log.date, "logged"])),
                  }));
                  return;
                }
                set(partial as Partial<AppState>);
              },
            );
          })
          .catch((error: unknown) => {
            if (generation !== authStateGeneration) return;
            console.error("Firebase session restore failed:", error);
            set({ authReady: true });
            void logoutUser();
          });
      });
    })().finally(() => {
      hydratingPromise = null;
    });

    return hydratingPromise;
  },
};
