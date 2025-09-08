
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  projectId: "funtrack-manager",
  appId: "1:251373291254:web:baa6647ccb8630f8028ed7",
  storageBucket: "funtrack-manager.firebasestorage.app",
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "funtrack-manager.firebaseapp.com",
  measurementId: "",
  messagingSenderId: "251373291254",
  databaseURL: "https://funtrack-manager-default-rtdb.firebaseio.com/",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getDatabase(app);

export { app, db };
