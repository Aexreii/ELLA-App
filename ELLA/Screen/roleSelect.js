import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { auth } from "../firebase";
import { getFirestore, doc, updateDoc } from "firebase/firestore";
import useAppFonts from "../hook/useAppFonts";
import { useScale } from "../utils/scaling";

export default function RoleSelect() {
  const navigation = useNavigation();
  const route = useRoute();
  const { userName } = route.params || {};
  const [role, setRole] = useState(null);
  const fontsLoaded = useAppFonts();
  const { scale, verticalScale } = useScale();

  if (!fontsLoaded) return null;

  const handleRole = async (selectedRole) => {
    setRole(selectedRole);
    console.log("Role selected:", selectedRole, userName);
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Error", "User not logged in");
        return;
      }
      const db = getFirestore();
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { role: selectedRole });
      console.log("Role saved:", selectedRole);
      navigation.navigate("NameEntry", { userRole: selectedRole });
    } catch (error) {
      console.log(error);
      Alert.alert("Error", error.message);
    }
  };

  const s = getStyles(scale, verticalScale);

  return (
    <View style={s.container}>
      <TouchableOpacity
        style={s.closeButton}
        onPress={() => {
          if (navigation.canGoBack()) navigation.goBack();
          else navigation.replace("StartUp");
        }}
      >
        <Ionicons name="arrow-back" size={32} color="#fff" />
      </TouchableOpacity>

      <Text style={s.title}>Are you a?</Text>

      <View style={s.rolesContainer}>
        <TouchableOpacity
          style={s.roleCircle}
          onPress={() => handleRole("Student")}
        >
          <Image
            source={require("../assets/animations/student.png")}
            style={s.roleGif}
            contentFit="cover"
          />
        </TouchableOpacity>
        <Text style={s.roleLabel}>Student</Text>

        <View style={{ height: verticalScale(60) }} />

        <TouchableOpacity
          style={s.roleCircle}
          onPress={() => handleRole("Teacher")}
        >
          <Image
            source={require("../assets/animations/teacher.png")}
            style={s.roleGif}
            contentFit="cover"
          />
        </TouchableOpacity>
        <Text style={s.roleLabel}>Teacher</Text>
      </View>
    </View>
  );
}

const getStyles = (scale, verticalScale) =>
  StyleSheet.create({
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
    rolesContainer: { alignItems: "center", justifyContent: "center" },
    roleCircle: {
      width: scale(120),
      height: scale(120),
      borderRadius: scale(100),
      backgroundColor: "#fff",
      borderColor: "#fff",
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      overflow: "visible",
    },
    roleGif: { width: scale(45), height: "60%" },
    roleLabel: {
      fontFamily: "PixelifySans",
      fontSize: scale(24),
      color: "#fff",
      marginTop: verticalScale(10),
    },
  });
