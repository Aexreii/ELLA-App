import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};
// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// FIX: Use initializeAuth with AsyncStorage so auth state persists between sessions
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

// Initialize Firestore
const db = getFirestore(app);

// FIX: Wrap Analytics in isSupported() — it requires cookies + IndexedDB
// which are unavailable in React Native
isSupported().then((supported) => {
  if (supported) {
    getAnalytics(app);
  }
});

export { app, auth, db };
export default app;
export const storage = getStorage(app);
