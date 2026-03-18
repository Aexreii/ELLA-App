import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyB_Yhi-_EOJXm1SAEIGLCu_PD1GVz3p49E",
  authDomain: "ella-firebase-b354f.firebaseapp.com",
  projectId: "ella-firebase-b354f",
  storageBucket: "ella-firebase-b354f.firebasestorage.app",
  messagingSenderId: "519631852985",
  appId: "1:519631852985:web:51d6f2de6aa5c182499268",
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
