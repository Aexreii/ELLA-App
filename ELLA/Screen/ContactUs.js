import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useScale } from "../utils/scaling";
import api from "../utils/api";
import { useScale } from "../utils/scaling";
import EllAlert, { useEllAlert } from "../components/Alerts";

const GFORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLScFCtskkZeLfHakWIP9bJEjNF6d3rwkiSMLv6KdZQoq5VoZ5Q/formResponse";

export default function ContactUs() {
  const navigation = useNavigation();
  const { scale, verticalScale } = useScale();
  const insets = useSafeAreaInsets();
  const { alertConfig, showAlert, closeAlert } = useEllAlert();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!name.trim() || !email.trim() || !subject.trim() || !comment.trim()) {
      showAlert({
        type: "warning",
        title: "Missing Fields",
        message: "Please fill in all fields before sending.",
      });
      return;
    }

    setSending(true);
    try {
      // Use backend API instead of direct Firestore
      await api.user.report({
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        comment: comment.trim(),
      });

      showAlert({
        type: "success",
        title: "Thank you!",
        message: "Your message has been sent successfully.",
        buttons: [
          {
            text: "OK",
            onPress: () => {
              setName("");
              setEmail("");
              setSubject("");
              setComment("");
            },
          },
        ],
      });
    } catch (err) {
      console.log("ContactUs send error:", err);
      showAlert({
        type: "error",
        title: "Error",
        message: "Failed to send your message. Please try again.",
      });
    } finally {
      setSending(false);
    }
  };


  const s = getStyles(scale, verticalScale);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity
          style={s.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={scale(22)} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Contact Us</Text>
        <View style={{ width: scale(40) }} />
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.heroTitle}>We're here to help!</Text>
        <Text style={s.heroSubtitle}>
          Kindly let us know if you have any errors, or recommendations for
          ELLA! You can leave your concerns at the form below.
        </Text>

        <View style={s.card}>
          <TextInput
            style={s.input}
            placeholder="Name"
            placeholderTextColor="#bbb"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={s.input}
            placeholder="Email"
            placeholderTextColor="#bbb"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={s.input}
            placeholder="Subject"
            placeholderTextColor="#bbb"
            value={subject}
            onChangeText={setSubject}
          />
          <TextInput
            style={[s.input, s.textArea]}
            placeholder="Comment"
            placeholderTextColor="#bbb"
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[s.sendButton, sending && s.sendButtonDisabled]}
            onPress={handleSend}
            disabled={sending}
            activeOpacity={0.8}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={s.sendButtonText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={s.footer}>
          <Text style={s.footerLabel}>You can reach us in email thru:</Text>
          <Text style={s.footerEmail}>ella_contact@gmail.com</Text>
          <TouchableOpacity
            style={s.gformLink}
            onPress={() => Linking.openURL(GFORM_URL)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="open-outline"
              size={scale(14)}
              color="#60B5FF"
              style={{ marginRight: scale(4) }}
            />
            <Text style={s.gformLinkText}>
              If you have time please answer this form!
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

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
      paddingVertical: verticalScale(18),
    },
    backButton: {
      width: scale(40),
      alignItems: "flex-start",
      justifyContent: "center",
    },
    headerTitle: {
      fontFamily: "PixelifySans",
      fontSize: scale(22),
      color: "#fff",
      textAlign: "center",
      flex: 1,
    },
    content: {
      paddingHorizontal: scale(20),
      paddingTop: verticalScale(28),
      paddingBottom: verticalScale(40),
      alignItems: "center",
    },
    heroTitle: {
      fontFamily: "Mochi",
      fontSize: scale(26),
      color: "#1a1a2e",
      textAlign: "center",
      marginBottom: verticalScale(10),
    },
    heroSubtitle: {
      fontFamily: "Poppins",
      fontSize: scale(13),
      color: "#666",
      textAlign: "center",
      lineHeight: scale(20),
      marginBottom: verticalScale(24),
      paddingHorizontal: scale(8),
    },
    card: {
      backgroundColor: "#fff",
      borderRadius: scale(16),
      padding: scale(16),
      width: "100%",
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 3,
      marginBottom: verticalScale(28),
    },
    input: {
      borderWidth: 1,
      borderColor: "#e0e0e0",
      borderRadius: scale(10),
      paddingHorizontal: scale(14),
      paddingVertical: verticalScale(10),
      fontFamily: "Poppins",
      fontSize: scale(13),
      color: "#333",
      marginBottom: verticalScale(12),
      backgroundColor: "#fafafa",
    },
    textArea: { height: verticalScale(100), paddingTop: verticalScale(10) },
    sendButton: {
      backgroundColor: "#FF9149",
      borderRadius: scale(10),
      paddingVertical: verticalScale(12),
      alignItems: "center",
      marginTop: verticalScale(4),
    },
    sendButtonDisabled: { opacity: 0.6 },
    sendButtonText: {
      fontFamily: "PoppinsBold",
      fontSize: scale(15),
      color: "#fff",
    },
    footer: { alignItems: "center", gap: verticalScale(4) },
    footerLabel: {
      fontFamily: "PoppinsBold",
      fontSize: scale(13),
      color: "#444",
    },
    footerEmail: {
      fontFamily: "Poppins",
      fontSize: scale(13),
      color: "#666",
      marginBottom: verticalScale(8),
    },
    gformLink: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: verticalScale(4),
    },
    gformLinkText: {
      fontFamily: "Poppins",
      fontSize: scale(13),
      color: "#60B5FF",
      textDecorationLine: "underline",
    },
  });
