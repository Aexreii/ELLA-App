import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { Alert } from "react-native";
import { Image } from "expo-image";
import { useNavigation, useRoute } from "@react-navigation/native";

export default function AvatarName() {
  const navigation = useNavigation();
  const [name, setName] = useState("");
  const route = useRoute();
  const { userName, avatar } = route.params || {};

  const avatars = {
    Pink: require("../assets/animations/run_pink.gif"),
    Dino: require("../assets/animations/run_dino.gif"),
    Owl: require("../assets/animations/run_owl.gif"),
  };

  const avatarGIF = avatars[avatar];

  console.log("avatar param:", avatar);
  console.log("avatarGIF:", avatars[avatar]);

  const handleAvatarName = () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter a name for your buddy!");
      return; // Stop the function from continuing
    }
    console.log("Name entered:", name);
    //backend part of saving avatar's name.

    //will navigate to sign up. to log in with the new user's credentials
    navigation.navigate("StartUp");
  };

  return (
    <View style={styles.container}>
      {/* Close button */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={32} color="#fff" />
      </TouchableOpacity>

      <Text style={styles.greeting}>Hello!</Text>
      <Text style={styles.greeting2}>{userName}</Text>
      <Text style={styles.subtitle}>Please name your</Text>
      <Text style={styles.subtitles}>English Buddy!</Text>
      <Image
        source={avatarGIF}
        style={styles.gif}
        contentFit="fill"
        transition={0}
      />
      <TextInput
        style={styles.input}
        placeholder="Name"
        placeholderTextColor="black"
        value={name}
        onChangeText={setName}
      />

      <TouchableOpacity style={styles.button} onPress={handleAvatarName}>
        <Text style={styles.buttonText}>Enter</Text>
      </TouchableOpacity>
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
    top: 50,
    left: 20,
  },
  greeting: {
    fontSize: 36,
    fontFamily: "Mochi",
    color: "#fff",
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
    textAlign: "center",
  },
  greeting2: {
    fontSize: 20,
    fontFamily: "Mochi",
    color: "#fff",
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
    marginBottom: 20,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 20,
    fontFamily: "Mochi",
    color: "#fffefeff",
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
  },
  subtitles: {
    fontSize: 20,
    fontFamily: "Mochi",
    color: "#fffefeff",
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 15,
    width: 250,
    height: 50,
    fontFamily: "Poppins",
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
  gif: {
    width: 150,
    height: 150,
    marginTop: 10,
    marginBottom: 50,
  },
});
