
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyA0r91-Fpc3bkIh-1yAGtegCJtXOcY-HKA",
  authDomain: "kids-aria.firebaseapp.com",
  databaseURL: "https://kids-aria-default-rtdb.firebaseio.com",
  projectId: "kids-aria",
  storageBucket: "kids-aria.firebasestorage.app",
  messagingSenderId: "711487865094",
  appId: "1:711487865094:web:744939809e46b38a361e87",
  measurementId: "G-T1SR0E84N5"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getDatabase(app);

export { app, db };
