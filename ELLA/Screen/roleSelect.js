import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useFonts } from "expo-font";

export default function RoleSelect() {
  const navigation = useNavigation();
  const route = useRoute();
  const { userName } = route.params || {};
  const [role, setRole] = useState(null);

  // Load fonts
  const [fontsLoaded] = useFonts({
    PixelifySans: require("../assets/fonts/PixelifySans-Regular.ttf"),
    PixelifySansBold: require("../assets/fonts/PixelifySans-Bold.ttf"),
    Poppins: require("../assets/fonts/Poppins-Regular.ttf"),
    PoppinsBold: require("../assets/fonts/Poppins-Bold.ttf"),
    Mochi: require("../assets/fonts/MochiyPopOne.ttf"),
  });

  if (!fontsLoaded) {
    return null; // Wait for fonts to load
  }

  const handleRole = (selectedRole) => {
    setRole(selectedRole);
    console.log("Role selected:", selectedRole, userName);

    //backend part to save role. Go Vik!

    navigation.navigate("AvatarSelect", { userName, role: selectedRole });
  };

  return (
    <View style={styles.container}>
      {/* Close Button */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => navigation.goBack()}
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
