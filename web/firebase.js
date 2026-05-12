import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js';
import { getAuth, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js';
import { getFirestore, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js';
import { getFunctions } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-functions.js';

const firebaseConfig = window.SUOLLER_FIREBASE_CONFIG || {
  apiKey: 'AIzaSyCnchF4HKqKz71e10dNNzzbcAbyuBY-qnw',
  authDomain: 'suoller.firebaseapp.com',
  projectId: 'suoller',
  storageBucket: 'suoller.firebasestorage.app',
  messagingSenderId: '918997201100',
  appId: '1:918997201100:web:d2f16659665a1758945269'
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const fn = getFunctions(app, 'us-central1');
export const googleProvider = new GoogleAuthProvider();
export const now = serverTimestamp;
