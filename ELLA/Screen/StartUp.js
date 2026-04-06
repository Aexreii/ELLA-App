import { StatusBar } from "expo-status-bar";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import useAppFonts from "../hook/useAppFonts";
import { useScale } from "../utils/scaling";
import { auth } from "../firebase";
import {
  signInWithEmailAndPassword,
  signInWithCredential,
  GoogleAuthProvider,
  sendPasswordResetEmail,
} from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";

export default function StartUp({ navigation }) {
  const { scale, verticalScale } = useScale();

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showName, setShowName] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const fontsLoaded = useAppFonts();
  if (!fontsLoaded) return null;

  // ── Forgot password ────────────────────────────────────────
  const handleForgotPass = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address first.");
      return;
    }
    try {
      setIsSubmitting(true);
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert(
        "Password Reset Sent",
        "Check your inbox for reset instructions.",
      );
    } catch (error) {
      if (error.code === "auth/user-not-found")
        Alert.alert("Error", "No account found with this email.");
      else if (error.code === "auth/invalid-email")
        Alert.alert("Error", "Invalid email address.");
      else Alert.alert("Error", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Email sign-in ──────────────────────────────────────────
  const handleEmailSignIn = async () => {
    if (!showEmailForm) {
      setShowName(false);
      setShowEmailForm(true);
      return;
    }
    if (!email.trim() || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }
    try {
      setEmailLoading(true);
      setIsSubmitting(true);
      const { user } = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
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
          createdAt: new Date(),
          provider: "email",
          id: user.uid,
        });
      }
      const userData = (await getDoc(userRef)).data();
      if (!userData.role) navigation.replace("RoleSelect");
      else if (!userData.name || !userData.age) navigation.replace("NameEntry");
      else if (!userData.character) navigation.replace("AvatarSelect");
      else navigation.replace("HomeScreen");
    } catch (error) {
      switch (error.code) {
        case "auth/user-not-found":
          Alert.alert("Error", "No account found with this email");
          break;
        case "auth/wrong-password":
          Alert.alert("Error", "Incorrect password");
          break;
        case "auth/invalid-email":
          Alert.alert("Error", "Invalid email address");
          break;
        default:
          Alert.alert("Error", error.message);
      }
    } finally {
      setEmailLoading(false);
      setIsSubmitting(false);
    }
  };

  // ── Google sign-in ─────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    try {
      setIsSubmitting(true);
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      // Sign out first to always show account picker
      await GoogleSignin.signOut().catch(() => {});

      await GoogleSignin.signIn();
      const { idToken } = await GoogleSignin.getTokens();

      if (!idToken) throw new Error("No ID token returned from Google");

      const credential = GoogleAuthProvider.credential(idToken);
      const { user } = await signInWithCredential(auth, credential);

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
          classEnrolled: null,
          createdAt: new Date(),
          provider: "google",
        });
      }
      const userData = (await getDoc(userRef)).data();
      if (!userData.role) navigation.replace("RoleSelect");
      else if (!userData.name || !userData.age) navigation.replace("NameEntry");
      else if (!userData.character) navigation.replace("AvatarSelect");
      else navigation.replace("HomeScreen");
    } catch (error) {
      console.log("Google Sign-in error:", error);
      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            break; // user dismissed — no alert needed
          case statusCodes.IN_PROGRESS:
            Alert.alert("Already signing in, please wait.");
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            Alert.alert("Google Play Services not available.");
            break;
          default:
            Alert.alert("Sign-in Error", error.message);
        }
      } else {
        Alert.alert("Sign-in Error", error.message ?? "Something went wrong");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const s = getStyles(scale, verticalScale);

  return (
    <View style={s.container}>
      <Text style={s.title}>ELLA</Text>
      <Text style={s.subTitle}>Your English Buddy</Text>
      <Image
        source={require("../assets/animations/jump_pink.gif")}
        style={s.gif}
        contentFit="fill"
        transition={0}
      />
      {showName && <Text style={s.welcome}>Welcome!</Text>}

      {showEmailForm && (
        <View style={s.formContainer}>
          <TextInput
            style={s.input}
            placeholder="Email"
            placeholderTextColor="#000"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <View style={s.inputBox}>
            <TextInput
              style={s.inputPass}
              placeholder="Password"
              placeholderTextColor="#000"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? "eye-off" : "eye"}
                size={24}
                color="#555"
              />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={handleForgotPass}>
            <Text style={s.forgetPass}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={[s.buttonEmail, emailLoading && { opacity: 0.8 }]}
        onPress={handleEmailSignIn}
        disabled={isSubmitting}
      >
        {emailLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="mail" style={s.iconEmail} />
            <Text style={s.buttonText}>Sign in with Email</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[s.buttonGoogle, isSubmitting && { opacity: 0.7 }]}
        onPress={handleGoogleSignIn}
        disabled={isSubmitting}
      >
        <Image
          style={s.iconGoogle}
          source={require("../assets/icons/google.png")}
        />
        <Text style={[s.buttonText, s.google]}>Sign in with Google</Text>
      </TouchableOpacity>

      <View style={s.signUp}>
        <Text style={s.signUpText}>No Account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
          <Text style={[s.signUpText, s.signUpTextUnderline]}>Sign Up!</Text>
        </TouchableOpacity>
      </View>

      <StatusBar style="auto" />
    </View>
  );
}

const getStyles = (scale, verticalScale) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#60B5FF",
      alignItems: "center",
      justifyContent: "center",
    },
    title: { fontFamily: "PixelifySans", fontSize: scale(96), color: "#fff" },
    subTitle: {
      fontFamily: "PixelifySans",
      fontSize: scale(24),
      color: "#fff",
      paddingBottom: verticalScale(30),
    },
    gif: {
      width: scale(190),
      height: scale(190),
      margin: scale(30),
      marginTop: verticalScale(-5),
    },
    welcome: { fontFamily: "PixelifySans", fontSize: scale(64), color: "#fff" },
    formContainer: {
      width: scale(300),
      marginBottom: verticalScale(10),
      marginTop: verticalScale(-20),
    },
    inputBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#fff",
      borderRadius: scale(10),
      marginBottom: verticalScale(5),
      paddingHorizontal: scale(10),
    },
    input: {
      backgroundColor: "#fff",
      borderRadius: scale(10),
      paddingHorizontal: scale(15),
      marginBottom: scale(15),
      fontFamily: "Poppins",
      fontSize: scale(16),
    },
    inputPass: {
      flex: 1,
      fontSize: scale(16),
      color: "#000",
      fontFamily: "Poppins",
    },
    forgetPass: {
      fontFamily: "Poppins",
      fontSize: scale(14),
      color: "#fff",
      textDecorationLine: "underline",
      textAlign: "right",
      marginBottom: verticalScale(-30),
    },
    buttonEmail: {
      flexDirection: "row",
      backgroundColor: "#FF9149",
      width: scale(250),
      height: verticalScale(50),
      alignItems: "center",
      justifyContent: "center",
      borderRadius: scale(20),
      marginTop: verticalScale(20),
      borderWidth: 1,
      borderColor: "#fff",
    },
    iconEmail: { marginRight: scale(20), fontSize: scale(32), color: "#FFF" },
    buttonGoogle: {
      flexDirection: "row",
      backgroundColor: "#FFF",
      width: scale(250),
      height: verticalScale(50),
      alignItems: "center",
      justifyContent: "center",
      borderRadius: scale(20),
      marginTop: scale(20),
      borderWidth: 1,
      borderColor: "#FF9149",
    },
    iconGoogle: {
      marginRight: scale(10),
      width: scale(32),
      height: verticalScale(32),
    },
    buttonText: {
      fontFamily: "Poppins",
      fontSize: scale(14),
      textAlign: "center",
      color: "#fff",
    },
    google: { color: "#000" },
    signUp: { flexDirection: "row" },
    signUpText: {
      fontFamily: "Poppins",
      fontSize: scale(16),
      color: "#FFF",
      marginTop: verticalScale(20),
    },
    signUpTextUnderline: { textDecorationLine: "underline" },
  });
