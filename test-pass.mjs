import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

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

const passwords = [
  "Manan@123",
  "Manan123!",
  "Manan123",
  "Admin123!",
  "Owner123!",
  "Staff123!",
  "Password123!",
  "12345678",
  "123456",
  "password",
  "BharatiConnect123!",
  "Bharati123!",
  "manan@123",
  "manan123",
];

for (const p of passwords) {
  try {
    const cred = await signInWithEmailAndPassword(auth, "katarmalmananofficial@gmail.com", p);
    console.log(`SUCCESS with password: ${p}, uid = ${cred.user.uid}`);
    break;
  } catch (err) {
    // continue
  }
}
console.log("Done password test.");
