import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useNavigation } from "@react-navigation/native";

// FIX: Was importing `auth` from "firebase/auth" (wrong — that's not an export of the SDK)
// FIX: Removed stray `const auth = getAuth()` inside handleNameEntry
// FIX: Now importing the initialized auth instance from firebase.js
import { auth } from "../firebase";
import { getFirestore, doc, updateDoc, getDoc } from "firebase/firestore";
import Slider from "@react-native-community/slider";

export default function NameEntry() {
  const navigation = useNavigation();
  const [name, setName] = useState("");
  const [age, setAge] = useState(30);
  const { width } = Dimensions.get("window");
  const [low, setLow] = useState(15);
  const [high, setHigh] = useState(70);

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;

      if (!user) return;

      const db = getFirestore();
      const userRef = doc(db, "users", user.uid);

      const docSnap = await getDoc(userRef);
      const userData = docSnap.data();

      if (userData?.role === "Student") {
        setLow(3);
        setHigh(12);
        setAge(5);
      } else {
        setLow(15);
        setHigh(70);
      }
    };

    fetchUserData();
  }, []);

  const handleNameEntry = async () => {
    if (!name.trim()) {
      Alert.alert("Error!", "Please enter your name!");
      return;
    }

    try {
      // FIX: Removed `const auth = getAuth()` here — using the imported auth directly
      const user = auth.currentUser;

      if (!user) {
        Alert.alert("Error", "User not logged in");
        return;
      }

      const db = getFirestore();
      const userRef = doc(db, "users", user.uid);

      await updateDoc(userRef, {
        name: name.trim(),
        age: age,
      });

      console.log("Name saved:", name);

      navigation.navigate("HomeScreen");
    } catch (error) {
      console.log(error);
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.reset({
              index: 0,
              routes: [{ name: "StartUp" }],
            });
          }
        }}
      >
        <Ionicons name="arrow-back" size={32} color="#fff" />
      </TouchableOpacity>

      <Text style={styles.title}>What's your Name?</Text>

      <TextInput
        style={styles.input}
        placeholder="Name"
        placeholderTextColor="black"
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.subtitle}>How old are you?</Text>

      <Text style={styles.ageText}>{age}</Text>

      <Slider
        style={{ width: width * 0.8, height: 40 }}
        minimumValue={low}
        maximumValue={high}
        step={1}
        value={age}
        onValueChange={(value) => setAge(value)}
        minimumTrackTintColor="#fff"
        thumbTintColor="#FF9149"
        trackStyle={{
          height: 100,
          borderRadius: 100,
          backgroundColor: "#000000",
        }}
      />

      <TouchableOpacity style={styles.button} onPress={handleNameEntry}>
        <Text style={styles.buttonText}>Enter</Text>
      </TouchableOpacity>
      <Image
        source={require("../assets/animations/jump_dino.gif")}
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
    justifyContent: "center",
  },
  closeButton: {
    position: "absolute",
    top: 20,
    left: 20,
  },
  title: {
    fontFamily: "Mochi",
    fontSize: 28,
    textAlign: "center",
    paddingTop: 100,
    marginBottom: 30,
    color: "#fff",
  },
  subtitle: {
    fontFamily: "Poppins",
    fontSize: 24,
    textAlign: "left",
    color: "#fff",
    paddingTop: 60,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 15,
    width: 300,
    height: 50,
    fontFamily: "Poppins",
    fontSize: 15,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#FF9149",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 15,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  buttonText: {
    fontFamily: "Poppins",
    fontSize: 18,
    color: "#fff",
    fontWeight: "bold",
  },
  ageText: {
    fontFamily: "Mochi",
    fontSize: 20,
    color: "#ffffff",
  },
  gif: {
    width: 150,
    height: 150,
    marginTop: 60,
  },
});
