import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Image as RNImage } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

export default function ReadBook({ route, navigation }) {
  const { book, currUser } = route.params;

  const [currentSentence, setCurrentSentence] = useState(0);
  const [activeWordIndex, setActiveWordIndex] = useState(null);
  const [micActive, setMicActive] = useState(false);

  // Handle word press to enlarge temporarily
  const handleWordPress = (index) => {
    setActiveWordIndex(index);
    setTimeout(() => setActiveWordIndex(null), 1000);
  };

  // Navigation between sentences
  const handleNext = () => {
    if (currentSentence < book.contents.length - 1) {
      setCurrentSentence(currentSentence + 1);
    }
  };

  const handlePrev = () => {
    if (currentSentence > 0) {
      setCurrentSentence(currentSentence - 1);
    }
  };

  const handleMicPress = () => {
    setMicActive(!micActive);
    console.log("Mic is now", !micActive ? "ON" : "OFF");
    // Add speech recognition logic here.
    //Go Vik! Kaya Yan! Lalaban tayo!
  };

  const sentenceWords = book.contents[currentSentence].split(" ");

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={26} color="#fff" />
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>ELLA</Text>
          <Text style={styles.headerSubTitle}>Your English Buddy</Text>
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

      {/* Book Info */}
      <Text style={styles.title}>{book.title}</Text>
      <Text style={styles.writer}>By {book.writer}</Text>

      {/* Cover */}
      <RNImage source={{ uri: book.cover }} style={styles.coverImage} />

      {/* Reading Area */}
      <View style={styles.readerBox}>
        <Text style={styles.readerText}>
          {sentenceWords.map((word, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleWordPress(index)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.word,
                  activeWordIndex === index && styles.wordActive,
                ]}
              >
                {word}{" "}
              </Text>
            </TouchableOpacity>
          ))}
        </Text>

        {/* Progress Indicator */}
        <Text style={styles.progress}>
          {currentSentence + 1} / {book.contents.length}
        </Text>
      </View>

      {/* Navigation Buttons */}
      <View style={styles.navButtons}>
        <TouchableOpacity
          style={[styles.navButton, currentSentence === 0 && styles.disabled]}
          disabled={currentSentence === 0}
          onPress={handlePrev}
        >
          <Ionicons name="arrow-back-circle" size={40} color="#000" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navButton,
            currentSentence === book.contents.length - 1 && styles.disabled,
          ]}
          disabled={currentSentence === book.contents.length - 1}
          onPress={handleNext}
        >
          <Ionicons name="arrow-forward-circle" size={40} color="#000" />
        </TouchableOpacity>
        {/* Microphone Button */}
      </View>
      {/* Microphone Toggle Button */}
      <TouchableOpacity
        style={[styles.micButton, micActive && styles.micButtonActive]}
        onPress={handleMicPress}
      >
        <Ionicons
          name="mic-outline"
          size={28}
          color={micActive ? "#fff" : "#000"}
        />
      </TouchableOpacity>
      <Text style={[styles.micText, micActive && { color: "#000000ff" }]}>
        {micActive ? "Listening..." : "Speak"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
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
    marginBottom: 20,
    backgroundColor: "#60B5FF",
    height: 60,
  },
  headerText: {
    flexDirection: "column",
    flex: 1,
    alignItems: "center",
    marginLeft: 70,
  },
  headerTitle: {
    fontFamily: "PixelifySans",
    fontSize: 24,
    textAlign: "center",
    color: "#fff",
  },
  headerSubTitle: {
    fontFamily: "PixelifySans",
    fontSize: 12,
    textAlign: "center",
    color: "#fff",
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
    borderColor: "white",
    borderWidth: 1,
    borderRadius: 50,
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
    color: "#fff",
    fontSize: 10,
    fontFamily: "Mochi",
  },
  title: {
    fontSize: 24,
    fontFamily: "Mochi",
    color: "#000",
    marginTop: 10,
  },
  writer: {
    fontSize: 12,
    fontFamily: "Poppins",
    fontStyle: "italic",
    color: "#000",
    marginBottom: 10,
  },
  coverImage: {
    width: 260,
    height: 160,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#000",
    marginBottom: 20,
  },
  readerBox: {
    backgroundColor: "#fff",
    width: 300,
    minHeight: 150,
    borderRadius: 15,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
    borderColor: "#FF9149",
    borderWidth: 2,
  },
  readerText: {
    fontSize: 24,
    fontFamily: "Poppins",
    textAlign: "center",
    color: "#000",
    flexWrap: "wrap",
    flexDirection: "row",
  },
  word: {
    fontSize: 24,
    fontFamily: "Poppins",
  },
  wordActive: {
    fontSize: 32,
    color: "#FF9149",
  },
  progress: {
    marginTop: 10,
    fontSize: 12,
    fontFamily: "Poppins",
    color: "#666",
  },
  navButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "60%",
    marginTop: 30,
  },
  navButton: {
    padding: 10,
  },
  disabled: {
    opacity: 0.3,
  },
  micButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ff9249ff",
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 20,
    width: 120,
    height: 50,
  },
  micButtonActive: {
    backgroundColor: "#ff9249c5",
  },
  micText: {
    color: "#000000ff",
    fontSize: 16,
    fontFamily: "Poppins",
    margin: 15,
  },
});
