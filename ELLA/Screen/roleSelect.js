import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, updateDoc } from "firebase/firestore";
import useAppFonts from "../hook/useAppFonts";
import { scale, verticalScale } from "../utils/scaling";

export default function RoleSelect() {
  const navigation = useNavigation();
  const route = useRoute();
  const { userName } = route.params || {};
  const [role, setRole] = useState(null);
  const fontsLoaded = useAppFonts();

  if (!fontsLoaded) {
    return null;
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

      navigation.navigate("NameEntry", { userRole: selectedRole });
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
    top: verticalScale(50),
    left: scale(20),
  },
  title: {
    fontFamily: "Mochi",
    fontSize: scale(36),
    textAlign: "center",
    marginBottom: verticalScale(40),
    color: "#fff",
  },
  gif: {
    width: scale(150),
    height: verticalScale(150),
    marginBottom: scale(30),
  },
  rolesContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  roleCircle: {
    width: scale(120),
    height: verticalScale(120),
    borderRadius: scale(100),
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  roleGif: {
    width: scale(45),
    height: "60%",
  },
  roleLabel: {
    fontFamily: "PixelifySans",
    fontSize: scale(24),
    color: "#fff",
    marginTop: verticalScale(10),
  },
});
