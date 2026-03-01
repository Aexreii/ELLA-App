// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBVGKJq2uOd2q-CR9ehxFQgUUrwyrkalks",
  authDomain: "ella-e7cd5.firebaseapp.com",
  projectId: "ella-e7cd5",
  storageBucket: "ella-e7cd5.firebasestorage.app",
  messagingSenderId: "885030597679",
  appId: "1:885030597679:web:e140a65b3e0b50ee4c82da",
  measurementId: "G-N7ZS6WVTWC",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const analytics = getAnalytics(app);

export default app;
