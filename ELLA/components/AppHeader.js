import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { useScale } from "../utils/scaling";

export default function AppHeader({
  currUser,
  characterImages,
  onAvatarPress,
}) {
  const { scale } = useScale();
  const s = getStyles(scale);

  return (
    <View style={s.header}>
      <TouchableOpacity onPress={onAvatarPress} style={s.avatarContainer}>
        <Image
          source={characterImages[currUser?.character]}
          style={s.characterImage}
        />
      </TouchableOpacity>

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
        <Text style={s.amountText}>{currUser?.points ?? 0}</Text>
      </View>
    </View>
  );
}

const getStyles = (scale) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      backgroundColor: "#60B5FF",
      paddingVertical: scale(12),
      paddingHorizontal: scale(15),
    },
    avatarContainer: {
      alignItems: "center",
      justifyContent: "center",
      marginRight: scale(20),
    },
    characterImage: {
      width: scale(50),
      height: scale(50),
      borderRadius: scale(50),
      backgroundColor: "#fff",
      overflow: "hidden",
    },
    headerText: {
      flexDirection: "column",
      flex: 1,
      alignItems: "center",
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
      backgroundColor: "rgba(0, 0, 0, 0.2)",
      borderColor: "white",
      borderWidth: 1,
      borderRadius: scale(50),
      paddingVertical: 1,
      paddingHorizontal: scale(10),
      marginRight: scale(10),
    },
    diamondIcon: {
      width: scale(20),
      height: scale(20),
      marginRight: scale(8),
    },
    amountText: {
      color: "white",
      fontSize: scale(10),
      fontFamily: "Mochi",
    },
  });
