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
import { useScale } from "../utils/scaling";

import {
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import EllAlert, { useEllAlert } from "../components/Alerts";
import {
  signInWithGoogle,
  signInWithEmail,
  resetPassword,
  navigateAfterAuth,
} from "../services/authService";

export default function StartUp({ navigation }) {
  const { scale, verticalScale } = useScale();
  const { alertConfig, showAlert, closeAlert } = useEllAlert();

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showName, setShowName] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const isSubmitting = emailLoading || googleLoading;

  const handleForgotPass = async () => {
    if (!email) {
      showAlert({
        type: "warning",
        title: "Enter your email",
        message:
          "Type your email address above first, then tap Forgot Password.",
      });
      return;
    }
    try {
      setEmailLoading(true);
      await resetPassword(email);
      showAlert({
        type: "success",
        title: "Check your inbox!",
        message: "We've sent password reset instructions to your email.",
      });
    } catch (error) {
      const messages = {
        "auth/user-not-found": [
          "Account not found",
          "We couldn't find an account with that email address.",
        ],
        "auth/invalid-email": [
          "Invalid email",
          "That doesn't look like a valid email address.",
        ],
      };
      const [title, message] = messages[error.code] ?? [
        "Something went wrong",
        "Please try again.",
      ];
      showAlert({ type: "error", title, message });
    } finally {
      setEmailLoading(false);
    }
  };

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
      const userData = await signInWithEmail(email, password);
      navigateAfterAuth(userData, navigation);
    } catch (error) {
      const messages = {
        "auth/user-not-found": [
          "Account not found",
          "We couldn't find an account with that email. Did you sign up yet?",
        ],
        "auth/wrong-password": [
          "Wrong password",
          "That password doesn't match. Try again or use Forgot Password.",
        ],
        "auth/invalid-email": [
          "Invalid email",
          "That doesn't look like a valid email address.",
        ],
        "auth/too-many-requests": [
          "Too many attempts",
          "Your account is temporarily locked. Reset your password or try again later.",
        ],
        "auth/invalid-credential": [
          "Incorrect details",
          "Your email or password is incorrect. Please check and try again.",
        ],
      };
      const [title, message] = messages[error.code] ?? [
        "Sign in failed",
        error.message,
      ];
      const type =
        error.code === "auth/too-many-requests" ? "warning" : "error";
      showAlert({ type, title, message });
    } finally {
      setEmailLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      const userData = await signInWithGoogle();
      navigateAfterAuth(userData, navigation);
    } catch (error) {
      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            break;
          case statusCodes.IN_PROGRESS:
            showAlert({
              type: "info",
              title: "Already signing in",
              message: "Please wait.",
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
      setGoogleLoading(false);
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
        {googleLoading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <>
            <Image
              style={s.iconGoogle}
              source={require("../assets/icons/google.png")}
            />
            <Text style={[s.buttonText, s.google]}>Sign in with Google</Text>
          </>
        )}
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
