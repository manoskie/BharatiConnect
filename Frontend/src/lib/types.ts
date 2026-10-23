export type Role = "owner" | "admin" | "staff";
export type BookStatus = "want_to_read" | "reading" | "finished";
export type ProofMode = "off" | "optional" | "required";
export type ProofOutcome = "accepted" | "retake" | "needs_review";
export type PostType = "notice" | "update";
export type NoticePriority = "normal" | "urgent";
export type ChallengeType = "individual_pages" | "individual_days" | "collective_days";
export type SuggestionStatus = "pending" | "approved" | "rejected";
export type HolidayType = "holiday" | "leave";
export type NotificationType =
  | "daily_reminder"
  | "evening_nudge"
  | "notice_published"
  | "challenge_started"
  | "challenge_ending"
  | "badge_earned";
export type VideoCategory =
  "writing" | "spreadsheets" | "translation" | "donor_reports" | "social_media";
export type Language = "en" | "mr";
export type BookLanguage = Language | "hi";

export type DayState = "logged" | "missed" | "frozen" | "holiday";

export interface Department {
  id: string;
  nameEn: string;
  nameMr: string;
  staffCount: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  departmentId: string;
  active: boolean;
  streak: number;
  currentStreak?: number | undefined;
  streakCount?: number | undefined;
  points: number;
  level: number;
  language: Language;
  reminderTime: string;
  joinedAt: string;
  avatarColor: string;
}

export interface Book {
  id: string;
  firestoreId?: string | undefined;
  title: string;
  author: string;
  totalPages: number;
  language: BookLanguage;
  status: BookStatus;
  currentPage: number;
  coverColor: string;
  rating?: number | undefined;
  review?: string | undefined;
  shortRead?: boolean | undefined;
  staffPick?: boolean | undefined;
}

export interface CuratedBook {
  id: string;
  title: string;
  author: string;
  totalPages: number;
  language: BookLanguage;
  coverUrl: string;
  googleBooksId?: string;
  staffPick: boolean;
  createdBy: string;
}

export interface ReadingLog {
  id: string;
  userId: string;
  userName: string;
  bookId: string;
  bookTitle: string;
  date: string;
  fromPage: number;
  toPage: number;
  pages: number;
  note?: string | undefined;
  proofUrl?: string | undefined;
  proofOutcome?: ProofOutcome | undefined;
  proofReviewReason?: string | undefined;
}

export interface Challenge {
  id: string;
  titleEn: string;
  titleMr: string;
  type: ChallengeType;
  target: number;
  progress: number;
  rewardPoints: number;
  endsOn: string;
  joined: boolean;
}

export interface BadgeDef {
  id: string;
  key: string;
  earned: boolean;
  earnedOn?: string | undefined;
}

export interface WeeklyTakeaway {
  id: string;
  userId: string;
  userName: string;
  bookId: string;
  bookTitle: string;
  takeaway: string;
  submittedAt: string;
  pointsAwarded: number;
}

export interface Notice {
  id: string;
  titleEn: string;
  titleMr: string;
  bodyEn: string;
  bodyMr: string;
  priority: NoticePriority;
  pinned: boolean;
  read: boolean;
  publishedAt: string;
  readBy?: string[] | undefined;
}

export interface Post {
  id: string;
  authorName: string;
  bodyEn: string;
  bodyMr: string;
  images: string[];
  publishedAt: string;
}

export interface Video {
  id: string;
  titleEn: string;
  titleMr: string;
  youtubeId: string;
  category: VideoCategory;
  language: Language;
  watched: boolean;
  pinnedTip?: boolean | undefined;
}

export interface Suggestion {
  id: string;
  title: string;
  author: string;
  byName: string;
  userId?: string | undefined;
  status: SuggestionStatus;
  reason?: string | undefined;
}

export interface HolidayEntry {
  id: string;
  date: string;
  type: HolidayType;
  labelEn: string;
  labelMr: string;
  title?: string | undefined;
  createdBy?: string | undefined;
  createdAt?: string | undefined;
  userId?: string | undefined;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  titleEn: string;
  titleMr: string;
  at: string;
  read: boolean;
  readAt?: string | undefined;
}

export interface UserActivity {
  readNoticeIds: string[];
  watchedVideoIds: string[];
  joinedChallengeIds: string[];
}

export interface AuditEntry {
  id: string;
  actor: string;
  actorUid?: string | undefined;
  action: string;
  target: string;
  targetUid?: string | undefined;
  change?: string | undefined;
  timestamp?: string | Date | { toDate: () => Date } | undefined;
  at: string;
  before?: string | undefined;
  after?: string | undefined;
}

export interface Settings {
  minimumPages: number;
  proofMode: ProofMode;
  freezesPerWeek: number;
  reminderTime: string;
  nudgeTime: string;
  spotCheckRate: number;
  defaultLanguage: Language;
}
