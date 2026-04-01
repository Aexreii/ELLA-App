import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useNavigation } from "@react-navigation/native";
import { auth } from "../firebase";
import {
  getFirestore,
  doc,
  updateDoc,
  getDoc,
  writeBatch,
} from "firebase/firestore";
import { useScale } from "../utils/scaling";
import CustomSlider from "../components/CustomSlider";

export default function NameEntry() {
  const navigation = useNavigation();
  const { scale, verticalScale } = useScale();

  const [name, setName] = useState("");
  const [age, setAge] = useState(null);
  const [low, setLow] = useState(null);
  const [high, setHigh] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const db = getFirestore();
      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);
      const userData = docSnap.data();
      if (userData?.role === "Student") {
        setLow(3);
        setHigh(13);
        setAge(8);
      } else {
        setLow(15);
        setHigh(70);
        setAge(30);
      }
    };
    fetchUserData();
  }, []);

  const handleNameEntry = async () => {
    if (!name.trim()) {
      Alert.alert("Error!", "Please enter your name!");
      return;
    }

    setIsSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Error", "User not logged in");
        setIsSaving(false);
        return;
      }

      const db = getFirestore();
      const userRef = doc(db, "users", user.uid);

      // 1. Get current user data to retrieve the classCode
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        Alert.alert("Error", "User profile not found.");
        setIsSaving(false);
        return;
      }
      const userData = userSnap.data();

      const batch = writeBatch(db);
      const cleanName = name.trim();

      // 2. Update the User profile with name and age
      batch.update(userRef, {
        name: cleanName,
        age: age,
      });

      // 3. If Teacher, update their assigned class
      if (userData.role === "Teacher") {
        const classCode = userData.classCode; // The unique code we saved in RoleSelect

        if (classCode) {
          const classRef = doc(db, "classes", classCode);

          batch.update(classRef, {
            teacherName: cleanName,
            className: `${cleanName}'s Class`,
          });
        } else {
          console.log("No classCode found for this teacher yet.");
        }
      }

      // 4. Commit all changes
      await batch.commit();

      console.log("Name and Class updated successfully for:", cleanName);
      setIsSaving(false);
      navigation.navigate("HomeScreen");
    } catch (error) {
      console.log("NameEntry Error:", error);
      setIsSaving(false);
      Alert.alert("Error", error.message);
    }
  };

  const s = getStyles(scale, verticalScale);

  return (
    <View style={s.container}>
      <Modal transparent visible={isSaving} animationType="fade">
        <View style={s.overlay}>
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color="#FF9149" />
            <Text style={s.loadingText}>Saving your profile...</Text>
          </View>
        </View>
      </Modal>

      <TouchableOpacity
        style={s.closeButton}
        onPress={() => {
          if (navigation.canGoBack()) navigation.goBack();
          else navigation.reset({ index: 0, routes: [{ name: "StartUp" }] });
        }}
      >
        <Ionicons name="arrow-back" size={32} color="#fff" />
      </TouchableOpacity>

      <Text style={s.title}>What's your Name?</Text>

      <TextInput
        style={s.input}
        placeholder="Name"
        placeholderTextColor="black"
        value={name}
        onChangeText={setName}
      />

      <Text style={s.subtitle}>How old are you?</Text>
      <Text style={s.ageText}>{age ?? "—"}</Text>

      {/* Only render slider once min/max are loaded from Firestore */}
      {low !== null && high !== null && age !== null && (
        <View style={s.sliderContainer}>
          <CustomSlider
            value={age}
            onValueChange={(val) => setAge(val)}
            min={low}
            max={high}
            step={1}
            trackColor="#FF9149"
            trackBgColor="rgba(255,255,255,0.35)"
          />
        </View>
      )}

      <TouchableOpacity style={s.button} onPress={handleNameEntry}>
        <Text style={s.buttonText}>Enter</Text>
      </TouchableOpacity>

      <Image
        source={require("../assets/animations/jump_dino.gif")}
        style={s.gif}
        contentFit="fill"
        transition={0}
      />
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
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    loadingBox: {
      backgroundColor: "#fff",
      padding: scale(30),
      borderRadius: scale(20),
      alignItems: "center",
      gap: scale(10),
    },
    loadingText: {
      fontFamily: "Poppins",
      fontSize: scale(14),
      color: "#333",
      marginTop: scale(10),
    },
    closeButton: {
      position: "absolute",
      top: verticalScale(50),
      left: scale(20),
    },
    title: {
      fontFamily: "Mochi",
      fontSize: scale(28),
      textAlign: "center",
      paddingTop: verticalScale(40),
      marginBottom: verticalScale(30),
      color: "#fff",
    },
    subtitle: {
      fontFamily: "Poppins",
      fontSize: scale(24),
      textAlign: "left",
      color: "#fff",
      paddingTop: verticalScale(60),
    },
    input: {
      backgroundColor: "#fff",
      borderRadius: scale(15),
      width: scale(300),
      height: verticalScale(50),
      fontFamily: "Poppins",
      fontSize: scale(15),
      paddingHorizontal: scale(20),
      marginBottom: verticalScale(20),
    },
    sliderContainer: {
      width: scale(300),
      marginTop: verticalScale(10),
    },
    button: {
      backgroundColor: "#FF9149",
      paddingVertical: verticalScale(12),
      paddingHorizontal: scale(40),
      borderRadius: scale(15),
      alignItems: "center",
      borderWidth: 2,
      borderColor: "#fff",
      marginTop: verticalScale(20),
    },
    buttonText: {
      fontFamily: "Poppins",
      fontSize: scale(18),
      color: "#fff",
      fontWeight: "bold",
    },
    ageText: {
      fontFamily: "Mochi",
      fontSize: scale(20),
      marginBottom: verticalScale(20),
      color: "#ffffff",
    },
    gif: {
      width: scale(150),
      height: scale(150),
      marginTop: verticalScale(40),
    },
  });
