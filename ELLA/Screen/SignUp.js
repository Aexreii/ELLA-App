import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import app from "../firebaseconfig";

import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import {
  GoogleSignin,
  isSuccessResponse,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";

const auth = getAuth(app);

export default function SignUp() {
  const navigation = useNavigation();

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
      console.log("User created:", response.user.uid);
      Alert.alert("Success", "Account created successfully!");

      // do the backend here, same with passing on the account id

      navigation.navigate("NameEntry");
    } catch (error) {
      console.log(error);
      if (error.code === "auth/email-already-in-use") {
        Alert.alert("Error", "Email is already in use");
      } else if (error.code === "auth/invalid-email") {
        Alert.alert("Error", "Invalid email address");
      } else if (error.code === "auth/weak-password") {
        Alert.alert("Error", "Password is too weak");
      } else {
        Alert.alert("Error", error.message);
      }
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
        const { idToken, user } = response.data;
        const { name, email, photo } = user;

        //this is the part where you do the backend part
        //pass the id token of the user to the backend to get their stuff.

        navigation.navigate("HomeScreen");
      } else {
        Alert.alert(
          "Login Failed", // title
          "Your Google sign-in was unsuccessful. Please try again.", // message
          [{ text: "OK", onPress: () => console.log("OK Pressed") }], // buttons
          { cancelable: true }, // allows closing by tapping outside
        );
      }

      setIsSubmitting(false);
    } catch (error) {
      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.IN_PROGRESS:
            Alert.alert(
              "Your Google sign-in is in progress",
              [{ text: "OK", onPress: () => console.log("OK Pressed") }],
              { cancelable: true },
            );
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            Alert.alert(
              "Play services not available",
              [{ text: "OK", onPress: () => console.log("OK Pressed") }],
              { cancelable: true },
            );
            break;
          default:
            Alert.alert(
              error.code,
              [{ text: "OK", onPress: () => console.log("OK Pressed") }],
              { cancelable: true },
            );
        }
      } else {
        Alert.alert("You fucked up!");
      }
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={32} color="#fff" />
      </TouchableOpacity>

      <Text style={styles.title}>Enter your details</Text>

      {/* Email */}
      <View style={styles.inputBox}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      {/* Password */}
      <View style={styles.inputBox}>
        <TextInput
          style={styles.input}
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

      {/* Email Sign Up Button */}
      <TouchableOpacity
        style={[styles.buttonEmail, loading && { opacity: 0.7 }]}
        onPress={handleEmailSignUp}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="mail" size={24} color="#fff" style={styles.icon} />
            <Text style={styles.buttonText}>Sign Up</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Google Sign Up Button */}
      <TouchableOpacity
        style={styles.buttonGoogle}
        onPress={handleGoogleSignIn}
        disabled={isSubmitting}
      >
        <Image
          style={styles.iconGoogle}
          source={require("../assets/icons/google.png")}
        />
        <Text style={[styles.buttonText, styles.googleText]}>
          Sign Up with Google
        </Text>
      </TouchableOpacity>

      {/* GIF */}
      <Image
        source={require("../assets/animations/jump_owl.gif")}
        style={styles.gif}
        contentFit="fill"
        transition={0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#60B5FF",
    alignItems: "center",
    justifyContent: "flex-start",
    padding: 20,
    paddingTop: 150,
  },
  closeButton: {
    position: "absolute",
    top: 50,
    left: 20,
  },
  gif: {
    width: 150,
    height: 150,
    marginTop: 60,
  },
  title: {
    fontFamily: "PixelifySans",
    fontSize: 28,
    color: "#fff",
    marginBottom: 30,
    textAlign: "center",
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#ddd",
    width: "90%",
    height: 50,
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#000",
    fontFamily: "Poppins",
  },
  buttonEmail: {
    flexDirection: "row",
    backgroundColor: "#FF9149",
    width: 250,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 25,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#fff",
  },
  buttonGoogle: {
    flexDirection: "row",
    backgroundColor: "#fff",
    width: 250,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 25,
    marginTop: 15,
    borderWidth: 1,
    borderColor: "#FF9149",
  },
  icon: {
    marginRight: 10,
  },
  iconGoogle: {
    marginRight: 10,
    width: 24,
    height: 24,
  },
  buttonText: {
    fontFamily: "Poppins",
    fontSize: 18,
    color: "#fff",
  },
  googleText: {
    color: "#000",
  },
});
