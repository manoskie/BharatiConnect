import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, collection, getDocs } from "firebase/firestore";

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

const testAccounts = [
  { email: "sanika@example.com", pass: "Staff123!" },
  { email: "rohan@example.com", pass: "Staff123!" },
  { email: "admin@example.com", pass: "Admin123!" },
  { email: "owner@example.com", pass: "Owner123!" },
  { email: "rahilpatel112399@gmail.com", pass: "Rahil123!" },
  { email: "rahilpatel112399@gmail.com", pass: "Admin123!" },
  { email: "katarmalmananofficial@gmail.com", pass: "Manan123!" },
  { email: "sanika@aksharbharati.org", pass: "Staff123!" },
];

for (const acc of testAccounts) {
  try {
    const cred = await signInWithEmailAndPassword(auth, acc.email, acc.pass);
    console.log(`SUCCESS: Signed in as ${acc.email}, uid = ${cred.user.uid}`);
    
    // Check users collection doc
    try {
      const userDoc = await getDoc(doc(db, "users", cred.user.uid));
      console.log(`users/${cred.user.uid} exists: ${userDoc.exists()}`);
      if (userDoc.exists()) {
        console.log(`users/${cred.user.uid} data:`, JSON.stringify(userDoc.data()));
      }
    } catch (e) {
      console.log(`Error reading users/${cred.user.uid}:`, e.message);
    }
  } catch (err) {
    console.log(`Failed for ${acc.email}: ${err.code || err.message}`);
  }
}
