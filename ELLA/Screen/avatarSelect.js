import { useNavigation, useRoute } from "@react-navigation/native";
import { Image } from "expo-image";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { auth } from "../firebase";
import { getFirestore, doc, updateDoc } from "firebase/firestore";

export default function AvatarSelect({ navigation }) {
  const route = useRoute();
  const [avatar, setAvatar] = useState(null);

  const handleAvatar = async (selectedAvatar) => {
    setAvatar(selectedAvatar);

    try {
      const user = auth.currentUser;
      const db = getFirestore();

      const userRef = doc(db, "users", user.uid);

      await updateDoc(userRef, {
        character: selectedAvatar.toLowerCase(), // "pink", "dino", "owl"
      });

      console.log("Avatar saved to database!");

      navigation.navigate("HomeScreen");
    } catch (error) {
      console.log("Error saving avatar:", error);
    }
  };
  return (
    //ADD A NICKNAME

    <View style={styles.container}>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => navigation.navigate("StartUp")}
      >
        <Ionicons name="arrow-back" size={32} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.subtitle}>Please choose your</Text>
      <Text style={styles.subtitles}>English Buddy!</Text>

      <View style={styles.avatarContainer}>
        <View style={styles.row}>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={() => handleAvatar("pink")}
          >
            <Image
              source={require("../assets/animations/run_pink.gif")}
              style={styles.avatar}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={() => handleAvatar("dino")}
          >
            <Image
              source={require("../assets/animations/run_dino.gif")}
              style={styles.avatar}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.avatarWrapper}
          onPress={() => handleAvatar("owl")}
        >
          <Image
            source={require("../assets/animations/run_owl.gif")}
            style={styles.avatar}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#6EC1FF",
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
    marginBottom: 50,
  },
  avatarContainer: {
    flexDirection: "column",
    alignItems: "center",
    gap: 20,
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginBottom: 20,
  },

  avatarWrapper: {
    backgroundColor: "#fff",
    borderRadius: 100,
    padding: 10,
    marginVertical: 5,
  },
  avatar: {
    width: 120,
    height: 120,
  },
});
