import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function SignUp() {
  const navigation = useNavigation();
  const [name, setName] = useState("");

  const handleNameEntry = () => {
    if (!name.trim()) {
      Alert.alert("Error!", "Please enter your name!");
      return; // Stop the function from continuing
    }
    console.log("Name entered:", name);
    //backend part of saving a user's name.
    navigation.navigate("RoleSelect", { userName: name });
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

      <Text style={styles.title}>What's your {"\n"} Name?</Text>

      <TextInput
        style={styles.input}
        placeholder="Name"
        placeholderTextColor="black"
        value={name}
        onChangeText={setName}
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
    top: 50,
    left: 20,
  },
  title: {
    fontFamily: "Mochi",
    fontSize: 36,
    textAlign: "center",
    margin: 50,
    color: "#fff",
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
    marginTop: 60,
  },
});
