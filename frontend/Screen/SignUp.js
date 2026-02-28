import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

export default function SignUp() {
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  //custom functions:
  const handleEmailSignIn = () => {
    // TODO: Add email sign-in gagawin ni Vik
    console.log("Email Sign");
    navigation.navigate("NameEntry");
  };

  const handleGoogleSignIn = () => {
    // TODO: Add Google sign-in
    
    console.log("Google Sign");
    navigation.navigate("NameEntry");
  };

  return (
    <View style={styles.container}>
      {/* Close button (X) */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={32} color="#fff" />
      </TouchableOpacity>

      <Text style={styles.title}>Enter your details</Text>

      {/* Email input */}
      <View style={styles.inputBox}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={setEmail}
        />
      </View>

      {/* Password input */}
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

      {/* Email Sign Up button */}
      {/* Email Sign Up button */}
      <TouchableOpacity style={styles.buttonEmail} onPress={handleEmailSignIn}>
        <Ionicons name="mail" size={32} color="#fff" style={styles.icon} />
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>

      {/* Google Sign Up button */}
      <TouchableOpacity
        style={styles.buttonGoogle}
        onPress={handleGoogleSignIn}
      >
        <Image
          style={styles.iconGoogle}
          source={require("../assets/icons/google.png")}
        />
        <Text style={[styles.buttonText, styles.googleText]}>Sign Up</Text>
      </TouchableOpacity>

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
    marginLeft: -20,
    marginRight: 30,
  },
  iconGoogle: {
    marginLeft: -20,
    marginRight: 30,
    width: 32,
    height: 32,
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
