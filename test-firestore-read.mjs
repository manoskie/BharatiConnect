import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, getDocs, collection } from "firebase/firestore";

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

// Sign in with sanika@example.com
try {
  const cred = await signInWithEmailAndPassword(auth, "sanika@example.com", "TemporaryTestPassword123!");
  console.log("Logged in as sanika, uid:", cred.user.uid);
  
  const userSnap = await getDoc(doc(db, "users", cred.user.uid));
  console.log("users/" + cred.user.uid + " exists:", userSnap.exists());
  if (userSnap.exists()) {
    console.log("User data:", userSnap.data());
  }

  // Also try reading departments
  try {
    const deptSnap = await getDocs(collection(db, "departments"));
    console.log("departments count:", deptSnap.docs.length);
    deptSnap.docs.forEach(d => console.log(d.id, d.data()));
  } catch (err) {
    console.log("Error reading departments:", err.message);
  }

  // Also try reading books
  try {
    const booksSnap = await getDocs(collection(db, "books"));
    console.log("books count:", booksSnap.docs.length);
    booksSnap.docs.forEach(b => console.log(b.id, b.data()));
  } catch (err) {
    console.log("Error reading books:", err.message);
  }
} catch (err) {
  console.error("Sign in failed:", err);
}
