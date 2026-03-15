import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, updateDoc } from "firebase/firestore";

export default function RoleSelect() {
  const navigation = useNavigation();
  const route = useRoute();
  const { userName } = route.params || {};
  const [role, setRole] = useState(null);

  if (!fontsLoaded) {
    return null; // Wait for fonts to load
  }

  const handleRole = async (selectedRole) => {
    setRole(selectedRole);
    console.log("Role selected:", selectedRole, userName);

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
        role: selectedRole,
      });

      console.log("Role saved:", selectedRole);

      navigation.navigate("HomeScreen");
    } catch (error) {
      console.log(error);
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* Close Button */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.replace("StartUp"); // fallback
          }
        }}
      >
        <Ionicons name="arrow-back" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Title */}
      <Text style={styles.title}>Are you a?</Text>

      {/* Role Icons */}
      <View style={styles.rolesContainer}>
        {/* Student */}
        <TouchableOpacity
          style={styles.roleCircle}
          onPress={() => handleRole("Student")}
        >
          <Image
            source={require("../assets/animations/student.gif")}
            style={styles.roleGif}
            contentFit="cover"
          />
        </TouchableOpacity>
        <Text style={styles.roleLabel}>Student</Text>

        {/* Spacing between icons */}
        <View style={{ height: 60 }} />

        {/* Teacher */}
        <TouchableOpacity
          style={styles.roleCircle}
          onPress={() => handleRole("Teacher")}
        >
          <Image
            source={require("../assets/animations/teacher.gif")}
            style={styles.roleGif}
            contentFit="cover"
          />
        </TouchableOpacity>
        <Text style={styles.roleLabel}>Teacher</Text>
      </View>
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
    marginBottom: 40,
    color: "#fff",
  },
  gif: {
    width: 150,
    height: 150,
    marginBottom: 30,
  },
  rolesContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  roleCircle: {
    width: 120,
    height: 120,
    borderRadius: 100,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  roleGif: {
    width: 45,
    height: "60%",
  },
  roleLabel: {
    fontFamily: "PixelifySans",
    fontSize: 24,
    color: "#fff",
    marginTop: 10,
  },
});
