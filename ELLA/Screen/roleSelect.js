import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { auth } from "../firebase";
import {
  getFirestore,
  doc,
  updateDoc,
  collection,
  getDoc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import useAppFonts from "../hook/useAppFonts";
import { useScale } from "../utils/scaling";

export default function RoleSelect() {
  const navigation = useNavigation();
  const route = useRoute();
  const [role, setRole] = useState(null);
  const fontsLoaded = useAppFonts();
  const { scale, verticalScale } = useScale();

  if (!fontsLoaded) return null;

  const generateClassCode = () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789qwertyuiopasdfghjklzxcvm";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const getUniqueClassCode = async (db) => {
    const newCode = generateClassCode();
    const classRef = doc(db, "classes", newCode);
    const docSnap = await getDoc(classRef);

    if (docSnap.exists()) {
      console.log("Collision detected for code:", newCode, "Retrying...");
      return await getUniqueClassCode(db);
    }

    return newCode;
  };
  const handleRole = async (selectedRole) => {
    setRole(selectedRole);
    try {
      const user = auth.currentUser;
      const db = getFirestore();
      const batch = writeBatch(db);
      const userRef = doc(db, "users", user.uid);

      if (selectedRole === "Teacher") {
        // 1. Get the 8-char string
        const classCode = await getUniqueClassCode(db);

        // 2. Define the Document Reference correctly
        // Path: classes (collection) -> classCode (document)
        const newClassRef = doc(db, "classes", classCode);

        // 3. Set the data
        batch.set(newClassRef, {
          className: `${user.name}'s Class`,
          code: classCode,
          teacherID: user.uid,
          teacherName: user.name || "Teacher",
          createdAt: serverTimestamp(),
          students: [],
          bookId: [],
        });

        // 4. Update the Teacher's profile
        batch.update(userRef, {
          role: selectedRole,
          ownedClassId: classCode,
          classCode: classCode,
        });
      } else {
        batch.update(userRef, { role: selectedRole });
      }

      await batch.commit();
      navigation.navigate("NameEntry", { userRole: selectedRole });
    } catch (error) {
      console.log("Firebase Path Error:", error);
      Alert.alert("Error", "Failed to create class path. Please try again.");
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
