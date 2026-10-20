import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut as fbSignOut,
  updateProfile,
  deleteUser,
  verifyPasswordResetCode,
  confirmPasswordReset,
  type User as FirebaseUser,
} from "firebase/auth";
import { deleteApp } from "firebase/app";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = Object.values(firebaseConfig).every(
  (value) => typeof value === "string" && value.trim().length > 0,
);
export { firebaseConfig };
const existingDefaultApp = getApps().find((candidate) => candidate.name === "[DEFAULT]");
if (
  existingDefaultApp &&
  (existingDefaultApp.options.apiKey !== firebaseConfig.apiKey ||
    existingDefaultApp.options.authDomain !== firebaseConfig.authDomain ||
    existingDefaultApp.options.projectId !== firebaseConfig.projectId ||
    existingDefaultApp.options.storageBucket !== firebaseConfig.storageBucket ||
    existingDefaultApp.options.messagingSenderId !== firebaseConfig.messagingSenderId ||
    existingDefaultApp.options.appId !== firebaseConfig.appId)
) {
  throw new Error(
    "Firebase is already initialized with different configuration. Restart the Vite dev server after updating Frontend/.env.local.",
  );
}
const app: FirebaseApp = existingDefaultApp ?? initializeApp(firebaseConfig);

export const db = getFirestore(app, import.meta.env.VITE_FIREBASE_DATABASE_ID || "(default)");
export const auth = getAuth(app);

export function subscribeToFirebaseAuth(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function loginWithEmail(email: string, password: string) {
  if (!firebaseConfigured) {
    throw new Error("Firebase is not configured. Add your Firebase web app settings to Frontend/.env.local.");
  }
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return credential.user;
}

export async function sendPasswordReset(email: string) {
  if (!firebaseConfigured) {
    throw new Error("Firebase is not configured. Add your Firebase web app settings to Frontend/.env.local.");
  }
  await sendPasswordResetEmail(auth, email.trim());
}

export async function validatePasswordResetCode(code: string) {
  if (!firebaseConfigured) throw new Error("Firebase is not configured.");
  return verifyPasswordResetCode(auth, code);
}

export async function completePasswordReset(code: string, password: string) {
  if (!firebaseConfigured) throw new Error("Firebase is not configured.");
  await confirmPasswordReset(auth, code, password);
}

export async function createInvitedAuthAccount<T>(
  email: string,
  displayName: string,
  createProfile: (uid: string, email: string) => Promise<T>,
  rollbackProfile: (uid: string) => Promise<void>,
): Promise<T> {
  if (!firebaseConfigured || !auth.currentUser) {
    throw new Error("An authenticated administrator and a configured Firebase project are required.");
  }

  const inviteAppName = `invite-${crypto.randomUUID()}`;
  let inviteApp: FirebaseApp | undefined;
  let createdUser: FirebaseUser | undefined;
  let profileCreated = false;
  try {
    inviteApp = initializeApp(firebaseConfig, inviteAppName);
    const inviteAuth = getAuth(inviteApp);
    const credential = await createUserWithEmailAndPassword(inviteAuth, email.trim(), crypto.randomUUID());
    createdUser = credential.user;
    await updateProfile(createdUser, { displayName });
    const profile = await createProfile(createdUser.uid, createdUser.email ?? email.trim());
    profileCreated = true;
    await sendPasswordResetEmail(inviteAuth, email.trim());
    return profile;
  } catch (error) {
    if (createdUser && profileCreated) {
      await rollbackProfile(createdUser.uid).catch((cleanupError: unknown) => {
        console.error("Unable to remove the partially-created BharatiConnect profile:", cleanupError);
      });
    }
    if (createdUser) {
      await deleteUser(createdUser).catch((cleanupError: unknown) => {
        console.error("Unable to remove the partially-created Firebase account:", cleanupError);
      });
    }
    throw error;
  } finally {
    if (inviteApp) {
      await deleteApp(inviteApp);
    }
  }
}

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection() {
  if (typeof window === "undefined" || !firebaseConfigured) return;
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

export async function logoutUser() {
  await fbSignOut(auth);
}
