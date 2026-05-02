import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import api from "../utils/api";
import useAppFonts from "../hook/useAppFonts";
import { useScale } from "../utils/scaling";
import EllAlert, { useEllAlert } from "../components/Alerts";

export default function RoleSelect() {
  const navigation = useNavigation();
  const route = useRoute();
  const [role, setRole] = useState(null);
  const fontsLoaded = useAppFonts();
  const { scale, verticalScale } = useScale();
  const { alertConfig, showAlert, closeAlert } = useEllAlert();

  if (!fontsLoaded) return null;

  const handleRole = async (selectedRole) => {
    setRole(selectedRole);
    try {
      if (selectedRole === "Teacher") {
        // Use backend API to create class (also sets role to Teacher)
        await api.class.create({});
      } else {
        // Use backend API to update profile role
        await api.user.updateProfile({ role: selectedRole });
      }

      navigation.navigate("NameEntry", { userRole: selectedRole });
    } catch (error) {
      console.log("Role selection error:", error);
      showAlert({
        type: "error",
        title: "Error",
        message: error.message || "Failed to update role. Please try again.",
      });
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

      <EllAlert config={alertConfig} onClose={closeAlert} />
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
      alignItems: "center",
      justifyContent: "center",
      overflow: "visible",
    },
    roleGif: {
      width: scale(150),
      height: scale(150),
      borderRadius: scale(75),
    },
    roleLabel: {
      fontFamily: "PixelifySans",
      fontSize: scale(24),
      color: "#fff",
      marginTop: verticalScale(10),
    },
  });
