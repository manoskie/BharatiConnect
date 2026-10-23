import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAs2iKb6OvGCjV726bb1OWfWRLOjmewX0U",
  authDomain: "bharaticonnect-b92dc.firebaseapp.com",
  projectId: "bharaticonnect-b92dc",
  storageBucket: "bharaticonnect-b92dc.firebasestorage.app",
  messagingSenderId: "945370264390",
  appId: "1:945370264390:web:39776be2e017cd3f612b47",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

try {
  const cred = await signInWithEmailAndPassword(auth, "sanika@example.com", "TemporaryTestPassword123!");
  console.log("Logged in:", cred.user.uid);
  
  const testUserData = {
    id: cred.user.uid,
    name: "Sanika Kulkarni",
    email: "sanika@example.com",
    phone: "9876543210",
    role: "staff",
    departmentId: "d1",
    active: true,
    streak: 0,
    points: 0,
    level: 1,
    language: "mr",
    reminderTime: "07:30",
    joinedAt: "2026-10-21",
    avatarColor: "#6366f1",
  };

  await setDoc(doc(db, "users", cred.user.uid), testUserData);
  console.log("SUCCESS creating users doc!");
} catch (err) {
  console.log("Failed creating users doc:", err.message);
}
