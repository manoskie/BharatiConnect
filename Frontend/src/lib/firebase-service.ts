import {
  collection,
  arrayUnion,
  doc,
  getDoc,
  increment,
  runTransaction,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  limit,
  serverTimestamp,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import {
  auth,
  createInvitedAuthAccount,
  db,
  firebaseConfigured,
  handleFirestoreError,
  OperationType,
} from "./firebase";
import { updateProfile } from "firebase/auth";
import * as demo from "./demo-data";
import type {
  AuditEntry,
  AppNotification,
  Book,
  Challenge,
  CuratedBook,
  Department,
  HolidayEntry,
  Notice,
  Post,
  ReadingLog,
  Settings,
  Suggestion,
  User,
  Video,
  WeeklyTakeaway,
} from "./types";

export function getDateInIndia(offsetDays = 0): string {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export async function fsGetAdminRole(uid: string): Promise<"admin" | "owner" | null> {
  const path = `admins/${uid}`;
  try {
    const snapshot = await getDoc(doc(db, "admins", uid));
    if (!snapshot.exists()) return null;
    const role = snapshot.data()["role"];
    if (role !== "admin" && role !== "owner") {
      throw new Error(`Invalid administrator role in ${path}. Set role to "admin" or "owner".`);
    }
    return role;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function fsGetUser(uid: string): Promise<User | null> {
  const path = `users/${uid}`;
  try {
    const snapshot = await getDoc(doc(db, "users", uid));
    return snapshot.exists() ? (snapshot.data() as User) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export function fsSubscribeUserPoints(
  uid: string,
  onPoints: (points: number) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, "users", uid),
    (snapshot) => {
      if (!snapshot.exists()) {
        onError(new Error(`User profile not found: users/${uid}`));
        return;
      }
      const data = snapshot.data();
      onPoints(typeof data["points"] === "number" ? data["points"] : 0);
    },
    onError,
  );
}

export function fsSubscribeUserReadingLogs(
  uid: string,
  onLogs: (logs: ReadingLog[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    onError(new Error("You can only view your own reading history."));
    return () => {};
  }

  return onSnapshot(
    query(collection(db, "reading_logs"), where("userId", "==", uid)),
    (snapshot) => {
      const logs = snapshot.docs
        .map((logDoc) => ({ ...logDoc.data(), id: logDoc.id }) as ReadingLog)
        .filter((log) => log.userId === uid)
        .sort((a, b) => b.date.localeCompare(a.date));
      onLogs(logs);
    },
    onError,
  );
}

export interface LeaderboardStaff {
  id: string;
  name: string;
  departmentId: string;
  points: number;
  streak: number;
}

export interface AdminStaffMember {
  id: string;
  name: string;
  email: string;
  departmentId: string;
  points: number;
}

export function fsSubscribeAdminStaff(
  onStaff: (staff: AdminStaffMember[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, "users"),
    (snapshot) => {
      const staff = snapshot.docs
        .filter((userDoc) => userDoc.data()["role"] === "staff")
        .map((userDoc) => {
          const data = userDoc.data();
          return {
            id: userDoc.id,
            name: typeof data["name"] === "string" ? data["name"] : "",
            email: typeof data["email"] === "string" ? data["email"] : "",
            departmentId:
              typeof data["departmentId"] === "string" ? data["departmentId"] : "",
            points:
              typeof data["points"] === "number" && Number.isFinite(data["points"])
                ? data["points"]
                : 0,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
      onStaff(staff);
    },
    onError,
  );
}

export async function fsGetStaffReadingLogs(uid: string): Promise<ReadingLog[]> {
  const actor = auth.currentUser;
  if (!actor || !(await fsGetAdminRole(actor.uid))) {
    throw new Error("Administrator access is required to read staff reading history.");
  }

  try {
    const snapshot = await getDocs(
      query(collection(db, "reading_logs"), where("userId", "==", uid)),
    );
    return snapshot.docs.map(
      (logDoc) => ({ ...logDoc.data(), id: logDoc.id }) as ReadingLog,
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `reading_logs (userId: ${uid})`);
  }
}

export async function fsResetUserPoints(uid: string): Promise<void> {
  const actor = auth.currentUser;
  if (!actor || !(await fsGetAdminRole(actor.uid))) {
    throw new Error("Administrator access is required to reset points.");
  }

  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, "users", uid), { points: 0 });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function fsSubscribeLeaderboard(
  onStaff: (staff: LeaderboardStaff[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(
      collection(db, "users"),
      where("role", "==", "staff"),
      where("active", "==", true),
    ),
    (snapshot) => {
      const leaderboard = snapshot.docs
        .map((userDoc) => {
          const data = userDoc.data();
          return {
            id: userDoc.id,
            name: typeof data["name"] === "string" ? data["name"] : "",
            departmentId:
              typeof data["departmentId"] === "string" ? data["departmentId"] : "",
            points:
              typeof data["points"] === "number" && Number.isFinite(data["points"])
                ? data["points"]
                : 0,
            streak:
              typeof data["currentStreak"] === "number" && Number.isFinite(data["currentStreak"])
                ? data["currentStreak"]
                : typeof data["streak"] === "number" && Number.isFinite(data["streak"])
                  ? data["streak"]
                  : 0,
          };
        })
        .sort((a, b) => b.points - a.points || b.streak - a.streak || a.name.localeCompare(b.name));
      onStaff(leaderboard);
    },
    onError,
  );
}

export async function fsAwardPoints(
  uid: string,
  activity: "dailyCheckIn" | "sevenDayStreak" | "bookCompletion",
): Promise<number> {
  const pointsByActivity = {
    dailyCheckIn: 10,
    sevenDayStreak: 50,
    bookCompletion: 100,
  } as const;
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, "users", uid), {
      points: increment(pointsByActivity[activity]),
    });
    return pointsByActivity[activity];
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function fsSaveFcmToken(uid: string, token: string): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    throw new Error("You can only register a notification token for your own account.");
  }
  if (!token.trim()) {
    throw new Error("A valid Firebase Cloud Messaging token is required.");
  }

  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, "users", uid), {
      fcmTokens: arrayUnion(token),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function fsCreateInvitedUser(input: {
  name: string;
  email: string;
  phone: string;
  departmentId: string;
  role: "staff" | "admin";
}): Promise<User> {
  const actor = auth.currentUser;
  if (!actor) throw new Error("Sign in as an administrator before creating accounts.");
  const actorRole = await fsGetAdminRole(actor.uid);
  if (!actorRole || (input.role === "admin" && actorRole !== "owner")) {
    throw new Error(input.role === "admin" ? "Only the owner can invite administrators." : "Administrator access is required.");
  }

  const date = getDateInIndia();
  let createdUid: string | null = null;
  const writeProfile = async (uid: string, email: string) => {
    createdUid = uid;
    const user: User = {
      id: uid,
      name: input.name.trim(),
      email,
      phone: input.phone.trim(),
      role: input.role,
      departmentId: input.departmentId,
      active: true,
      streak: 0,
      currentStreak: 0,
      points: 0,
      level: 1,
      language: "mr",
      reminderTime: "07:30",
      joinedAt: date,
      avatarColor: "#6366f1",
    };
    const batch = writeBatch(db);
    batch.set(doc(db, "users", uid), user);
    if (input.role === "admin") batch.set(doc(db, "admins", uid), { role: "admin" });
    await batch.commit();
    return user;
  };
  const rollback = async (uid: string) => {
    const batch = writeBatch(db);
    batch.update(doc(db, "users", uid), { active: false });
    if (input.role === "admin") batch.delete(doc(db, "admins", uid));
    await batch.commit();
  };

  try {
    return await createInvitedAuthAccount(input.email, input.name, writeProfile, rollback);
  } catch (error) {
    if (createdUid) {
      console.error(`Firebase invitation setup failed for account ${createdUid}.`);
    }
    throw error;
  }
}

export async function fsChangeUserRole(uid: string, role: "staff" | "admin") {
  const actor = auth.currentUser;
  if (!actor || (await fsGetAdminRole(actor.uid)) !== "owner") {
    throw new Error("Only the owner can change administrator access.");
  }
  const batch = writeBatch(db);
  batch.update(doc(db, "users", uid), { role });
  if (role === "admin") batch.set(doc(db, "admins", uid), { role: "admin" });
  else batch.delete(doc(db, "admins", uid));
  await batch.commit();
}

export class ReadingCheckInError extends Error {}

export function fsSubscribeCuratedBooks(
  onBooks: (books: CuratedBook[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(db, "books"), limit(200)),
    (snapshot) => {
      onBooks(snapshot.docs.map((bookDoc) => ({ ...bookDoc.data(), id: bookDoc.id }) as CuratedBook));
    },
    (error) => onError(error),
  );
}

export async function fsCreateCuratedBook(
  book: Omit<CuratedBook, "id" | "createdBy"> & { googleBooksId?: string },
): Promise<CuratedBook> {
  const user = auth.currentUser;
  if (!user || !(await fsGetAdminRole(user.uid))) {
    throw new Error("Administrator access is required to curate books.");
  }
  if (!book.title.trim() || !book.author.trim() || !Number.isInteger(book.totalPages) || book.totalPages < 1) {
    throw new Error("Enter a title, author, and positive whole-number page count.");
  }

  const id = book.googleBooksId ? `google_${book.googleBooksId}` : crypto.randomUUID();
  const ref = doc(db, "books", id);
  const curatedBook: CuratedBook = {
    ...book,
    id,
    title: book.title.trim(),
    author: book.author.trim(),
    coverUrl: book.coverUrl.trim(),
    createdBy: user.uid,
  };
  await runTransaction(db, async (transaction) => {
    if ((await transaction.get(ref)).exists()) {
      throw new Error("This Google Books title has already been added to the catalogue.");
    }
    transaction.set(ref, {
      title: curatedBook.title,
      author: curatedBook.author,
      totalPages: curatedBook.totalPages,
      language: curatedBook.language,
      coverUrl: curatedBook.coverUrl,
      ...(curatedBook.googleBooksId ? { googleBooksId: curatedBook.googleBooksId } : {}),
      staffPick: curatedBook.staffPick,
      createdBy: curatedBook.createdBy,
    });
  });
  return curatedBook;
}

export async function fsDeleteCuratedBook(id: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !(await fsGetAdminRole(user.uid))) {
    throw new Error("Administrator access is required to remove curated books.");
  }
  const path = `books/${id}`;
  try {
    await deleteDoc(doc(db, "books", id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToFirestore(
  uid: string,
  isAdmin: boolean,
  updateState: (partial: Record<string, unknown>) => void,
): Unsubscribe {
  if (typeof window === "undefined" || !firebaseConfigured) return () => {};

  const unsubs: (() => void)[] = [];

  const bind = <T>(
    collName: string,
    key: string,
    mapFn?: (docData: any, id: string) => T,
    filters: ReturnType<typeof where>[] = [],
  ) => {
    const q = query(collection(db, collName), ...filters, limit(200));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) =>
          mapFn ? mapFn(d.data(), d.id) : { ...d.data(), id: d.id },
        );
        updateState({ [key]: items });
      },
      (error) => console.error(`Firestore subscription failed on ${collName}:`, error),
    );
    unsubs.push(unsub);
  };

  bind<Department>("departments", "departments");
  bind<CuratedBook>("books", "catalogBooks", (data, id) => ({ ...data, id }) as CuratedBook);
  bind<Book>(
    "userBooks",
    "books",
    (data, id) => {
      const documentPrefix = `${uid}_`;
      return {
        ...data,
        id: id.startsWith(documentPrefix) ? id.slice(documentPrefix.length) : String(data.id ?? ""),
        firestoreId: id,
      } as Book;
    },
    [where("userId", "==", uid)],
  );
  bind<Challenge>("challenges", "challenges");
  bind<Notice>("notices", "notices");
  bind<Post>("posts", "posts");
  bind<Video>("videos", "videos");
  bind<Suggestion>(
    "suggestions",
    "suggestions",
    (data, id) => ({ ...data, id }) as Suggestion,
    isAdmin ? [] : [where("userId", "==", uid)],
  );
  bind<HolidayEntry>("holidays", "holidays");
  bind<AppNotification>(
    "notifications",
    "notifications",
    (data, id) => ({ ...data, id, read: Boolean(data.readAt ?? data.read) }) as AppNotification,
    [where("userId", "==", uid)],
  );
  bind<ReadingLog>(
    "reading_logs",
    "logs",
    (data, id) => ({ ...data, id }) as ReadingLog,
    isAdmin ? [] : [where("userId", "==", uid)],
  );
  let todayDate = getDateInIndia();
  let unsubscribeTodayLogs = subscribeToTodayLogs(uid, todayDate, updateState);
  const dayRolloverTimer = window.setInterval(() => {
    const nextDate = getDateInIndia();
    if (nextDate === todayDate) return;
    todayDate = nextDate;
    unsubscribeTodayLogs();
    updateState({ todayPagesRead: 0 });
    unsubscribeTodayLogs = subscribeToTodayLogs(uid, todayDate, updateState);
  }, 60_000);
  unsubs.push(() => {
    unsubscribeTodayLogs();
    window.clearInterval(dayRolloverTimer);
  });
  if (isAdmin)
    bind<User>(
      "users",
      "staff",
      (data, id) => ({
        ...data,
        id,
        currentStreak: data.currentStreak ?? data.streak ?? 0,
        streak: data.currentStreak ?? data.streak ?? 0,
      }) as User,
    );
  if (isAdmin) bind<AuditEntry>("auditLogs", "audit", (data, id) => ({ ...data, id }) as AuditEntry);

  const userActivityUnsub = onSnapshot(
    doc(db, "userActivity", uid),
    (snapshot) => {
      const data = snapshot.data();
      const stringList = (key: string) => {
        const value = data?.[key];
        return Array.isArray(value)
          ? value.filter((id: unknown): id is string => typeof id === "string")
          : [];
      };
      updateState({
        userActivity: snapshot.exists()
          ? {
              readNoticeIds: stringList("readNoticeIds"),
              watchedVideoIds: stringList("watchedVideoIds"),
              joinedChallengeIds: stringList("joinedChallengeIds"),
            }
          : { readNoticeIds: [], watchedVideoIds: [], joinedChallengeIds: [] },
      });
    },
    (error) => console.error("User activity subscription failed:", error),
  );
  unsubs.push(userActivityUnsub);

  // Settings single document subscription
  const unsubSettings = onSnapshot(
    doc(db, "settings", "habitRules"),
    (snap) => {
      if (snap.exists()) updateState({ settings: { ...demo.settings, ...snap.data() } as Settings });
    },
    (error) => console.error("Settings subscription failed:", error),
  );
  unsubs.push(unsubSettings);

  return () => {
    unsubs.forEach((u) => u());
  };
}

function subscribeToTodayLogs(
  uid: string,
  date: string,
  updateState: (partial: Record<string, unknown>) => void,
): Unsubscribe {
  return onSnapshot(
    query(
      collection(db, "reading_logs"),
      where("userId", "==", uid),
      where("date", "==", date),
    ),
    (snapshot) => {
      const pagesRead = snapshot.docs.reduce(
        (total, logDocument) => {
          const data = logDocument.data();
          return data["date"] === date ? total + Number(data["pages"] ?? 0) : total;
        },
        0,
      );
      updateState({ todayPagesRead: pagesRead });
    },
    (error) => console.error("Today's reading log subscription failed:", error),
  );
}

export async function fsCheckIn(
  book: Book,
  currentPage: number,
  note: string | undefined,
  minimumPages: number,
): Promise<ReadingLog> {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in before recording reading progress.");

  const date = getDateInIndia();
  const logId = `${user.uid}_${date}`;
  const logRef = doc(db, "reading_logs", logId);
  const shelfRef = doc(db, "userBooks", `${user.uid}_${book.id}`);
  const userRef = doc(db, "users", user.uid);
  try {
    return await runTransaction(db, async (transaction) => {
      const [shelfSnapshot, logSnapshot, userSnapshot] = await Promise.all([
        transaction.get(shelfRef),
        transaction.get(logRef),
        transaction.get(userRef),
      ]);
      if (!shelfSnapshot.exists() || !userSnapshot.exists()) {
        throw new Error("Your account or bookshelf is not set up. Contact an administrator.");
      }

      const savedBook = shelfSnapshot.data() as Book;
      const startPage =
        logSnapshot.exists() && logSnapshot.data()["bookId"] === book.id
          ? Number(logSnapshot.data()["fromPage"])
          : Number(savedBook.currentPage);
      const pages = currentPage - startPage;
      if (!Number.isInteger(currentPage) || currentPage > savedBook.totalPages) {
        throw new ReadingCheckInError(
          `Enter a page number from ${startPage + minimumPages} to ${savedBook.totalPages}.`,
        );
      }
      if (pages < minimumPages) {
        throw new ReadingCheckInError(
          `Read at least ${minimumPages} new page${minimumPages === 1 ? "" : "s"} before checking in.`,
        );
      }

      let currentStreak = 1;
      for (let daysBack = 1; ; daysBack += 1) {
        const previousLogRef = doc(
          db,
          "reading_logs",
          `${user.uid}_${getDateInIndia(-daysBack)}`,
        );
        const previousLogSnapshot = await transaction.get(previousLogRef);
        if (
          !previousLogSnapshot.exists() ||
          previousLogSnapshot.data()["userId"] !== user.uid ||
          previousLogSnapshot.data()["date"] !== getDateInIndia(-daysBack)
        ) {
          break;
        }
        currentStreak += 1;
      }

      const log: ReadingLog = {
        id: logId,
        userId: user.uid,
        userName: user.displayName || user.email || "Staff",
        bookId: book.id,
        bookTitle: savedBook.title,
        date,
        fromPage: startPage,
        toPage: currentPage,
        pages,
        ...(note ? { note: note.slice(0, 280) } : {}),
      };
      transaction.set(logRef, log);
      transaction.update(shelfRef, {
        currentPage: currentPage,
      });
      transaction.update(userRef, {
        currentStreak,
        streak: currentStreak,
        points: increment(10),
      });
      return log;
    });
  } catch (error) {
    if (error instanceof ReadingCheckInError) throw error;
    handleFirestoreError(error, OperationType.WRITE, `reading_logs/${logId}`);
  }
}

export async function fsSaveBook(book: Book): Promise<Book> {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in before adding books to your shelf.");
  const shelfBook = { ...book, userId: user.uid };
  const shelfRef = doc(db, "userBooks", `${user.uid}_${book.id}`);
  const path = shelfRef.path;
  try {
    return await runTransaction(db, async (transaction) => {
      const existingSnapshot = await transaction.get(shelfRef);
      if (existingSnapshot.exists()) {
        const existingBook = existingSnapshot.data() as Book;
        const status = book.status === "reading" ? "reading" : existingBook.status;
        transaction.update(shelfRef, { status });
        return {
          ...existingBook,
          id: book.id,
          firestoreId: shelfRef.id,
          status,
        };
      }
      transaction.set(shelfRef, shelfBook);
      return { ...shelfBook, firestoreId: shelfRef.id };
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function fsUpdateBook(id: string, patch: Partial<Book>) {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in before updating your bookshelf.");
  const path = `userBooks/${user.uid}_${id}`;
  try {
    await updateDoc(doc(db, "userBooks", `${user.uid}_${id}`), patch);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function fsAddUserActivity(
  uid: string,
  field: "readNoticeIds" | "watchedVideoIds" | "joinedChallengeIds",
  id: string,
) {
  const path = `userActivity/${uid}`;
  try {
    await setDoc(doc(db, "userActivity", uid), {
      userId: uid,
      [field]: arrayUnion(id),
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function fsMarkNotificationRead(id: string) {
  const path = `notifications/${id}`;
  try {
    await updateDoc(doc(db, "notifications", id), { readAt: new Date().toISOString() });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function fsSaveNotice(notice: Notice) {
  const path = `notices/${notice.id}`;
  try {
    await setDoc(doc(db, "notices", notice.id), notice);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function fsSavePost(post: Post) {
  const path = `posts/${post.id}`;
  try {
    await setDoc(doc(db, "posts", post.id), post);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function fsSaveVideo(video: Video) {
  const path = `videos/${video.id}`;
  try {
    await setDoc(doc(db, "videos", video.id), video);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function fsSetPinnedVideo(id: string) {
  const path = `videos/${id}`;
  try {
    const pinnedVideos = await getDocs(
      query(collection(db, "videos"), where("pinnedTip", "==", true)),
    );
    const batch = writeBatch(db);
    pinnedVideos.docs.forEach((videoDoc) => {
      if (videoDoc.id !== id) batch.update(videoDoc.ref, { pinnedTip: false });
    });
    batch.update(doc(db, "videos", id), { pinnedTip: true });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function fsSaveChallenge(challenge: Challenge) {
  const path = `challenges/${challenge.id}`;
  try {
    await setDoc(doc(db, "challenges", challenge.id), challenge);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function fsUpdateChallenge(id: string, patch: Partial<Challenge>) {
  const path = `challenges/${id}`;
  try {
    await updateDoc(doc(db, "challenges", id), patch);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function fsSaveSuggestion(suggestion: Suggestion) {
  const path = `suggestions/${suggestion.id}`;
  try {
    await setDoc(doc(db, "suggestions", suggestion.id), suggestion);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function fsUpdateSuggestion(id: string, status: Suggestion["status"]) {
  const path = `suggestions/${id}`;
  try {
    await updateDoc(doc(db, "suggestions", id), { status });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function fsSaveHoliday(entry: HolidayEntry) {
  const path = `holidays/${entry.id}`;
  try {
    await setDoc(doc(db, "holidays", entry.id), entry);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function fsDeleteHoliday(id: string) {
  const path = `holidays/${id}`;
  try {
    await deleteDoc(doc(db, "holidays", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function fsUpdateSettings(patch: Partial<Settings>) {
  const path = "settings/habitRules";
  try {
    await setDoc(doc(db, "settings", "habitRules"), patch, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function fsSaveUser(user: User) {
  const path = `users/${user.id}`;
  try {
    await setDoc(doc(db, "users", user.id), user);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function fsUpdateUser(id: string, patch: Partial<User>) {
  const path = `users/${id}`;
  try {
    await updateDoc(doc(db, "users", id), patch);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function fsUpdateUserProfile(
  id: string,
  profile: { name: string; phone: string; departmentId?: string },
): Promise<void> {
  const actor = auth.currentUser;
  if (!actor) throw new Error("Sign in before updating a profile.");

  const isSelf = actor.uid === id;
  const actorRole = isSelf ? null : await fsGetAdminRole(actor.uid);
  if (!isSelf && !actorRole) {
    throw new Error("Administrator access is required to edit another user's profile.");
  }

  const name = profile.name.trim();
  const phone = profile.phone.trim();
  if (!name) throw new Error("Name cannot be empty.");

  const patch: { name: string; phone: string; departmentId?: string } = { name, phone };
  if (!isSelf) {
    if (!profile.departmentId) throw new Error("Select a department for this staff member.");
    patch.departmentId = profile.departmentId;
  } else if (profile.departmentId !== undefined) {
    throw new Error("You cannot change your own department.");
  }

  const path = `users/${id}`;
  const previousDisplayName = actor.displayName;
  const previousProfile = await getDoc(doc(db, "users", id)).catch((error: unknown) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
  if (!previousProfile.exists()) {
    throw new Error(`User profile not found: ${path}`);
  }
  const previousData = previousProfile.data();
  const changes = [
    ...(previousData["name"] !== name
      ? [`Name: ${JSON.stringify(previousData["name"] ?? "")} → ${JSON.stringify(name)}`]
      : []),
    ...(previousData["phone"] !== phone
      ? [`Phone: ${JSON.stringify(previousData["phone"] ?? "")} → ${JSON.stringify(phone)}`]
      : []),
    ...(patch.departmentId !== undefined &&
    previousData["departmentId"] !== patch.departmentId
      ? [
          `Department: ${JSON.stringify(previousData["departmentId"] ?? "")} → ${JSON.stringify(patch.departmentId)}`,
        ]
      : []),
  ];

  if (isSelf) {
    await updateProfile(actor, { displayName: name });
  }

  try {
    const batch = writeBatch(db);
    batch.update(doc(db, "users", id), patch);
    if (changes.length > 0) {
      const auditId = crypto.randomUUID();
      batch.set(doc(db, "auditLogs", auditId), {
        id: auditId,
        action: "profile.update",
        actor: actor.displayName || actor.uid,
        actorUid: actor.uid,
        target: previousData["name"] || id,
        targetUid: id,
        change: changes.join("; "),
        at: new Date().toISOString(),
        timestamp: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (error) {
    if (isSelf) {
      await updateProfile(actor, { displayName: previousDisplayName ?? "" }).catch(
        (rollbackError: unknown) => {
          console.error("Unable to restore Firebase Auth display name after profile update failed:", rollbackError);
        },
      );
    }
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function fsSaveDepartment(dept: Department) {
  const path = `departments/${dept.id}`;
  try {
    await setDoc(doc(db, "departments", dept.id), dept);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function fsDeleteDepartment(id: string) {
  const path = `departments/${id}`;
  let hasAssignedUsers = false;
  try {
    hasAssignedUsers = !(
      await getDocs(query(collection(db, "users"), where("departmentId", "==", id), limit(1)))
    ).empty;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, "users");
  }
  if (hasAssignedUsers) {
    throw new Error("This department cannot be deleted while user accounts are assigned to it.");
  }
  try {
    await deleteDoc(doc(db, "departments", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function fsUpdateReadingLog(id: string, patch: Partial<ReadingLog>) {
  const path = `reading_logs/${id}`;
  try {
    await updateDoc(doc(db, "reading_logs", id), patch);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function fsSaveTakeaway(takeaway: WeeklyTakeaway) {
  const path = `takeaways/${takeaway.id}`;
  try {
    await setDoc(doc(db, "takeaways", takeaway.id), takeaway);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function fsSaveAuditEntry(entry: AuditEntry) {
  const path = `auditLogs/${entry.id}`;
  const actor = auth.currentUser;
  if (!actor) throw new Error("Sign in before writing an audit record.");
  try {
    await setDoc(doc(db, "auditLogs", entry.id), {
      ...entry,
      actorUid: actor.uid,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}
