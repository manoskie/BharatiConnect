import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

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
  const cred = await signInWithEmailAndPassword(auth, "rahilpatel112399@gmail.com", "TemporaryTestPassword123!");
  console.log("Logged in as rahilpatel, uid:", cred.user.uid, "emailVerified:", cred.user.emailVerified);
  
  // Try reading admins/{uid}
  const adminSnap = await getDoc(doc(db, "admins", cred.user.uid));
  console.log("admins doc exists:", adminSnap.exists(), adminSnap.data());
} catch (err) {
  console.log("Error:", err.message);
}
