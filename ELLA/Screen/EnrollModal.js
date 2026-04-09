import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useScale } from "../utils/scaling";
import { auth } from "../firebase";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  arrayUnion,
} from "firebase/firestore";
import EllAlert, { useEllAlert } from "../components/Ellalert";

export default function EnrollModal({ visible, onClose }) {
  const { scale, verticalScale } = useScale();
  const { alertConfig, showAlert, closeAlert } = useEllAlert();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [enrolledClassName, setEnrolledClassName] = useState("");

  const handleClose = () => {
    setCode("");
    setLoading(false);
    setSuccess(false);
    setEnrolledClassName("");
    onClose();
  };

  const handleJoin = async () => {
    const trimmed = code.trim();
    if (trimmed.length !== 8) {
      showAlert({
        type: "warning",
        title: "Invalid Code",
        message: "Class code must be exactly 8 characters.",
      });
      return;
    }

    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        showAlert({
          type: "error",
          title: "Error",
          message: "You must be logged in to enroll.",
        });
        setLoading(false);
        return;
      }

      const db = getFirestore();
      const classesRef = collection(db, "classes");
      const q = query(classesRef, where("code", "==", trimmed));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        showAlert({
          type: "error",
          title: "Not Found",
          message:
            "No class found with that code. Please check with your teacher.",
        });
        setLoading(false);
        return;
      }

      const classDoc = snapshot.docs[0];
      const classData = classDoc.data();

      const alreadyEnrolled = classData.students?.includes(user.uid);
      if (alreadyEnrolled) {
        showAlert({
          type: "info",
          title: "Already Enrolled",
          message: "You are already enrolled in this class.",
        });
        setLoading(false);
        return;
      }

      await updateDoc(doc(db, "classes", classDoc.id), {
        students: arrayUnion(user.uid),
      });
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { classEnrolled: classDoc.id });

      setEnrolledClassName(classData.name || "your class");
      setSuccess(true);
    } catch (error) {
      console.log("Enroll error:", error);
      showAlert({ type: "error", title: "Error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const s = getStyles(scale, verticalScale);

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <View style={s.overlay}>
          <View style={s.card}>
            <TouchableOpacity style={s.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={scale(20)} color="#555" />
            </TouchableOpacity>

            {success ? (
              <View style={s.successContainer}>
                <View style={s.successIcon}>
                  <Ionicons
                    name="checkmark-circle"
                    size={scale(60)}
                    color="#4CAF50"
                  />
                </View>
                <Text style={s.successTitle}>You're Enrolled!</Text>
                <Text style={s.successSub}>
                  You've successfully joined{"\n"}
                </Text>
                <TouchableOpacity style={s.doneButton} onPress={handleClose}>
                  <Text style={s.doneButtonText}>Let's Go!</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={s.title}>Enter the class code:</Text>
                <View style={s.inputBox}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={scale(18)}
                    color="#aaa"
                    style={s.inputIcon}
                  />
                  <TextInput
                    style={s.input}
                    placeholder="Ask teacher or parent for help!"
                    placeholderTextColor="#bbb"
                    value={code}
                    onChangeText={(text) =>
                      setCode(text.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8))
                    }
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={8}
                  />
                </View>
                <TouchableOpacity
                  style={[s.joinButton, loading && s.joinButtonDisabled]}
                  onPress={handleJoin}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={s.joinButtonText}>Join</Text>
                  )}
                </TouchableOpacity>
                <Text style={s.hint}>
                  The code is an eight alphanumeric{"\n"}
                  characters provided by teacher:{"\n"}
                  <Text style={s.hintExample}>ex. 1fge451g</Text>
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>

      <EllAlert config={alertConfig} onClose={closeAlert} />
    </>
  );
}

const getStyles = (scale, verticalScale) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    card: {
      backgroundColor: "#fff",
      borderRadius: scale(20),
      padding: scale(28),
      width: "90%",
      alignItems: "center",
      elevation: 10,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
    },
    closeButton: {
      position: "absolute",
      top: scale(14),
      left: scale(14),
      width: scale(32),
      height: scale(32),
      borderRadius: scale(16),
      backgroundColor: "#f2f2f2",
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontFamily: "PixelifySans",
      fontSize: scale(18),
      color: "#1a1a2e",
      textAlign: "center",
      marginTop: verticalScale(10),
      marginBottom: verticalScale(20),
    },
    inputBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#f5f5f5",
      borderRadius: scale(12),
      borderWidth: 1.5,
      borderColor: "#e8e8e8",
      width: "100%",
      height: verticalScale(60),
      paddingHorizontal: scale(12),
      marginBottom: verticalScale(16),
    },
    inputIcon: { marginRight: scale(8) },
    input: {
      flex: 1,
      fontFamily: "Poppins",
      fontSize: scale(13),
      color: "#1a1a2e",
      letterSpacing: 0.5,
    },
    joinButton: {
      backgroundColor: "#FF9149",
      width: "60%",
      height: verticalScale(48),
      borderRadius: scale(25),
      alignItems: "center",
      justifyContent: "center",
      marginBottom: verticalScale(20),
      elevation: 2,
    },
    joinButtonDisabled: { opacity: 0.7 },
    joinButtonText: {
      fontFamily: "PixelifySans",
      fontSize: scale(18),
      color: "#fff",
    },
    hint: {
      fontFamily: "Poppins",
      fontSize: scale(11),
      color: "#aaa",
      textAlign: "center",
      lineHeight: scale(18),
    },
    hintExample: { fontStyle: "italic", color: "#bbb" },
    successContainer: {
      alignItems: "center",
      paddingTop: verticalScale(10),
      paddingBottom: verticalScale(6),
    },
    successIcon: { marginBottom: verticalScale(12) },
    successTitle: {
      fontFamily: "Mochi",
      fontSize: scale(24),
      color: "#1a1a2e",
      marginBottom: verticalScale(8),
    },
    successSub: {
      fontFamily: "Poppins",
      fontSize: scale(13),
      color: "#777",
      textAlign: "center",
      lineHeight: scale(20),
      marginBottom: verticalScale(20),
    },
    doneButton: {
      backgroundColor: "#FF9149",
      paddingVertical: verticalScale(12),
      paddingHorizontal: scale(40),
      borderRadius: scale(25),
      elevation: 2,
    },
    doneButtonText: {
      fontFamily: "PixelifySans",
      fontSize: scale(16),
      color: "#fff",
    },
  });
