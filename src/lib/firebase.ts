import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyDRc0GoJUko33FRx0d3_XYDiKfjgl_1iro",
  authDomain: "attocus-1.firebaseapp.com",
  projectId: "attocus-1",
  storageBucket: "attocus-1.firebasestorage.app",
  messagingSenderId: "915961551790",
  appId: "1:915961551790:web:cac5a0977007401eecc63f"
};

// Initialize Firebase safely (avoid re-initialization during HMR)
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});
