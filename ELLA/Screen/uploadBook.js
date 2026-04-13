import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { auth } from "../firebase";
import { useRoute } from "@react-navigation/native";
import { useScale } from "../utils/scaling";
import EllAlert, { useEllAlert } from "../components/Alerts";

const CLOUDINARY_CLOUD_NAME = "dygbbqapd";
const CLOUDINARY_UPLOAD_PRESET = "ella_books";

const generateBookId = async (db) => {
  let bookId;
  let exists = true;
  while (exists) {
    bookId = Math.floor(10000 + Math.random() * 90000);
    const snap = await getDoc(doc(db, "books", `bookId${bookId}`));
    exists = snap.exists();
  }
  return bookId;
};

const splitSentences = (text) => {
  return text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
};

const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"];

export default function UploadBook() {
  const route = useRoute();
  const routeUser = route.params?.currUser ?? null;
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { scale, verticalScale } = useScale();
  const { alertConfig, showAlert, closeAlert } = useEllAlert();

  const [title, setTitle] = useState("");
  const [writer, setWriter] = useState("");
  const [publisher, setPublisher] = useState("");
  const [difficulty, setDifficulty] = useState("Beginner");
  const [contentsText, setContentsText] = useState("");
  const [coverUri, setCoverUri] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  const s = getStyles(scale, verticalScale);

  const pickFromGallery = async () => {
    setShowImageModal(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showAlert({
        type: "warning",
        title: "Permission needed",
        message: "Please allow access to your photo library.",
      });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!result.canceled) setCoverUri(result.assets[0].uri);
  };

  const pickFromCamera = async () => {
    setShowImageModal(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      showAlert({
        type: "warning",
        title: "Permission needed",
        message: "Please allow access to your camera.",
      });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!result.canceled) setCoverUri(result.assets[0].uri);
  };

  const uploadToCloudinary = async (uri) => {
    const formData = new FormData();
    formData.append("file", {
      uri,
      type: "image/jpeg",
      name: `cover_${Date.now()}.jpg`,
    });
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("cloud_name", CLOUDINARY_CLOUD_NAME);
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData },
    );
    const data = await response.json();
    if (!data.secure_url) throw new Error("Cloudinary upload failed");
    return data.secure_url;
  };

  const isTeacher = routeUser?.role === "Teacher";

  const handleUpload = async () => {
    if (!title.trim()) {
      showAlert({
        type: "warning",
        title: "Missing field",
        message: "Please enter a book title.",
      });
      return;
    }
    if (!writer.trim()) {
      showAlert({
        type: "warning",
        title: "Missing field",
        message: "Please enter the writer's name.",
      });
      return;
    }
    if (!publisher.trim()) {
      showAlert({
        type: "warning",
        title: "Missing field",
        message: "Please enter a publisher.",
      });
      return;
    }
    if (!contentsText.trim()) {
      showAlert({
        type: "warning",
        title: "Missing field",
        message: "Please write the book contents.",
      });
      return;
    }
    if (!coverUri) {
      showAlert({
        type: "warning",
        title: "Missing cover",
        message: "Please upload a book cover image.",
      });
      return;
    }

    const sentences = splitSentences(contentsText);
    if (sentences.length === 0) {
      showAlert({
        type: "warning",
        title: "Invalid contents",
        message: "No valid sentences found.",
      });
      return;
    }

    try {
      setUploading(true);
      const db = getFirestore();
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("Not logged in");

      const coverUrl = await uploadToCloudinary(coverUri);
      const bookId = await generateBookId(db);
      const docId = `bookId${bookId}`;
      const bookSource = isTeacher ? "Teacher" : "user";

      await setDoc(doc(db, "books", docId), {
        bookId,
        title: title.trim(),
        writer: writer.trim(),
        publisher: publisher.trim(),
        difficulty,
        contents: sentences,
        sentenceCount: sentences.length,
        cover: coverUrl,
        source: bookSource,
        uploadedById: uid,
      });

      const classesRef = collection(db, "classes");
      const classQuery = query(classesRef, where("teacherID", "==", uid));
      const classSnap = await getDocs(classQuery);
      if (!classSnap.empty) {
        await updateDoc(doc(db, "classes", classSnap.docs[0].id), {
          bookId: arrayUnion(bookId),
        });
      }

      showAlert({
        type: "success",
        title: "Success!",
        message: `"${title}" has been uploaded.`,
        buttons: [
          { text: "OK", onPress: () => navigation.navigate("HomeScreen") },
        ],
      });
    } catch (err) {
      console.log("Upload error:", err);
      showAlert({
        type: "error",
        title: "Upload failed",
        message: "Something went wrong. Please try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={scale(22)} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>ELLA</Text>
          <Text style={s.headerSub}>Your English Buddy</Text>
        </View>
        <View style={{ width: scale(40) }} />
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.pageTitle}>Upload Book</Text>
        <Text style={s.pageSubtitle}>Please fill up the fields below</Text>

        <TouchableOpacity
          style={s.coverPicker}
          onPress={() => setShowImageModal(true)}
          activeOpacity={0.8}
        >
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={s.coverPreview} />
          ) : (
            <View style={s.coverPlaceholder}>
              <Ionicons name="image-outline" size={scale(40)} color="#aaa" />
              <Text style={s.coverPlaceholderText}>Tap to upload cover</Text>
            </View>
          )}
        </TouchableOpacity>

        {coverUri && (
          <TouchableOpacity
            onPress={() => setShowImageModal(true)}
            style={s.changeCoverBtn}
          >
            <Text style={s.changeCoverText}>Change Cover</Text>
          </TouchableOpacity>
        )}

        <View style={s.fieldGroup}>
          <Text style={s.label}>Book Title</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. The Little Star"
            placeholderTextColor="#bbb"
            value={title}
            onChangeText={setTitle}
          />
        </View>
        <View style={s.fieldGroup}>
          <Text style={s.label}>Writer Name</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. Maria Santos"
            placeholderTextColor="#bbb"
            value={writer}
            onChangeText={setWriter}
          />
        </View>
        <View style={s.fieldGroup}>
          <Text style={s.label}>Published By</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. Adarna House"
            placeholderTextColor="#bbb"
            value={publisher}
            onChangeText={setPublisher}
          />
        </View>

        <View style={s.fieldGroup}>
          <Text style={s.label}>Book Difficulty</Text>
          <TouchableOpacity
            style={s.difficultyBtn}
            onPress={() => setShowDifficultyModal(true)}
          >
            <Text style={s.difficultyBtnText}>{difficulty}</Text>
            <Ionicons name="chevron-down" size={scale(16)} color="#555" />
          </TouchableOpacity>
        </View>

        <View style={s.fieldGroup}>
          <Text style={s.label}>Book Contents</Text>
          <Text style={s.labelHint}>
            Sentences will be split by period (.), question mark (?), or
            exclamation point (!)
          </Text>
          <TextInput
            style={s.textArea}
            placeholder="Write the book contents here. Each sentence ends with a period, question mark, or exclamation point."
            placeholderTextColor="#bbb"
            value={contentsText}
            onChangeText={setContentsText}
            multiline
            textAlignVertical="top"
          />
          {contentsText.trim().length > 0 && (
            <Text style={s.sentenceCount}>
              {splitSentences(contentsText).length} sentence
              {splitSentences(contentsText).length !== 1 ? "s" : ""} detected
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[s.uploadBtn, uploading && s.uploadBtnDisabled]}
          onPress={handleUpload}
          disabled={uploading}
          activeOpacity={0.85}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons
                name="cloud-upload-outline"
                size={scale(18)}
                color="#fff"
                style={{ marginRight: scale(8) }}
              />
              <Text style={s.uploadBtnText}>Upload</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: verticalScale(40) }} />
      </ScrollView>

      {/* ── Image Source Modal ── */}
      <Modal
        visible={showImageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowImageModal(false)}
        >
          <View style={s.imageModalContainer}>
            <Text style={s.imageModalTitle}>Upload Cover From</Text>
            <TouchableOpacity
              style={s.imageModalOption}
              onPress={pickFromGallery}
            >
              <Ionicons
                name="images-outline"
                size={scale(24)}
                color="#FF9149"
              />
              <Text style={s.imageModalOptionText}>Photo Gallery</Text>
            </TouchableOpacity>
            <View style={s.imageModalDivider} />
            <TouchableOpacity
              style={s.imageModalOption}
              onPress={pickFromCamera}
            >
              <Ionicons
                name="camera-outline"
                size={scale(24)}
                color="#FF9149"
              />
              <Text style={s.imageModalOptionText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.imageModalCancel}
              onPress={() => setShowImageModal(false)}
            >
              <Text style={s.imageModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Difficulty Modal ── */}
      <Modal
        visible={showDifficultyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDifficultyModal(false)}
      >
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDifficultyModal(false)}
        >
          <View style={s.difficultyModalContainer}>
            <Text style={s.imageModalTitle}>Select Difficulty</Text>
            {DIFFICULTIES.map((d) => (
              <TouchableOpacity
                key={d}
                style={[
                  s.difficultyOption,
                  difficulty === d && s.difficultyOptionSelected,
                ]}
                onPress={() => {
                  setDifficulty(d);
                  setShowDifficultyModal(false);
                }}
              >
                <Text
                  style={[
                    s.difficultyOptionText,
                    difficulty === d && s.difficultyOptionTextSelected,
                  ]}
                >
                  {d}
                </Text>
                {difficulty === d && (
                  <Ionicons name="checkmark" size={scale(18)} color="#FF9149" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <EllAlert config={alertConfig} onClose={closeAlert} />
    </View>
  );
}

const getStyles = (scale, verticalScale) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f2f2f2" },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "#60B5FF",
      paddingHorizontal: scale(16),
      paddingVertical: verticalScale(12),
    },
    backBtn: {
      width: scale(40),
      alignItems: "flex-start",
      justifyContent: "center",
    },
    headerCenter: { flex: 1, alignItems: "center" },
    headerTitle: {
      fontFamily: "PixelifySans",
      fontSize: scale(22),
      color: "#fff",
    },
    headerSub: {
      fontFamily: "PixelifySans",
      fontSize: scale(11),
      color: "#fff",
    },
    content: {
      alignItems: "center",
      paddingHorizontal: scale(20),
      paddingTop: verticalScale(24),
    },
    pageTitle: {
      fontFamily: "Mochi",
      fontSize: scale(30),
      color: "#1a1a2e",
      marginBottom: verticalScale(4),
    },
    pageSubtitle: {
      fontFamily: "Poppins",
      fontSize: scale(13),
      color: "#888",
      marginBottom: verticalScale(20),
      fontWeight: "bold",
    },
    coverPicker: {
      width: scale(140),
      height: verticalScale(180),
      borderRadius: scale(12),
      overflow: "hidden",
      marginBottom: verticalScale(8),
      borderWidth: 2,
      borderColor: "#60B5FF",
      borderStyle: "dashed",
    },
    coverPreview: { width: "100%", height: "100%", resizeMode: "cover" },
    coverPlaceholder: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#f9f9f9",
    },
    coverPlaceholderText: {
      fontFamily: "Poppins",
      fontSize: scale(11),
      color: "#aaa",
      marginTop: verticalScale(8),
      textAlign: "center",
      paddingHorizontal: scale(8),
    },
    changeCoverBtn: { marginBottom: verticalScale(16) },
    changeCoverText: {
      fontFamily: "Poppins",
      fontSize: scale(12),
      color: "#60B5FF",
      textDecorationLine: "underline",
    },
    fieldGroup: { width: "100%", marginBottom: verticalScale(14) },
    label: {
      fontFamily: "Poppins",
      fontSize: scale(13),
      fontWeight: "bold",
      color: "#1a1a2e",
      marginBottom: verticalScale(4),
    },
    labelHint: {
      fontFamily: "Poppins",
      fontSize: scale(11),
      color: "#aaa",
      marginBottom: verticalScale(6),
    },
    input: {
      backgroundColor: "#fff",
      borderRadius: scale(10),
      paddingHorizontal: scale(14),
      paddingVertical: verticalScale(10),
      fontFamily: "Poppins",
      fontSize: scale(13),
      color: "#1a1a2e",
      borderWidth: 1,
      borderColor: "#e0e0e0",
    },
    textArea: {
      backgroundColor: "#fff",
      borderRadius: scale(10),
      paddingHorizontal: scale(14),
      paddingVertical: verticalScale(12),
      fontFamily: "Poppins",
      fontSize: scale(13),
      color: "#1a1a2e",
      borderWidth: 1,
      borderColor: "#e0e0e0",
      minHeight: verticalScale(140),
    },
    sentenceCount: {
      fontFamily: "Poppins",
      fontSize: scale(11),
      color: "#60B5FF",
      marginTop: verticalScale(4),
      textAlign: "right",
    },
    difficultyBtn: {
      backgroundColor: "#fff",
      borderRadius: scale(10),
      paddingHorizontal: scale(14),
      paddingVertical: verticalScale(10),
      borderWidth: 1,
      borderColor: "#e0e0e0",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    difficultyBtnText: {
      fontFamily: "Poppins",
      fontSize: scale(13),
      color: "#1a1a2e",
    },
    uploadBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#FF9149",
      paddingVertical: verticalScale(13),
      paddingHorizontal: scale(50),
      borderRadius: scale(25),
      marginTop: verticalScale(10),
      elevation: 3,
    },
    uploadBtnDisabled: { backgroundColor: "#ffb98a" },
    uploadBtnText: {
      fontFamily: "PixelifySans",
      fontSize: scale(16),
      color: "#fff",
      fontWeight: "bold",
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "center",
      alignItems: "center",
    },
    imageModalContainer: {
      backgroundColor: "#fff",
      borderRadius: scale(16),
      padding: scale(24),
      width: "75%",
      alignItems: "center",
    },
    imageModalTitle: {
      fontFamily: "Mochi",
      fontSize: scale(18),
      color: "#1a1a2e",
      marginBottom: verticalScale(16),
    },
    imageModalOption: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: verticalScale(12),
      width: "100%",
      gap: scale(12),
    },
    imageModalOptionText: {
      fontFamily: "Poppins",
      fontSize: scale(15),
      color: "#1a1a2e",
    },
    imageModalDivider: { height: 1, backgroundColor: "#f0f0f0", width: "100%" },
    imageModalCancel: {
      marginTop: verticalScale(16),
      paddingVertical: verticalScale(8),
      paddingHorizontal: scale(24),
      backgroundColor: "#f2f2f2",
      borderRadius: scale(20),
    },
    imageModalCancelText: {
      fontFamily: "Poppins",
      fontSize: scale(13),
      color: "#888",
    },
    difficultyModalContainer: {
      backgroundColor: "#fff",
      borderRadius: scale(16),
      padding: scale(24),
      width: "75%",
      alignItems: "center",
    },
    difficultyOption: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
      paddingVertical: verticalScale(12),
      paddingHorizontal: scale(8),
      borderRadius: scale(8),
    },
    difficultyOptionSelected: { backgroundColor: "#fff5ef" },
    difficultyOptionText: {
      fontFamily: "Poppins",
      fontSize: scale(15),
      color: "#1a1a2e",
    },
    difficultyOptionTextSelected: { color: "#FF9149", fontWeight: "bold" },
  });
