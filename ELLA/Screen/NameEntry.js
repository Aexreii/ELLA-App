import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, updateDoc } from "firebase/firestore";
import Slider from "@react-native-community/slider";

export default function SignUp() {
  const navigation = useNavigation();
  const [name, setName] = useState("");
  const [age, setAge] = useState(10);
  const { width } = Dimensions.get("window");

  const handleNameEntry = async () => {
    if (!name.trim()) {
      Alert.alert("Error!", "Please enter your name!");
      return;
    }

    try {
      const auth = getAuth();
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

      navigation.navigate("RoleSelect", { userName: name });
    } catch (error) {
      console.log(error);
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* Close button */}
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

      <Text style={styles.ageText}>{age} years old</Text>

      <Slider
        style={{ width: width * 0.8, height: 40 }} // responsive width, thinner height
        minimumValue={3}
        maximumValue={15}
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

// Styling
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
    fontSize: 24,
    //textAlign: "center",
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
    paddingHorizontal: 10,
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
    fontSize: 24,
    color: "#000000",
  },
  gif: {
    width: 150,
    height: 150,
    marginTop: 60,
  },
});
