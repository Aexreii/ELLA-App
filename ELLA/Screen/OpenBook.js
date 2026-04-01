import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Image as RNImage } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useScale } from "../utils/scaling";
import { getFirestore, doc, updateDoc } from "firebase/firestore";

export default function OpenBook({ route, navigation }) {
  const { book: initialBook, currUser } = route.params;
  const { scale, verticalScale } = useScale();
  const s = getStyles(scale, verticalScale);

  // Keep a local copy so edits reflect immediately after save
  const [book, setBook] = useState(initialBook);
  const isTeacher = currUser?.role === "Teacher";

  // ── Edit modal state ──────────────────────────────────────
  const [editVisible, setEditVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editFields, setEditFields] = useState({
    title: book.title ?? "",
    writer: book.writer ?? "",
    publisher: book.publisher ?? "",
    difficulty: book.difficulty ?? "",
    cover: book.cover ?? "",
  });

  const handleStartReading = () =>
    navigation.navigate("ReadBook", { book, currUser });

  const handleOpenEdit = () => {
    setEditFields({
      title: book.title ?? "",
      writer: book.writer ?? "",
      publisher: book.publisher ?? "",
      difficulty: book.difficulty ?? "",
      cover: book.cover ?? "",
    });
    setEditVisible(true);
  };

  const handleSaveEdit = async () => {
    // Basic validation
    if (!editFields.title.trim()) {
      Alert.alert("Validation", "Title cannot be empty.");
      return;
    }
    setIsSaving(true);
    try {
      const db = getFirestore();
      const bookRef = doc(db, "books", book.id);
      const updates = {
        title: editFields.title.trim(),
        writer: editFields.writer.trim(),
        publisher: editFields.publisher.trim(),
        difficulty: editFields.difficulty.trim(),
        cover: editFields.cover.trim(),
      };
      await updateDoc(bookRef, updates);
      // Reflect changes locally so the screen updates without re-fetching
      setBook((prev) => ({ ...prev, ...updates }));
      setEditVisible(false);
      Alert.alert("Saved", "Book details updated successfully.");
    } catch (error) {
      console.log("Edit book error:", error);
      Alert.alert("Error", "Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={s.container}>
      <TouchableOpacity
        style={s.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={scale(26)} color="#fff" />
      </TouchableOpacity>

      <View style={s.header}>
        <View style={s.headerText}>
          <Text style={s.title}>ELLA</Text>
          <Text style={s.subTitle}>Your English Buddy</Text>
        </View>
        <View style={s.badgeContainer}>
          <Image
            source={require("../assets/icons/diamond.png")}
            style={s.diamondIcon}
            resizeMode="contain"
          />
          <Text style={s.amountText}>{currUser.points}</Text>
        </View>
      </View>

      <View style={{ height: verticalScale(20) }} />
      <Text style={s.bookTitle}>{book.title}</Text>
      <RNImage source={{ uri: book.cover }} style={s.coverImage} />

      <View style={s.detailContainer}>
        {[
          { icon: "pencil-outline", label: "Written by", value: book.writer },
          {
            icon: "journal-outline",
            label: "Published by",
            value: book.publisher,
          },
          {
            icon: "speedometer-outline",
            label: "Difficulty",
            value: book.difficulty,
          },
        ].map(({ icon, label, value }) => (
          <View key={label} style={s.detailItem}>
            <Ionicons
              name={icon}
              size={scale(26)}
              color="#00000094"
              style={s.detailIcon}
            />
            <View style={s.detailTextContainer}>
              <Text style={s.detailTitle}>{label}</Text>
              <Text style={s.detailText}>{value}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* ── Action buttons row ── */}
      <View style={s.buttonRow}>
        <TouchableOpacity style={s.button} onPress={handleStartReading}>
          <Text style={s.buttonText}>Start Reading</Text>
        </TouchableOpacity>

        {/* Edit button — teachers only */}
        {isTeacher && (
          <TouchableOpacity style={s.editButton} onPress={handleOpenEdit}>
            <Ionicons name="pencil" size={scale(18)} color="#fff" />
            <Text style={s.editButtonText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Edit Modal ── */}
      <Modal
        visible={editVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalContainer}>
            <Text style={s.modalTitle}>Edit Book</Text>

            <ScrollView
              style={{ width: "100%" }}
              showsVerticalScrollIndicator={false}
            >
              {[
                { key: "title", label: "Title" },
                { key: "writer", label: "Author" },
                { key: "publisher", label: "Publisher" },
                { key: "difficulty", label: "Difficulty" },
                { key: "cover", label: "Cover URL" },
              ].map(({ key, label }) => (
                <View key={key} style={s.inputGroup}>
                  <Text style={s.inputLabel}>{label}</Text>
                  <TextInput
                    style={[
                      s.input,
                      key === "cover" && { height: verticalScale(60) },
                    ]}
                    value={editFields[key]}
                    onChangeText={(val) =>
                      setEditFields((prev) => ({ ...prev, [key]: val }))
                    }
                    placeholder={`Enter ${label.toLowerCase()}`}
                    placeholderTextColor="#aaa"
                    multiline={key === "cover"}
                    autoCapitalize={key === "cover" ? "none" : "sentences"}
                  />
                </View>
              ))}
            </ScrollView>

            <View style={s.modalButtons}>
              <TouchableOpacity
                style={s.modalCancelButton}
                onPress={() => setEditVisible(false)}
                disabled={isSaving}
              >
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.modalSaveButton, isSaving && { opacity: 0.6 }]}
                onPress={handleSaveEdit}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s.modalSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (scale, verticalScale) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#fff",
      alignItems: "center",
      marginTop: verticalScale(30),
    },
    backButton: {
      position: "absolute",
      top: verticalScale(18),
      left: scale(20),
      zIndex: 50,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      marginBottom: verticalScale(30),
      backgroundColor: "#60B5FF",
      height: verticalScale(60),
    },
    headerText: {
      flexDirection: "column",
      flex: 1,
      alignItems: "center",
      marginLeft: scale(70),
    },
    title: {
      fontFamily: "PixelifySans",
      fontSize: scale(24),
      textAlign: "center",
      color: "#fff",
    },
    subTitle: {
      fontFamily: "PixelifySans",
      fontSize: scale(12),
      textAlign: "center",
      color: "#fff",
    },
    badgeContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.2)",
      borderColor: "white",
      borderWidth: 1,
      borderRadius: scale(50),
      paddingVertical: 1,
      paddingHorizontal: scale(10),
      marginRight: scale(10),
    },
    diamondIcon: { width: scale(10), height: scale(10), marginRight: scale(8) },
    amountText: { color: "#fff", fontSize: scale(10), fontFamily: "Mochi" },
    bookTitle: {
      fontSize: scale(20),
      fontFamily: "Mochi",
      color: "#000",
      marginTop: verticalScale(10),
    },
    coverImage: {
      marginTop: verticalScale(45),
      width: scale(260),
      height: verticalScale(160),
      borderRadius: scale(10),
      borderWidth: 3,
      borderColor: "#60B5FF",
      marginBottom: verticalScale(20),
    },
    detailContainer: {
      flexDirection: "column",
      marginVertical: verticalScale(20),
      width: "60%",
    },
    detailItem: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: verticalScale(15),
    },
    detailIcon: { marginRight: scale(10) },
    detailTextContainer: { flexDirection: "column" },
    detailTitle: {
      fontFamily: "PoppinsBold",
      fontSize: scale(12),
      color: "#555",
    },
    detailText: { fontFamily: "Poppins", fontSize: scale(12), color: "#000" },

    // ── Button row ──
    buttonRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: scale(12),
      marginTop: verticalScale(50),
    },
    button: {
      width: scale(140),
      height: verticalScale(40),
      backgroundColor: "#FF9149",
      borderRadius: scale(8),
      alignItems: "center",
      justifyContent: "center",
      borderColor: "#000",
      borderWidth: 1.5,
    },
    buttonText: {
      color: "#000",
      fontSize: scale(14),
      fontFamily: "PoppinsBold",
    },
    editButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#60B5FF",
      height: verticalScale(40),
      paddingHorizontal: scale(16),
      borderRadius: scale(8),
      borderColor: "#000",
      borderWidth: 1.5,
      gap: scale(6),
    },
    editButtonText: {
      color: "#fff",
      fontSize: scale(14),
      fontFamily: "PoppinsBold",
    },

    // ── Edit Modal ──
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalContainer: {
      backgroundColor: "#fff",
      borderRadius: scale(16),
      padding: scale(20),
      width: "88%",
      maxHeight: "80%",
      alignItems: "center",
      elevation: 8,
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: scale(10),
      shadowOffset: { width: 0, height: 4 },
    },
    modalTitle: {
      fontFamily: "Mochi",
      fontSize: scale(20),
      color: "#FF9149",
      marginBottom: verticalScale(16),
    },
    inputGroup: {
      width: "100%",
      marginBottom: verticalScale(12),
    },
    inputLabel: {
      fontFamily: "PoppinsBold",
      fontSize: scale(12),
      color: "#555",
      marginBottom: verticalScale(4),
    },
    input: {
      borderWidth: 1.5,
      borderColor: "#ddd",
      borderRadius: scale(8),
      paddingHorizontal: scale(12),
      paddingVertical: verticalScale(8),
      fontFamily: "Poppins",
      fontSize: scale(13),
      color: "#000",
      backgroundColor: "#fafafa",
    },
    modalButtons: {
      flexDirection: "row",
      justifyContent: "flex-end",
      width: "100%",
      gap: scale(10),
      marginTop: verticalScale(16),
    },
    modalCancelButton: {
      paddingVertical: verticalScale(10),
      paddingHorizontal: scale(20),
      borderRadius: scale(8),
      borderWidth: 1.5,
      borderColor: "#ddd",
    },
    modalCancelText: {
      fontFamily: "PoppinsBold",
      fontSize: scale(13),
      color: "#555",
    },
    modalSaveButton: {
      paddingVertical: verticalScale(10),
      paddingHorizontal: scale(24),
      borderRadius: scale(8),
      backgroundColor: "#FF9149",
      borderWidth: 1.5,
      borderColor: "#000",
      alignItems: "center",
      justifyContent: "center",
      minWidth: scale(70),
    },
    modalSaveText: {
      fontFamily: "PoppinsBold",
      fontSize: scale(13),
      color: "#fff",
    },
  });
