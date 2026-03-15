// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyB_Yhi-_EOJXm1SAEIGLCu_PD1GVz3p49E",
  authDomain: "ella-firebase-b354f.firebaseapp.com",
  projectId: "ella-firebase-b354f",
  storageBucket: "ella-firebase-b354f.firebasestorage.app",
  messagingSenderId: "519631852985",
  appId: "1:519631852985:web:51d6f2de6aa5c182499268",
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);

const analytics = getAnalytics(app);

export default app;
