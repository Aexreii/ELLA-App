import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { Image as RNImage } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { useMusic } from "../hook/MusicContext";
import { useScale } from "../utils/scaling";

export default function ReadBook({ route, navigation }) {
  const { book, currUser } = route.params;
  const { pauseMusic, resumeMusic } = useMusic();
  const { scale, verticalScale } = useScale();

  const [currentSentence, setCurrentSentence] = useState(0);
  const [activeWordIndex, setActiveWordIndex] = useState(null);
  const [micActive, setMicActive] = useState(false);
  const [recordingUri, setRecordingUri] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const recordingRef = useRef(null);
  const soundRef = useRef(null);

  useEffect(() => {
    pauseMusic();
    return () => resumeMusic();
  }, []);

  const handleWordPress = (index) => {
    setActiveWordIndex(index);
    setTimeout(() => setActiveWordIndex(null), 1000);

    //this is the part na maga salita si App.
  };

  const handleNext = () => {
    if (currentSentence < book.contents.length - 1)
      setCurrentSentence(currentSentence + 1);
  };

  const handlePrev = () => {
    if (currentSentence > 0) setCurrentSentence(currentSentence - 1);
  };

  const handleMicPress = async () => {
    if (micActive) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        setRecordingUri(uri);
        recordingRef.current = null;
        setMicActive(false);
      } catch (error) {
        console.log("Error stopping recording:", error);
        Alert.alert("Error", "Failed to stop recording.");
      }
    } else {
      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission Denied",
            "Microphone permission is required.",
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
      } catch (error) {
        console.log("Error starting recording:", error);
        Alert.alert("Error", "Failed to start recording.");
      }
    }
  };

  const handlePlayback = async () => {
    if (!recordingUri) return;
    if (isPlaying) {
      try {
        await soundRef.current.stopAsync();
        setIsPlaying(false);
      } catch (error) {
        console.log("Error stopping playback:", error);
      }
      return;
    }
    try {
      if (soundRef.current) await soundRef.current.unloadAsync();
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
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) setIsPlaying(false);
      });
    } catch (error) {
      console.log("Error playing back audio:", error);
      Alert.alert("Error", "Failed to play recording.");
    }
  };

  const sentenceWords = book.contents[currentSentence].split(" ");
  const s = getStyles(scale, verticalScale);

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
          <Text style={s.headerTitle}>ELLA</Text>
          <Text style={s.headerSubTitle}>Your English Buddy</Text>
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

      <Text style={s.booktitle}>{book.title}</Text>
      <Text style={s.writer}>By {book.writer}</Text>
      <RNImage source={{ uri: book.cover }} style={s.coverImage} />

      <View style={s.readerBox}>
        <ScrollView
          contentContainerStyle={s.readerScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.wordsContainer}>
            {sentenceWords.map((word, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleWordPress(index)}
                activeOpacity={0.7}
              >
                <Text
                  style={[s.word, activeWordIndex === index && s.wordActive]}
                >
                  {word}{" "}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        <Text style={s.progress}>
          {currentSentence + 1} / {book.contents.length}
        </Text>
      </View>

      <View style={s.navButtons}>
        <TouchableOpacity
          style={[s.navButton, currentSentence === 0 && s.disabled]}
          disabled={currentSentence === 0}
          onPress={handlePrev}
        >
          <Ionicons name="arrow-back-circle" size={scale(40)} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            s.navButton,
            currentSentence === book.contents.length - 1 && s.disabled,
          ]}
          disabled={currentSentence === book.contents.length - 1}
          onPress={handleNext}
        >
          <Ionicons name="arrow-forward-circle" size={scale(40)} color="#000" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[s.micButton, micActive && s.micButtonActive]}
        onPress={handleMicPress}
      >
        <Ionicons
          name={micActive ? "stop-circle-outline" : "mic-outline"}
          size={scale(28)}
          color={micActive ? "#fff" : "#000"}
        />
      </TouchableOpacity>
      <Text style={[s.micText, micActive && { color: "#000" }]}>
        {micActive ? "Listening..." : "Speak"}
      </Text>

      {recordingUri && (
        <TouchableOpacity
          style={[s.playbackButton, isPlaying && s.playbackButtonActive]}
          onPress={handlePlayback}
        >
          <Ionicons
            name={isPlaying ? "stop-outline" : "play-outline"}
            size={scale(22)}
            color="#fff"
          />
          <Text style={s.playbackText}>
            {isPlaying ? "Stop" : "Play Recording"}
          </Text>
        </TouchableOpacity>
      )}
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
      marginBottom: verticalScale(20),
      backgroundColor: "#60B5FF",
      height: verticalScale(60),
    },
    headerText: {
      flexDirection: "column",
      flex: 1,
      alignItems: "center",
      marginLeft: scale(70),
    },
    headerTitle: {
      fontFamily: "PixelifySans",
      fontSize: scale(24),
      textAlign: "center",
      color: "#fff",
    },
    headerSubTitle: {
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
    booktitle: {
      fontSize: scale(20),
      fontFamily: "Mochi",
      color: "#000",
      marginTop: verticalScale(10),
    },
    writer: {
      fontSize: scale(12),
      fontFamily: "Poppins",
      fontStyle: "italic",
      color: "#000",
      marginBottom: verticalScale(10),
    },
    coverImage: {
      width: scale(260),
      height: verticalScale(160),
      borderRadius: scale(10),
      borderWidth: 2,
      borderColor: "#000",
      marginBottom: verticalScale(20),
    },
    readerBox: {
      backgroundColor: "#fff",
      width: scale(300),
      height: verticalScale(160),
      borderRadius: scale(15),
      padding: scale(15),
      borderColor: "#FF9149",
      borderWidth: 2,
      alignItems: "center",
    },
    readerScrollContent: {
      flexGrow: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    wordsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
    },
    word: { fontSize: scale(18), fontFamily: "Poppins", color: "#000" },
    wordActive: {
      fontSize: scale(18),
      color: "#FF9149",
      fontFamily: "PoppinsBold",
    },
    progress: {
      marginTop: verticalScale(8),
      fontSize: scale(12),
      fontFamily: "Poppins",
      color: "#666",
    },
    navButtons: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: "60%",
      marginTop: verticalScale(20),
    },
    navButton: { padding: scale(10) },
    disabled: { opacity: 0.3 },
    micButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#ff9249ff",
      borderRadius: scale(25),
      paddingVertical: verticalScale(10),
      paddingHorizontal: scale(20),
      marginTop: verticalScale(20),
      width: scale(120),
      height: verticalScale(50),
    },
    micButtonActive: { backgroundColor: "#e05555" },
    micText: {
      color: "#000",
      fontSize: scale(16),
      fontFamily: "Poppins",
      margin: scale(15),
    },
    playbackButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#60B5FF",
      borderRadius: scale(25),
      paddingVertical: verticalScale(10),
      paddingHorizontal: scale(20),
      width: scale(160),
      height: verticalScale(50),
      gap: scale(8),
    },
    playbackButtonActive: { backgroundColor: "#3a8fd4" },
    playbackText: { color: "#fff", fontSize: scale(15), fontFamily: "Poppins" },
  });
