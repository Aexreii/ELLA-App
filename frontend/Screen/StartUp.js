import { StatusBar } from "expo-status-bar";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useState } from "react";
import { useFonts } from "expo-font";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useNavigation } from "@react-navigation/native";
import { Alert } from "react-native";

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

  let authOK = 0; //this variable shoudld be changed by the backend for auth.

  const isAuthOK = () => {
    //this will be handled in the backend and will change the value of authOK to 1
    // this will check if the user exist, if google and not exist proceed to signup, if exist proceed to home screen. 
    //if email and not extst error of account does not exist. then proceed to sign up

  }
  
  const handleForgetPass = () => {
    // TODO: Add forgot password functionality
  };

  const handleEmailSignIn = () => {
    if (!showEmailForm) {
      setShowEmailForm(true);
      return;
    }
    console.log("Email:", email);
    console.log("Password:", password);

    authOK = 1; //to be handled on the backend.
    if (authOK == 1) {
      //also pass on the data of the user and stuff. or it can be handled directly on the main screen.
      navigation.navigate("HomeScreen");
    } else {
      console.log("wrong password");
      Alert.alert(
        "Login Failed", // title
        "Your Email sign-in was unsuccessful. Please try again.", // message
        [{ text: "OK", onPress: () => console.log("OK Pressed") }], // buttons
        { cancelable: true } // allows closing by tapping outside
      );
    }
  };

  const handleGoogleSignIn = () => {
    console.log("Google Sign");

    authOK = 1; //to be handled on the backend.

    if (authOK == 1) {
      //also pass on the data of the user and stuff. or it can be handled directly on the main screen.
      navigation.navigate("HomeScreen");
    } else {
      console.log("wrong password");
      Alert.alert(
        "Login Failed", // title
        "Your Google sign-in was unsuccessful. Please try again.", // message
        [{ text: "OK", onPress: () => console.log("OK Pressed") }], // buttons
        { cancelable: true } // allows closing by tapping outside
      );
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
          <TouchableOpacity onPress={handleForgetPass}>
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
