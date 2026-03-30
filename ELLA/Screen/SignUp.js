import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { auth } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { useScale } from "../utils/scaling";
import {
  GoogleSignin,
  isSuccessResponse,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";

export default function SignUp() {
  const navigation = useNavigation();
  const { scale, verticalScale } = useScale();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmailSignUp = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }
    try {
      setLoading(true);
      const response = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      const user = response.user;
      console.log("User created:", user.uid);
      const db = getFirestore();
      await setDoc(doc(db, "users", user.uid), {
        name: null,
        age: null,
        role: null,
        points: 0,
        character: "pink",
        email: user.email,
        progress: [],
        ownedStickers: [],
        createdAt: new Date(),
        id: user.uid,
        provider: "email",
      });
      console.log("Firestore document created for:", user.uid);
      Alert.alert("Success", "Account created successfully!");
      navigation.navigate("RoleSelect");
    } catch (error) {
      console.log(error);
      if (error.code === "auth/email-already-in-use")
        Alert.alert("Error", "Email is already in use");
      else if (error.code === "auth/invalid-email")
        Alert.alert("Error", "Invalid email address");
      else if (error.code === "auth/weak-password")
        Alert.alert("Error", "Password is too weak");
      else Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsSubmitting(true);
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (isSuccessResponse(response)) {
        navigation.navigate("HomeScreen");
      } else {
        Alert.alert(
          "Login Failed",
          "Your Google sign-in was unsuccessful. Please try again.",
          [{ text: "OK" }],
          { cancelable: true },
        );
      }
      setIsSubmitting(false);
    } catch (error) {
      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.IN_PROGRESS:
            Alert.alert("Your Google sign-in is in progress");
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            Alert.alert("Play services not available");
            break;
          default:
            Alert.alert(error.code);
        }
      } else {
        Alert.alert("You fucked up!");
      }
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
        style={s.buttonGoogle}
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
