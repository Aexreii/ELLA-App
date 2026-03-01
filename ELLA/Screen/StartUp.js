import { StatusBar } from "expo-status-bar";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useEffect, useState } from "react";
import { useFonts } from "expo-font";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useNavigation } from "@react-navigation/native";
import { Alert } from "react-native";
import app from "../firebaseconfig";
import {
  getAuth,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";

import {
  GoogleSignin,
  isSuccessResponse,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";

export default function StartUp({ navigation }) {
  const [fontsLoaded] = useFonts({
    PixelifySans: require("../assets/fonts/PixelifySans-Regular.ttf"),
    PixelifySansBold: require("../assets/fonts/PixelifySans-Bold.ttf"),
    Poppins: require("../assets/fonts/Poppins-Regular.ttf"),
    PoppinsBold: require("../assets/fonts/Poppins-Bold.ttf"),
    Mochi: require("../assets/fonts/MochiyPopOne.ttf"),
  });

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleForgotPass = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address first.");
      return;
    }

    try {
      setLoading(true);

      await sendPasswordResetEmail(auth, email.trim());

      Alert.alert(
        "Password Reset Email Sent",
        "Please check your inbox and follow the instructions to reset your password.",
      );
    } catch (error) {
      console.log(error);

      if (error.code === "auth/user-not-found") {
        Alert.alert("Error", "No account found with this email.");
      } else if (error.code === "auth/invalid-email") {
        Alert.alert("Error", "Invalid email address.");
      } else {
        Alert.alert("Error", error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    try {
      setLoading(true);

      const response = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );

      console.log("User signed in:", response.user.uid);

      Alert.alert("Success", "Signed in successfully!");

      // Navigate after successful login
      //backend stuff

      navigation.navigate("HomeScreen");
    } catch (error) {
      console.log(error);

      if (error.code === "auth/user-not-found") {
        Alert.alert("Error", "No account found with this email");
      } else if (error.code === "auth/wrong-password") {
        Alert.alert("Error", "Incorrect password");
      } else if (error.code === "auth/invalid-email") {
        Alert.alert("Error", "Invalid email address");
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

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ELLA</Text>
      <Text style={styles.subTitle}>Your English Buddy</Text>
      <Image
        source={require("../assets/animations/jump_pink.gif")}
        style={styles.gif}
        contentFit="fill"
        transition={0}
      />
      <Text style={styles.welcome}>Welcome!</Text>

      {showEmailForm ? (
        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#aaa"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#aaa"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={handleForgotPass}>
            <Text style={styles.forgetPass}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <TouchableOpacity style={styles.buttonEmail} onPress={handleEmailSignIn}>
        <Ionicons name="mail" style={styles.iconEmail} />
        <Text style={styles.buttonText}>Sign in with Email</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.buttonGoogle}
        onPress={handleGoogleSignIn}
        disabled={isSubmitting}
      >
        <Image
          style={styles.iconGoogle}
          source={require("../assets/icons/google.png")}
        />
        <Text style={[styles.buttonText, styles.google]}>
          Sign in with Google
        </Text>
      </TouchableOpacity>

      <View style={styles.signUp}>
        <Text style={styles.signUpText}>No Account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
          <Text style={[styles.signUpText, styles.signUpTextUnderline]}>
            Sign Up!
          </Text>
        </TouchableOpacity>
      </View>

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#60B5FF",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "PixelifySans",
    fontSize: 96,
    color: "#fff",
  },
  subTitle: {
    fontFamily: "PixelifySans",
    fontSize: 24,
    color: "#fff",
  },
  gif: {
    width: 190,
    height: 190,
    margin: 30,
  },
  welcome: {
    fontFamily: "PixelifySans",
    fontSize: 64,
    color: "#fff",
  },
  formContainer: {
    width: 250,
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 10,
    fontFamily: "Poppins",
    fontSize: 14,
  },
  forgetPass: {
    fontFamily: "Poppins",
    fontSize: 14,
    color: "#fff",
    textDecorationLine: "underline",
    textAlign: "right",
  },
  buttonEmail: {
    flexDirection: "row",
    backgroundColor: "#FF9149",
    width: 250,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#fff",
  },
  iconEmail: {
    marginRight: 10,
    fontSize: 32,
    color: "#FFF",
  },
  buttonGoogle: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    width: 250,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#FF9149",
  },
  iconGoogle: {
    marginRight: 10,
    width: 32,
    height: 32,
  },
  buttonText: {
    fontFamily: "Poppins",
    fontSize: 14,
    textAlign: "center",
    color: "#fff",
  },
  google: {
    color: "#000",
  },
  signUp: {
    flexDirection: "row",
  },
  signUpText: {
    fontFamily: "Poppins",
    fontSize: 16,
    color: "#FFF",
    marginTop: 20,
  },
  signUpTextUnderline: {
    textDecorationLine: "underline",
  },
});
