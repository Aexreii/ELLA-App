import { StatusBar } from "expo-status-bar";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import useAppFonts from "../hook/useAppFonts";
import { useScale } from "../utils/scaling";

import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";

import EllAlert, { useEllAlert } from "../components/Alerts";
import api from "../utils/api";

export default function StartUp({ navigation }) {
  const { scale, verticalScale } = useScale();
  const { alertConfig, showAlert, closeAlert } = useEllAlert();

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showName, setShowName] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const fontsLoaded = useAppFonts();
  if (!fontsLoaded) return null;

  //lipat sa backend
  const handleForgotPass = async () => {
    // Password reset usually requires a backend email service
    // For now, we point them to the general process
    if (!email) {
      showAlert({
        type: "warning",
        title: "Enter your email",
        message:
          "Type your email address above first, then tap Forgot Password.",
      });
      return;
    }
    
    showAlert({
      type: "info",
      title: "Password Reset",
      message: "Please contact support or use the web portal to reset your password.",
    });
  };
  //lipat sa backend
  const handleEmailSignIn = async () => {
    if (!showEmailForm) {
      setShowName(false);
      setShowEmailForm(true);
      return;
    }
    if (!email.trim() || !password) {
      showAlert({
        type: "warning",
        title: "Missing details",
        message: "Please enter both your email and password to continue.",
      });
      return;
    }
    try {
      setEmailLoading(true);
      setIsSubmitting(true);
      
      // Use backend API instead of direct Firebase
      const response = await api.auth.login(email.trim(), password);
      const userData = response.user;

      if (!userData.role) navigation.replace("RoleSelect");
      else if (!userData.name || !userData.age) navigation.replace("NameEntry");
      else if (!userData.character) navigation.replace("AvatarSelect");
      else navigation.replace("HomeScreen");
    } catch (error) {
      const errorMessage = error.message || "";
      if (errorMessage.includes("EMAIL_NOT_FOUND")) {
        showAlert({
          type: "error",
          title: "Account not found",
          message: "We couldn't find an account with that email. Did you sign up yet?",
        });
      } else if (errorMessage.includes("INVALID_PASSWORD") || errorMessage.includes("INVALID_LOGIN_CREDENTIALS")) {
        showAlert({
          type: "error",
          title: "Wrong password",
          message: "That password doesn't match. Try again or use Forgot Password.",
        });
      } else if (errorMessage.includes("INVALID_EMAIL")) {
        showAlert({
          type: "error",
          title: "Invalid email",
          message: "That doesn't look like a valid email address.",
        });
      } else if (errorMessage.includes("TOO_MANY_ATTEMPTS_TRY_LATER")) {
        showAlert({
          type: "warning",
          title: "Too many attempts",
          message: "Your account is temporarily locked. Reset your password or try again later.",
        });
      } else {
        showAlert({
          type: "error",
          title: "Sign in failed",
          message: error.message || "Something went wrong. Please try again.",
        });
      }
    } finally {
      setEmailLoading(false);
      setIsSubmitting(false);
    }
  };
  //lipat sa backend
  const handleGoogleSignIn = async () => {
    try {
      setIsSubmitting(true);
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      await GoogleSignin.signOut().catch(() => {});
      await GoogleSignin.signIn();
      const { idToken } = await GoogleSignin.getTokens();
      if (!idToken) throw new Error("No ID token returned from Google");

      // Use backend API instead of direct Firestore
      const response = await api.auth.verifyToken(idToken);
      const userData = response.user;

      if (!userData.role) navigation.replace("RoleSelect");
      else if (!userData.name || !userData.age) navigation.replace("NameEntry");
      else if (!userData.character) navigation.replace("AvatarSelect");
      else navigation.replace("HomeScreen");
    } catch (error) {
      console.log("Google Sign-in error:", error);
      // ... (error handling)
      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            break;
          case statusCodes.IN_PROGRESS:
            showAlert({
              type: "info",
              title: "Already signing in",
              message: "Please wait while we finish signing you in.",
            });
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            showAlert({
              type: "error",
              title: "Google unavailable",
              message: "Google Play Services isn't available on this device.",
            });
            break;
          default:
            showAlert({
              type: "error",
              title: "Sign in failed",
              message: "Something went wrong. Please try again.",
            });
        }
      } else {
        showAlert({
          type: "error",
          title: "Sign in failed",
          message: "Something went wrong. Please try again.",
        });
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

      {/* ── EllAlert — always last so it renders on top ── */}
      <EllAlert config={alertConfig} onClose={closeAlert} />
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
