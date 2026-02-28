import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Image as RNImage } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

export default function OpenBook({ route, navigation }) {
  const { book, currUser } = route.params;

  const handleStartReading = () => {
    navigation.navigate("ReadBook", { book, currUser });
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={26} color="#fff" />
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>ELLA</Text>
          <Text style={styles.subTitle}>Your English Buddy</Text>
        </View>
        <View style={styles.badgeContainer}>
          <Image
            source={require("../assets/icons/diamond.png")}
            style={styles.diamondIcon}
            resizeMode="contain"
          />
          <Text style={styles.amountText}>{currUser.points}</Text>
        </View>
      </View>

      <View style={{ height: 20 }} />

      <Text style={styles.bookTitle}>{book.title}</Text>
      <RNImage source={{ uri: book.cover }} style={styles.coverImage} />

      <View style={styles.detailContainer}>
        <View style={styles.detailItem}>
          <Ionicons
            name="pencil-outline"
            size={26}
            color="#00000094"
            style={styles.detailIcon}
          />
          <View style={styles.detailTextContainer}>
            <Text style={styles.detailTitle}>Written by</Text>
            <Text style={styles.detailText}>{book.writer}</Text>
          </View>
        </View>

        <View style={styles.detailItem}>
          <Ionicons
            name="journal-outline"
            size={26}
            color="#00000094"
            style={styles.detailIcon}
          />
          <View style={styles.detailTextContainer}>
            <Text style={styles.detailTitle}>Published by</Text>
            <Text style={styles.detailText}>{book.publisher}</Text>
          </View>
        </View>

        <View style={styles.detailItem}>
          <Ionicons
            name="speedometer-outline"
            size={26}
            color="#00000094"
            style={styles.detailIcon}
          />
          <View style={styles.detailTextContainer}>
            <Text style={styles.detailTitle}>Difficulty</Text>
            <Text style={styles.detailText}>{book.difficulty}</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity style={styles.button} onPress={handleStartReading}>
        <Text style={styles.buttonText}>Start Reading</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffffff",
    alignItems: "center",
  },
  backButton: {
    position: "absolute",
    top: 18,
    left: 20,
    zIndex: 50,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 30,
    backgroundColor: "#60B5FF",
    height: 60,
  },
  headerText: {
    flexDirection: "column",
    flex: 1,
    alignItems: "center",
    marginLeft: 70,
  },
  title: {
    fontFamily: "PixelifySans",
    fontSize: 24,
    textAlign: "center",
    color: "#fff",
  },
  subTitle: {
    fontFamily: "PixelifySans",
    fontSize: 12,
    textAlign: "center",
    color: "#fff",
  },
  menu: {
    fontSize: 40,
    color: "#fff",
  },
  content: {
    flex: 1,
  },
  readText: {
    fontFamily: "Mochi",
    fontSize: 36,
    color: "#fff",
    textAlign: "center",
  },
  readTextSpacing: {
    height: 20,
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.2)", // translucent dark blue
    borderColor: "white",
    borderWidth: 1,
    borderRadius: 50, // makes it pill-shaped
    paddingVertical: 1,
    paddingHorizontal: 10,
    marginRight: 10,
  },
  diamondIcon: {
    width: 10,
    height: 10,
    marginRight: 8,
  },
  amountText: {
    color: "#ffffffff",
    fontSize: 10,
    fontFamily: "Mochi",
  },
  bookTitle: {
    fontSize: 20,
    fontFamily: "Mochi",
    color: "#000",
    marginTop: 10,
  },
  coverImage: {
    marginTop: 45,
    width: 260,
    height: 160,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: "#60B5FF",
    marginBottom: 20,
  },
  detailContainer: {
    flexDirection: "column",
    marginVertical: 20,
    width: "60%",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  detailIcon: {
    marginRight: 10,
  },
  detailTextContainer: {
    flexDirection: "column",
  },
  detailTitle: {
    fontFamily: "PoppinsBold",
    fontSize: 12,
    color: "#555",
  },
  detailText: {
    fontFamily: "Poppins",
    fontSize: 12,
    color: "#000",
  },
  button: {
    marginTop: 50,
    width: 140,
    height: 40,
    backgroundColor: "#FF9149",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderColor: "#000",
    borderWidth: 1.5,
  },
  buttonText: {
    color: "#000000ff",
    fontSize: 14,
    fontFamily: "PoppinsBold",
  },
});
