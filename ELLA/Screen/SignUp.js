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

import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";

import { useScale } from "../utils/scaling";
import EllAlert, { useEllAlert } from "../components/Alerts";
import api from "../utils/api";

export default function SignUp() {
  const navigation = useNavigation();
  const { scale, verticalScale } = useScale();
  const { alertConfig, showAlert, closeAlert } = useEllAlert();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  //backend
  const handleEmailSignUp = async () => {
    if (!email || !password) {
      showAlert({
        type: "warning",
        title: "Error",
        message: "Please enter email and password",
      });
      return;
    }
    if (password.length < 6) {
      showAlert({
        type: "warning",
        title: "Error",
        message: "Password must be at least 6 characters",
      });
      return;
    }
    try {
      setLoading(true);
      
      // Use backend API instead of direct Firebase
      await api.auth.register(email.trim(), password, null, null);

      showAlert({
        type: "success",
        title: "Success",
        message: "Account created successfully!",
      });
      navigation.replace("RoleSelect");
    } catch (error) {
      const errorMessage = error.message || "";
      if (errorMessage.includes("EMAIL_EXISTS")) {
        showAlert({
          type: "error",
          title: "Error",
          message: "Email is already in use",
        });
      } else if (errorMessage.includes("INVALID_EMAIL")) {
        showAlert({
          type: "error",
          title: "Error",
          message: "Invalid email address",
        });
      } else if (errorMessage.includes("WEAK_PASSWORD")) {
        showAlert({
          type: "error",
          title: "Error",
          message: "Password is too weak",
        });
      } else {
        showAlert({ 
          type: "error", 
          title: "Error", 
          message: error.message || "Registration failed. Please try again." 
        });
      }
    } finally {
      setLoading(false);
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
      else navigation.replace("HomeScreen");
    } catch (error) {
      console.log("Google Sign-up error:", error);
      // ... (error handling)
      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            break;
          case statusCodes.IN_PROGRESS:
            showAlert({
              type: "info",
              title: "In Progress",
              message: "Already signing in, please wait.",
            });
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            showAlert({
              type: "error",
              title: "Unavailable",
              message: "Google Play Services not available.",
            });
            break;
          default:
            showAlert({
              type: "error",
              title: "Sign-up Error",
              message: error.message,
            });
        }
      } else {
        showAlert({
          type: "error",
          title: "Sign-up Error",
          message: error.message ?? "Something went wrong",
        });
      }
    } finally {
      setIsSubmitting(false);
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
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Ionicons
            name={showPassword ? "eye-off" : "eye"}
            size={24}
            color="#555"
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[s.buttonEmail, loading && { opacity: 0.7 }]}
        onPress={handleEmailSignUp}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="mail" size={24} color="#fff" style={s.icon} />
            <Text style={s.buttonText}>Sign Up</Text>
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
        <Text style={[s.buttonText, s.googleText]}>Sign Up with Google</Text>
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
