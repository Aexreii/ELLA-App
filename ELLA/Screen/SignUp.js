import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useScale } from "../utils/scaling";
import {
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import EllAlert, { useEllAlert } from "../components/Alerts";
import {
  signInWithGoogle,
  signUpWithEmail,
  navigateAfterAuth,
} from "../services/authService";

export default function SignUp() {
  const navigation = useNavigation();
  const { scale, verticalScale } = useScale();
  const { alertConfig, showAlert, closeAlert } = useEllAlert();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const isSubmitting = emailLoading || googleLoading;

  const handleEmailSignUp = async () => {
    if (!email.trim() || !password) {
      showAlert({
        type: "warning",
        title: "Missing details",
        message: "Please enter email and password.",
      });
      return;
    }
    if (password.length < 6) {
      showAlert({
        type: "warning",
        title: "Weak password",
        message: "Password must be at least 6 characters.",
      });
      return;
    }
    try {
      setEmailLoading(true);
      const userData = await signUpWithEmail(email, password);
      navigateAfterAuth(userData, navigation);
    } catch (error) {
      const messages = {
        "auth/email-already-in-use": [
          "Already registered",
          "An account with this email already exists. Try signing in.",
        ],
        "auth/invalid-email": [
          "Invalid email",
          "That doesn't look like a valid email address.",
        ],
        "auth/weak-password": [
          "Weak password",
          "Please choose a stronger password.",
        ],
      };
      const [title, message] = messages[error.code] ?? [
        "Sign up failed",
        error.message,
      ];
      showAlert({ type: "error", title, message });
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
              title: "Sign up failed",
              message: "Something went wrong. Please try again.",
            });
        }
      } else {
        showAlert({
          type: "error",
          title: "Sign up failed",
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
      <TouchableOpacity
        style={s.closeButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={32} color="#fff" />
      </TouchableOpacity>

      <Text style={s.title}>Enter your details</Text>

      <View style={s.inputBox}>
        <TextInput
          style={s.input}
          placeholder="Email"
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!isSubmitting}
        />
      </View>

      <View style={s.inputBox}>
        <TextInput
          style={s.input}
          placeholder="Password"
          placeholderTextColor="#aaa"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          editable={!isSubmitting}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Ionicons
            name={showPassword ? "eye-off" : "eye"}
            size={24}
            color="#555"
          />
        </TouchableOpacity>
      </View>

      {/* Email sign-up button */}
      <TouchableOpacity
        style={[s.buttonEmail, isSubmitting && { opacity: 0.7 }]}
        onPress={handleEmailSignUp}
        disabled={isSubmitting}
      >
        {emailLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="mail" size={24} color="#fff" style={s.icon} />
            <Text style={s.buttonText}>Sign Up</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Google sign-up button */}
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
            <Text style={[s.buttonText, s.googleText]}>
              Sign Up with Google
            </Text>
          </>
        )}
      </TouchableOpacity>

      <Image
        source={require("../assets/animations/jump_owl.gif")}
        style={s.gif}
        contentFit="fill"
        transition={0}
      />

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
      justifyContent: "flex-start",
      padding: scale(20),
      paddingTop: verticalScale(150),
    },
    closeButton: {
      position: "absolute",
      top: verticalScale(50),
      left: scale(20),
    },
    gif: {
      width: scale(150),
      height: scale(150),
      marginTop: verticalScale(60),
    },
    title: {
      fontFamily: "PixelifySans",
      fontSize: scale(28),
      color: "#fff",
      marginBottom: verticalScale(30),
      textAlign: "center",
    },
    inputBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#fff",
      borderRadius: scale(15),
      borderWidth: 1,
      borderColor: "#ddd",
      width: "90%",
      height: verticalScale(50),
      marginBottom: verticalScale(15),
      paddingHorizontal: scale(10),
    },
    input: {
      flex: 1,
      fontSize: scale(16),
      color: "#000",
      fontFamily: "Poppins",
    },
    buttonEmail: {
      flexDirection: "row",
      backgroundColor: "#FF9149",
      width: scale(250),
      height: verticalScale(50),
      alignItems: "center",
      justifyContent: "center",
      borderRadius: scale(25),
      marginTop: verticalScale(20),
      borderWidth: 1,
      borderColor: "#fff",
    },
    buttonGoogle: {
      flexDirection: "row",
      backgroundColor: "#fff",
      width: scale(250),
      height: verticalScale(50),
      alignItems: "center",
      justifyContent: "center",
      borderRadius: scale(25),
      marginTop: verticalScale(15),
      borderWidth: 1,
      borderColor: "#FF9149",
    },
    icon: { marginRight: scale(10) },
    iconGoogle: { marginRight: scale(10), width: scale(24), height: scale(24) },
    buttonText: { fontFamily: "Poppins", fontSize: scale(18), color: "#fff" },
    googleText: { color: "#000" },
  });
