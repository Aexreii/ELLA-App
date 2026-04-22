import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useScale } from "../utils/scaling";

const TEAM = [
  {
    name: "Dexter Andrei B. Rañosa",
    role: "Project Manager",
    image: require("../assets/team/PM.png"),
  },
  {
    name: "Mark L. Dela Cruz",
    role: "UI/UX & Frontend Developer",
    image: require("../assets/team/UI.png"),
  },
  {
    name: "Viktor Cassidy P. Ocenar",
    role: "Backend Developer",
    image: require("../assets/team/BD.png"),
  },
  {
    name: "Shana Aislinn M. Gamis",
    role: "Documentation Specialist & Database Engineer",
    image: require("../assets/team/DB.png"),
  },
  {
    name: "Xaris Joy D. Tabayag",
    role: "Quality Tester & Requirements Specialist",
    image: require("../assets/team/TS.png"),
  },
];

//rows lang dis for the devs.
function buildRows(members) {
  const rows = [];
  rows.push([members[0]]);
  for (let i = 1; i < members.length; i += 2) {
    rows.push(members.slice(i, i + 2));
  }
  return rows;
}

//basic layout
export default function aboutElla() {
  const navigation = useNavigation();
  const { scale, verticalScale } = useScale();
  const insets = useSafeAreaInsets();
  const s = getStyles(scale, verticalScale);

  const rows = buildRows(TEAM);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity
          style={s.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={scale(22)} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>About ELLA</Text>
        <View style={{ width: scale(40) }} />
      </View>

      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.section}>
          {/* App title */}
          <Text style={s.appTitle}>ELLA</Text>
          <Text style={s.appTagline}>Your English Buddy</Text>

          {/* Description */}
          <Text style={s.description}>
            English Literacy Learning App better known as{" "}
            <Text style={s.bold}>ELLA</Text> is designed to empower young
            learners through interactive speech recognition and gamified
            literacy exercises. By providing a supportive environment for
            real-time practice, it transforms the challenge of mastering a new
            language into an engaging adventure with a friendly digital
            companion.
          </Text>

          {/* Characters row */}
          <View style={s.charactersRow}>
            <Image
              source={require("../assets/animations/jump_dino.gif")}
              style={s.characterImg}
              resizeMode="contain"
            />
            <Image
              source={require("../assets/animations/jump_owl.gif")}
              style={s.characterImg}
              resizeMode="contain"
            />
            <Image
              source={require("../assets/animations/jump_pink.gif")}
              style={s.characterImg}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* ── Divider ── */}
        <View style={s.divider} />

        <View style={s.section}>
          <Text style={s.sectionTitle}>About the Team</Text>

          {rows.map((row, ri) => (
            <View
              key={ri}
              style={[s.teamRow, row.length === 1 && s.teamRowCenter]}
            >
              {row.map((member, mi) => (
                <View key={mi} style={s.memberCard}>
                  <View style={s.avatarRing}>
                    <Image
                      source={member.image}
                      style={s.memberAvatar}
                      resizeMode="cover"
                    />
                  </View>
                  <Text style={s.memberName}>{member.name}</Text>
                  <Text style={s.memberRole}>{member.role}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (scale, verticalScale) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#f2f2f2",
    },

    // ── Header ──
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

    // ── Scroll ──
    scrollContent: {
      paddingHorizontal: scale(20),
      paddingTop: verticalScale(28),
      paddingBottom: verticalScale(40),
      alignItems: "center",
    },

    // ── Sections ──
    section: {
      width: "100%",
      alignItems: "center",
    },
    divider: {
      height: 1,
      backgroundColor: "#ddd",
      width: "100%",
      marginVertical: verticalScale(24),
    },

    // ── About ELLA ──
    appTitle: {
      fontFamily: "PixelifySans",
      fontSize: scale(48),
      color: "#1a1a2e",
      textAlign: "center",
    },
    appTagline: {
      fontFamily: "PixelifySans",
      fontSize: scale(18),
      color: "#888",
      textAlign: "center",
      marginBottom: verticalScale(16),
    },
    charactersRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: scale(8),
    },
    characterImg: {
      width: scale(50),
      height: scale(50),
    },
    description: {
      fontFamily: "Poppins",
      fontSize: scale(14),
      color: "#444",
      textAlign: "center",
      paddingHorizontal: scale(4),
    },
    bold: {
      fontFamily: "Poppins",
      fontWeight: "bold",
      color: "#1a1a2e",
    },

    // ── Team ──
    sectionTitle: {
      fontFamily: "Mochi",
      fontSize: scale(26),
      color: "#1a1a2e",
      textAlign: "center",
      marginBottom: verticalScale(20),
    },
    teamRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: "100%",
      marginBottom: verticalScale(10),
    },
    teamRowCenter: {
      justifyContent: "center",
    },
    memberCard: {
      width: "46%",
      alignItems: "center",
    },
    avatarRing: {
      width: scale(80),
      height: scale(80),
      borderRadius: scale(45),
      borderWidth: 3,
      borderColor: "#60B5FF",
      overflow: "hidden",
      marginBottom: verticalScale(8),
      backgroundColor: "#fff",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    memberAvatar: {
      width: "100%",
      height: "100%",
    },
    memberName: {
      fontFamily: "Poppins",
      fontWeight: "bold",
      fontSize: scale(12),
      color: "#1a1a2e",
      textAlign: "center",
      marginBottom: verticalScale(2),
    },
    memberRole: {
      fontFamily: "Poppins",
      fontSize: scale(11),
      color: "#888",
      textAlign: "center",
    },
  });
