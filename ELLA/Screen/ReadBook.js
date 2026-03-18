import React, { useState, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Image as RNImage } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";

export default function ReadBook({ route, navigation }) {
  const { book, currUser } = route.params;

  const [currentSentence, setCurrentSentence] = useState(0);
  const [activeWordIndex, setActiveWordIndex] = useState(null);
  const [micActive, setMicActive] = useState(false);
  const [recordingUri, setRecordingUri] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const recordingRef = useRef(null);
  const soundRef = useRef(null);

  const handleWordPress = (index) => {
    setActiveWordIndex(index);
    setTimeout(() => setActiveWordIndex(null), 1000);
  };

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

  const handleMicPress = async () => {
    if (micActive) {
      // --- STOP RECORDING ---
      try {
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        setRecordingUri(uri);
        recordingRef.current = null;
        setMicActive(false);
        console.log("Recording saved to:", uri);
      } catch (error) {
        console.log("Error stopping recording:", error);
        Alert.alert("Error", "Failed to stop recording.");
      }
    } else {
      // --- START RECORDING ---
      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission Denied",
            "Microphone permission is required to record audio.",
          );
          return;
        }

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY,
        );

        recordingRef.current = recording;
        setMicActive(true);
        console.log("Recording started");
      } catch (error) {
        console.log("Error starting recording:", error);
        Alert.alert("Error", "Failed to start recording.");
      }
    }
  };

  const handlePlayback = async () => {
    if (!recordingUri) return;

    if (isPlaying) {
      // --- STOP PLAYBACK ---
      try {
        await soundRef.current.stopAsync();
        setIsPlaying(false);
      } catch (error) {
        console.log("Error stopping playback:", error);
      }
      return;
    }

    // --- START PLAYBACK ---
    try {
      // Unload previous sound if any
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: recordingUri },
        { shouldPlay: true },
      );

      soundRef.current = sound;
      setIsPlaying(true);

      // Auto-reset when playback finishes
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (error) {
      console.log("Error playing back audio:", error);
      Alert.alert("Error", "Failed to play recording.");
    }
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
      <Text style={styles.booktitle}>{book.title}</Text>
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
      </View>

      {/* Microphone Toggle Button */}
      <TouchableOpacity
        style={[styles.micButton, micActive && styles.micButtonActive]}
        onPress={handleMicPress}
      >
        <Ionicons
          name={micActive ? "stop-circle-outline" : "mic-outline"}
          size={28}
          color={micActive ? "#fff" : "#000"}
        />
      </TouchableOpacity>
      <Text style={[styles.micText, micActive && { color: "#000000ff" }]}>
        {micActive ? "Listening..." : "Speak"}
      </Text>

      {/* Playback Button — shown only after a recording exists */}
      {recordingUri && (
        <TouchableOpacity
          style={[
            styles.playbackButton,
            isPlaying && styles.playbackButtonActive,
          ]}
          onPress={handlePlayback}
        >
          <Ionicons
            name={isPlaying ? "stop-outline" : "play-outline"}
            size={22}
            color="#fff"
          />
          <Text style={styles.playbackText}>
            {isPlaying ? "Stop" : "Play Recording"}
          </Text>
        </TouchableOpacity>
      )}
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
  booktitle: {
    fontSize: 20,
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
    minHeight: 200,
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
    fontSize: 20,
    fontFamily: "Poppins",
  },
  wordActive: {
    fontSize: 28,
    fontWeight: "bold",
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
    backgroundColor: "#e05555",
  },
  micText: {
    color: "#000000ff",
    fontSize: 16,
    fontFamily: "Poppins",
    margin: 15,
  },
  playbackButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#60B5FF",
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 20,
    width: 160,
    height: 50,
    gap: 8,
  },
  playbackButtonActive: {
    backgroundColor: "#3a8fd4",
  },
  playbackText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Poppins",
  },
});
