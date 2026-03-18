import { StatusBar } from "expo-status-bar";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useNavigation } from "@react-navigation/native";
import useAppFonts from "../hook/useAppFonts";
import { scale, verticalScale } from "../utils/scaling";

// FIX: Removed `import app from "../firebaseconfig"` and local `const auth = getAuth(app)`
// FIX: Now using the shared auth instance from firebase.js
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
  isSuccessResponse,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";

export default function StartUp({ navigation }) {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showName, setshowName] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const fontsLoaded = useAppFonts();

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: "YOUR_FIREBASE_WEB_CLIENT_ID",
    });
  }, []);

  // FIX: Removed duplicate `if (!fontsLoaded) return null` that appeared twice
  if (!fontsLoaded) return null;

  const handleForgotPass = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address first.");
      return;
    }

    try {
      setIsSubmitting(true);
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
      setIsSubmitting(false);
    }
  };

  const handleEmailSignIn = async () => {
    if (!showEmailForm) {
      setshowName(false);
      setShowEmailForm(true);
      return;
    }

    if (!email.trim() || !password) {
      Alert.alert("Error", "Please enter email and password");
      // FIX: Removed stray `r;` that was here — caused a ReferenceError at runtime
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );

      const users = response.user;
      console.log("User signed in:", response.user.uid);

      const db = getFirestore();
      const userRef = doc(db, "users", users.uid);
      const docSnap = await getDoc(userRef);

      if (!docSnap.exists()) {
        console.log("New Account");
        await setDoc(userRef, {
          name: null,
          age: null,
          role: null,
          email: users.email,
          createdAt: new Date(),
          provider: "email",
        });
      }

      const updatedDoc = await getDoc(userRef);
      const userData = updatedDoc.data();
      console.log("User Data", userData);

      if (!userData.role || !userData.name) {
        navigation.replace("RoleSelect");
      } else {
        navigation.replace("HomeScreen");
      }
    } catch (error) {
      console.log(error);
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
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsSubmitting(true);

      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signIn();

      const { idToken } = await GoogleSignin.getTokens();

      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;

      const db = getFirestore();
      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);

      if (!docSnap.exists()) {
        console.log("new user");
        await setDoc(userRef, {
          name: null,
          age: null,
          role: null,
          points: 0,
          character: "dino",
          email: user.email,
          createdAt: new Date(),
          provider: "google",
        });
      }

      const updatedDoc = await getDoc(userRef);
      const userData = updatedDoc.data();

      if (!userData.name || !userData.age || !userData.role) {
        navigation.replace("RoleSelect");
      } else {
        navigation.replace("HomeScreen");
      }
    } catch (error) {
      console.log("Google Sign-in Error:", error);

      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.IN_PROGRESS:
            Alert.alert("Google sign-in already in progress.");
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            Alert.alert("Google Play Services not available.");
            break;
          default:
            Alert.alert("Login Error", error.message);
        }
      } else {
        Alert.alert("Unexpected Error", error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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
      {showName ? <Text style={styles.welcome}>Welcome!</Text> : null}

      {showEmailForm ? (
        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#000000"
            value={email}
            onChangeText={setEmail}
          />
          <View style={styles.inputBox}>
            <TextInput
              style={styles.inputPass}
              placeholder="Password"
              placeholderTextColor="#000000"
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
            <Text style={styles.forgetPass}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <TouchableOpacity
        style={styles.buttonEmail}
        onPress={handleEmailSignIn}
        disabled={isSubmitting}
      >
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
    fontSize: scale(96),
    color: "#fff",
  },
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
  welcome: {
    fontFamily: "PixelifySans",
    fontSize: scale(64),
    color: "#fff",
  },
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
    borderRadius: 20,
    marginTop: verticalScale(20),
    borderWidth: 1,
    borderColor: "#fff",
  },
  iconEmail: {
    marginRight: scale(10),
    fontSize: scale(32),
    color: "#FFF",
  },
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
  google: {
    color: "#000",
  },
  signUp: {
    flexDirection: "row",
  },
  signUpText: {
    fontFamily: "Poppins",
    fontSize: scale(16),
    color: "#FFF",
    marginTop: verticalScale(20),
  },
  signUpTextUnderline: {
    textDecorationLine: "underline",
  },
});
