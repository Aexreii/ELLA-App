import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Image as RNImage } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useScale } from "../utils/scaling";

export default function OpenBook({ route, navigation }) {
  const { book, currUser } = route.params;
  const { scale, verticalScale } = useScale();
  const s = getStyles(scale, verticalScale);

  const handleStartReading = () =>
    navigation.navigate("ReadBook", { book, currUser });

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

      <TouchableOpacity style={s.button} onPress={handleStartReading}>
        <Text style={s.buttonText}>Start Reading</Text>
      </TouchableOpacity>
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
    button: {
      marginTop: verticalScale(50),
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
  });
