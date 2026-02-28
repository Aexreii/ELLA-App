import { useNavigation, useRoute } from "@react-navigation/native";
import { Image } from "expo-image";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";

export default function AvatarSelect({ navigation }) {
  const route = useRoute();
  const { userName } = route.params || {};
  const [avatar, setAvatar] = useState(null);

  const handleAvatar = (selectedAvatar) => {
    setAvatar(selectedAvatar);
    console.log("Avatar selected:", selectedAvatar, userName);

    //backend part to save avatar. Go Vik!

    navigation.navigate("AvatarName", { userName, avatar: selectedAvatar });
  };
  return (
    //ADD A NICKNAME

    <View style={styles.container}>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={32} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.greeting}>Hello!</Text>
      <Text style={styles.greeting2}>{userName}</Text>
      <Text style={styles.subtitle}>Please choose your</Text>
      <Text style={styles.subtitles}>English Buddy!</Text>

      <View style={styles.avatarContainer}>
        <View style={styles.row}>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={() => handleAvatar("Pink")}
          >
            <Image
              source={require("../assets/animations/jump_pink.gif")}
              style={styles.avatar}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={() => handleAvatar("Dino")}
          >
            <Image
              source={require("../assets/animations/jump_dino.gif")}
              style={styles.avatar}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.avatarWrapper}
          onPress={() => handleAvatar("Owl")}
        >
          <Image
            source={require("../assets/animations/jump_owl.gif")}
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
    textAlign: "center",
  },
  greeting2: {
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
