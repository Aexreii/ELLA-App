import { auth } from "../firebase";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import {
  signInWithEmailAndPassword,
  signInWithCredential,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";

export async function createUserDocument(user, provider = "email") {
  const db = getFirestore();
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      name: null,
      age: null,
      role: null,
      points: 0,
      character: null,
      email: user.email,
      progress: [],
      ownedStickers: [],
      classEnrolled: null,
      createdAt: new Date(),
      provider,
      id: user.uid,
    });
  }

  const latest = await getDoc(userRef);
  return latest.data();
}

export function navigateAfterAuth(userData, navigation) {
  if (!userData?.role) return navigation.replace("RoleSelect");
  if (!userData?.name || !userData?.age) return navigation.replace("NameEntry");
  if (!userData?.character) return navigation.replace("AvatarSelect");
  navigation.replace("HomeScreen");
}

export async function signInWithGoogle() {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  await GoogleSignin.signOut().catch(() => {});
  await GoogleSignin.signIn();

  const { idToken } = await GoogleSignin.getTokens();
  if (!idToken) throw new Error("No ID token returned from Google");

  const credential = GoogleAuthProvider.credential(idToken);
  const { user } = await signInWithCredential(auth, credential);

  return createUserDocument(user, "google");
}

// Used by StartUp (existing users signing in)
export async function signInWithEmail(email, password) {
  const { user } = await signInWithEmailAndPassword(
    auth,
    email.trim(),
    password,
  );
  return createUserDocument(user, "email");
}

// Used by SignUp (new users registering)
export async function signUpWithEmail(email, password) {
  const { user } = await createUserWithEmailAndPassword(
    auth,
    email.trim(),
    password,
  );
  return createUserDocument(user, "email");
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email.trim());
}
