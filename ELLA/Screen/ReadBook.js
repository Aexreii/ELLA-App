import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  BackHandler,
  Animated,
} from "react-native";
import { Image } from "expo-image";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { useMusic } from "../hook/MusicContext";
import { useScale } from "../utils/scaling";
import api from "../utils/api";

//wag ilipat
import {
  BACKEND_URL,
  RECORDING_OPTIONS,
  transcribeSentence,
  pronounceWord,
} from "../utils/speechHelper";

import Ellalert, { useEllAlert } from "../components/Alerts";

// ── Assets ────────────────────────────────────────────────
const CHARACTER_ASSETS = {
  pink: require("../assets/animations/run_pink.gif"),
  dino: require("../assets/animations/run_dino.gif"),
  owl: require("../assets/animations/run_owl.gif"),
};
const CHARACTER_KEYS = Object.keys(CHARACTER_ASSETS);

// Feedback messages
const CORRECT_MESSAGES = [
  "Spot on! Well read!",
  "Amazing! Keep it up!",
  "Great job! Perfect!",
  "You're a reading star!",
];
const WRONG_MESSAGES = [
  "Almost there! Try again.",
  "Nearly perfect! Once more?",
  "Give it another shot!",
  "Let's try that one again.",
];

// In ReadBook.jsx — replace alignWords()
function alignWords(originalWords, spokenWords) {
  const cleanSpoken = spokenWords.map((w) =>
    w.toLowerCase().replace(/[^\w]/g, ""),
  );
  const results = [];
  let spokenIndex = 0;

  for (let i = 0; i < originalWords.length; i++) {
    const original = originalWords[i].toLowerCase().replace(/[^\w]/g, "");

    // Look ahead in spoken words (up to 3 positions) for a match
    let found = false;
    for (let j = 0; j < 3; j++) {
      if (cleanSpoken[spokenIndex + j] === original) {
        results.push("correct");
        spokenIndex += j + 1;
        found = true;
        break;
      }
    }

    if (!found) {
      results.push("wrong");
    }
  }
  return results;
}

function cleanWord(word) {
  return word.toLowerCase().replace(/[^\w]/g, "");
}

// ── Serialization Helpers ─────────────────────────────────
function flattenWordResults(wordResults) {
  // wordResults is [[null, 'correct'], [null, null], ...]
  // we want to store it as an object { s0_w1: 'correct', ... }
  const flat = {};
  wordResults.forEach((sentence, sIdx) => {
    sentence.forEach((res, wIdx) => {
      if (res) flat[`s${sIdx}_w${wIdx}`] = res;
    });
  });
  return flat;
}

function unflattenWordResults(flatObj, book) {
  const restored = book.contents.map((s) => s.split(" ").map(() => null));
  if (!flatObj) return restored;
  Object.entries(flatObj).forEach(([key, val]) => {
    const [sPart, wPart] = key.split("_");
    const sIdx = parseInt(sPart.substring(1));
    const wIdx = parseInt(wPart.substring(1));
    if (restored[sIdx] !== undefined && restored[sIdx][wIdx] !== undefined) {
      restored[sIdx][wIdx] = val;
    }
  });
  return restored;
}

export default function ReadBook({ route, navigation }) {
  const { book, currUser } = route.params;
  const { pauseMusic, resumeMusic, soundVolume, ttsVoice } = useMusic();
  const { scale, verticalScale } = useScale();

  const { alertConfig, showAlert, closeAlert } = useEllAlert();

  const avatarSource = useRef(
    currUser?.character === "custom" || !CHARACTER_ASSETS[currUser?.character]
      ? CHARACTER_ASSETS[
          CHARACTER_KEYS[Math.floor(Math.random() * CHARACTER_KEYS.length)]
        ]
      : CHARACTER_ASSETS[currUser.character],
  ).current;

  const [currentSentence, setCurrentSentence] = useState(0);
  const [progressLoaded, setProgressLoaded] = useState(false);

  const [wordResults, setWordResults] = useState(() =>
    book.contents.map((s) => s.split(" ").map(() => null)),
  );

  const [activeWordIndex, setActiveWordIndex] = useState(0);
  const [localPoints, setLocalPoints] = useState(currUser?.points ?? 0);
  const [isSaving, setIsSaving] = useState(false);

  // ── Congratulations screen ──────────────────────────────
  const [showCongrats, setShowCongrats] = useState(false);
  const sessionPointsRef = useRef(0);
  const congratsScaleAnim = useRef(new Animated.Value(0)).current;

  const pointsPopAnim = useRef(new Animated.Value(0)).current;
  const [showPointsPop, setShowPointsPop] = useState(false);

  const [feedback, setFeedback] = useState(null);
  const feedbackAnim = useRef(new Animated.Value(0)).current;
  const feedbackTimer = useRef(null);
  const voiceSoundRef = useRef(null);

  // ── Avatar slide-up animation ──────────────────────────
  const avatarSlideAnim = useRef(new Animated.Value(0)).current;
  const avatarVisibleRef = useRef(false);
  const avatarHideTimer = useRef(null);

  const [micActive, setMicActive] = useState(false);
  const recordingRef = useRef(null);
  const recordingTimerRef = useRef(null);

  const sessionIdRef = useRef(null);
  const sessionStartRef = useRef(Date.now());
  const wordTapCountsRef = useRef({});
  const sentencesReadRef = useRef(0);
  const awardedSentencesRef = useRef({});
  const recordingsCountRef = useRef(0);

  const sentenceWords = book.contents[currentSentence].split(" ");
  const currentWordResults = wordResults[currentSentence];
  const allWordsCorrect = currentWordResults.every((r) => r === "correct");
  const isLastSentence = currentSentence === book.contents.length - 1;
  const [isEvaluating, setIsEvaluating] = useState(false);

  const isStoppingRef = useRef(false);

  // ─────────────────────────────────────────────────────────
  // 1. Mount: load saved progress then create session
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    pauseMusic();
    loadProgressAndCreateSession();
    return () => {
      voiceSoundRef.current?.unloadAsync();
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
      if (avatarHideTimer.current) clearTimeout(avatarHideTimer.current);
    };
  }, []);

  const loadProgressAndCreateSession = async () => {
    try {
      // Use backend API instead of direct Firestore
      const response = await api.reading.startSession(book.id);
      
      if (response.success) {
        sessionIdRef.current = response.sessionId;
        const saved = response.userProgress;
        
        const savedSentence = saved.currentSentence ?? 0;
        const savedFlat = saved.wordResults ?? null;

        if (savedSentence > 0) {
          setCurrentSentence(savedSentence);
          sentencesReadRef.current = savedSentence;
        }

        if (savedFlat) {
          const restored = unflattenWordResults(savedFlat, book);
          restored.forEach((row, sIndex) => {
            if (row.every((r) => r === "correct")) {
              awardedSentencesRef.current[sIndex] = true;
            }
          });
          // For results in the current session, we reset to null so they can earn points again
          const reset = restored.map((row) => row.map(() => null));
          setWordResults(reset);
        }
      }

      setProgressLoaded(true);
      sessionStartRef.current = Date.now();
    } catch (error) {
      console.log("loadProgress error:", error);
      setProgressLoaded(true);
    }
  };

  useEffect(() => {
    setActiveWordIndex(0);
  }, [currentSentence]);

  // ─────────────────────────────────────────────────────────
  // 2. Save & exit
  // ─────────────────────────────────────────────────────────
  const currentSentenceRef = useRef(currentSentence);
  useEffect(() => {
    currentSentenceRef.current = currentSentence;
  }, [currentSentence]);

  const wordResultsRef = useRef(wordResults);
  useEffect(() => {
    wordResultsRef.current = wordResults;
  }, [wordResults]);

  const saveAndExit = async (isFinished = false) => {
    setIsSaving(true);
    try {
      const elapsedSeconds = Math.floor(
        (Date.now() - sessionStartRef.current) / 1000,
      );
      const snapshotSentence = currentSentenceRef.current;
      
      const serializedWordResults = flattenWordResults(
        wordResultsRef.current.map((sentence) =>
          sentence.map((r) => (r === "orange" ? null : r)),
        ),
      );

      // Use backend API instead of direct Firestore
      await api.reading.saveSession({
        bookId: book.id,
        sessionId: sessionIdRef.current,
        currentSentence: snapshotSentence,
        wordResults: serializedWordResults,
        sentencesRead: sentencesReadRef.current,
        elapsedSeconds,
        isFinished,
      });

    } catch (error) {
      console.log("saveAndExit error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Back button ──────────────────────────────────────────
  useEffect(() => {
    const backAction = () => {
      handleBackPress();
      return true;
    };
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );
    return () => backHandler.remove();
  }, [currentSentence, wordResults]);

  const handleBackPress = () => {
    showAlert({
      type: "confirm",
      title: "Exit Reading?",
      message: "Your progress will be saved automatically.",
      buttons: [
        { text: "Keep Reading", style: "cancel" },
        {
          text: "Exit",
          style: "destructive",
          onPress: async () => {
            await saveAndExit();
            resumeMusic();
            navigation.goBack();
          },
        },
      ],
    });
  };

  // ── Avatar slide-up on feedback ──────────────────────────
  const showAvatar = () => {
    if (avatarVisibleRef.current) {
      if (avatarHideTimer.current) clearTimeout(avatarHideTimer.current);
    } else {
      avatarVisibleRef.current = true;
      Animated.spring(avatarSlideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }

    avatarHideTimer.current = setTimeout(() => {
      avatarVisibleRef.current = false;
      Animated.timing(avatarSlideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, 4000);
  };

  // ── Avatar feedback + voice ────────────────────────────
  const showFeedback = async (type) => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);

    const messages = type === "correct" ? CORRECT_MESSAGES : WRONG_MESSAGES;
    const msgIndex = Math.floor(Math.random() * messages.length);
    setFeedback({ message: messages[msgIndex], type });

    showAvatar();

    feedbackAnim.setValue(0);
    Animated.spring(feedbackAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 120,
      friction: 7,
    }).start();

    try {
      if (voiceSoundRef.current) {
        await voiceSoundRef.current.unloadAsync();
      }
      const soundFile =
        type === "correct"
          ? require("../assets/sounds/gjob.mp3")
          : require("../assets/sounds/tagain.mp3");
      const { sound } = await Audio.Sound.createAsync(soundFile);
      voiceSoundRef.current = sound;
      await sound.setVolumeAsync(soundVolume);
      await sound.playAsync();
    } catch (e) {
      console.log("Feedback sound error:", e);
    }

    feedbackTimer.current = setTimeout(() => {
      Animated.timing(feedbackAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setFeedback(null));
    }, 3500);
  };

  // ── Points popup ───────────────────────────────────────
  const triggerPointsPop = (pts) => {
    setShowPointsPop(true);
    pointsPopAnim.setValue(0);
    Animated.sequence([
      Animated.spring(pointsPopAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 150,
        friction: 6,
      }),
      Animated.delay(1200),
      Animated.timing(pointsPopAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setShowPointsPop(false));
  };

  const awardPoints = async (sentenceIndex, points = 10) => {
    const alreadyAwarded = awardedSentencesRef.current[sentenceIndex] === true;
    const finalPoints = alreadyAwarded
      ? Math.max(10, Math.floor(points / 2))
      : points;

    awardedSentencesRef.current[sentenceIndex] = true;

    setLocalPoints((p) => p + finalPoints);
    sessionPointsRef.current += finalPoints; // track session total
    triggerPointsPop(finalPoints);
    try {
      // Use backend API instead of direct Firestore
      await api.reading.awardPoints(sessionIdRef.current, finalPoints);
    } catch (e) {
      console.log("Points update error:", e);
    }
  };

  // ─────────────────────────────────────────────────────────
  // 6. Mark correct
  // ─────────────────────────────────────────────────────────
  const handleMarkCorrect = () => {
    const word = sentenceWords[activeWordIndex];
    
    // Use backend API for word event
    api.reading.recordWordEvent(book.id, sessionIdRef.current, word, 1)
      .catch(e => console.log("word event error:", e));

    const updatedResults = wordResults[currentSentence].map((r, i) =>
      i === activeWordIndex ? "correct" : r,
    );
    const nowAllCorrect = updatedResults.every((r) => r === "correct");

    setWordResults((prev) => {
      const next = prev.map((s) => [...s]);
      next[currentSentence] = updatedResults;
      return next;
    });

    if (nowAllCorrect) {
      awardPoints(currentSentence);
    }

    showFeedback("correct");

    let next = activeWordIndex + 1;
    while (next < sentenceWords.length && updatedResults[next] === "correct") {
      next++;
    }
    if (next < sentenceWords.length) {
      setActiveWordIndex(next);
    }
  };

  // ─────────────────────────────────────────────────────────
  // 7. Mark wrong
  // ─────────────────────────────────────────────────────────
  const handleMarkWrong = () => {
    const word = sentenceWords[activeWordIndex];
    
    // Use backend API for word event
    api.reading.recordWordEvent(book.id, sessionIdRef.current, word, 1)
      .catch(e => console.log("word event error:", e));

    setWordResults((prev) => {
      const next = prev.map((s) => [...s]);
      next[currentSentence][activeWordIndex] = "wrong";
      return next;
    });

    showFeedback("wrong");
  };

  // ─────────────────────────────────────────────────────────
  // 8. Word press
  // ─────────────────────────────────────────────────────────
  const handleWordPress = async (word, index) => {
    setActiveWordIndex(index);
    try {
      await pronounceWord(word, ttsVoice);
      
      // Update tap count
      const key = cleanWord(word);
      wordTapCountsRef.current[key] = (wordTapCountsRef.current[key] ?? 0) + 1;
      
      // Also record in backend
      api.reading.recordWordEvent(book.id, sessionIdRef.current, word, 1)
        .catch(() => {});

      setWordResults((prev) => {
        const next = prev.map((s) => [...s]);
        const currentRes = next[currentSentence][index];
        if (currentRes !== "correct") {
          next[currentSentence][index] = "orange";
        }
        return next;
      });
    } catch (e) {
      console.log("TTS error:", e);
    }
  };

  // ─────────────────────────────────────────────────────────
  // 9. Next / Prev
  // ─────────────────────────────────────────────────────────
  const handleNext = async () => {
    if (!allWordsCorrect) return;

    sentencesReadRef.current = Math.max(
      sentencesReadRef.current,
      currentSentence + 1,
    );

    if (!isLastSentence) {
      setCurrentSentence((prev) => prev + 1);
    } else {
      // Save first, then show the congratulations screen
      await saveAndExit(true);
      // Animate the card in
      congratsScaleAnim.setValue(0);
      Animated.spring(congratsScaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }).start();
      setShowCongrats(true);
    }
  };

  const handlePrev = () => {
    if (currentSentence > 0) setCurrentSentence((prev) => prev - 1);
  };

  // ─────────────────────────────────────────────────────────
  // 10. Mic
  // ─────────────────────────────────────────────────────────
  const handleMicPress = async () => {
    if (micActive) {
      if (recordingTimerRef.current) {
        clearTimeout(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setMicActive(false);
      await stopAndEvaluate();
    } else {
      isStoppingRef.current = false;
      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== "granted") {
          showAlert({
            type: "warning",
            title: "Permission Denied",
            message: "Microphone permission is required.",
          });
          return;
        }
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording } =
          await Audio.Recording.createAsync(RECORDING_OPTIONS);
        recordingRef.current = recording;
        setMicActive(true);

        recordingTimerRef.current = setTimeout(async () => {
          recordingTimerRef.current = null;
          if (recordingRef.current) {
            setMicActive(false);
            setIsEvaluating(true);
            await stopAndEvaluate();
            setIsEvaluating(false);
          }
        }, 5000);
      } catch (error) {
        showAlert({
          type: "error",
          title: "Error",
          message: "Failed to start recording.",
        });
      }
    }
  };

  const stopAndEvaluate = async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    setIsEvaluating(true);
    try {
      if (!recordingRef.current) {
        console.log("[mic] No active recording to stop");
        return;
      }

      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      const currentResults = wordResultsRef.current[currentSentence];
      const remainingWords = sentenceWords.filter(
        (_, i) => currentResults[i] !== "correct",
      );

      const result = await transcribeSentence(uri, remainingWords);

      if (!result.success || !result.transcript) {
        showAlert({
          type: "warning",
          title: "Could not hear you",
          message: "Please try again.",
        });
        return;
      }

      const spokenWords = result.transcript.trim().split(/\s+/);
      const remainingResults = alignWords(remainingWords, spokenWords);

      let remainingIndex = 0;
      const mergedResults = currentResults.map((existing) => {
        if (existing === "correct") return "correct";
        return remainingResults[remainingIndex++] ?? "wrong";
      });

      setWordResults((prev) => {
        const next = prev.map((s) => [...s]);
        next[currentSentence] = mergedResults;
        return next;
      });

      // Use backend API to record attempt
      if (sessionIdRef.current) {
        recordingsCountRef.current += 1;
        api.reading.recordAttempt(sessionIdRef.current).catch(() => {});
      }

      const allCorrect = mergedResults.every((r) => r === "correct");
      if (allCorrect) {
        const confidence = result.confidence ?? 1.0;
        const pointsEarned = Math.max(1, Math.floor(confidence * 5));
        awardPoints(currentSentence, pointsEarned);
        showFeedback("correct");
      } else {
        const firstWrong = mergedResults.findIndex((r) => r === "wrong");
        if (firstWrong !== -1) setActiveWordIndex(firstWrong);
        showFeedback("wrong");
      }
    } catch (error) {
      showAlert({
        type: "error",
        title: "Error",
        message: "Could not evaluate. Please try again.",
      });
      setMicActive(false);
      recordingRef.current = null;
    } finally {
      setIsEvaluating(false);
      isStoppingRef.current = false;
    }
  };

  const handleCongratsDone = () => {
    resumeMusic();
    navigation.replace("HomeScreen");
  };

  if (!progressLoaded) {
    return (
      <View style={s.loader}>
        <ActivityIndicator size="large" color="#60B5FF" />
      </View>
    );
  }

  const s = getStyles(scale, verticalScale);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backButton} onPress={handleBackPress}>
          <Ionicons name="arrow-back" size={scale(24)} color="#333" />
        </TouchableOpacity>
        <View style={s.progressTrack}>
          <View
            style={[
              s.progressBar,
              { width: `${((currentSentence + 1) / book.contents.length) * 100}%` },
            ]}
          />
        </View>
        <View style={s.badge}>
          <Image
            source={require("../assets/icons/diamond.png")}
            style={s.diamond}
          />
          <Text style={s.badgeText}>{localPoints}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <View style={s.sentenceCard}>
          <View style={s.wordsContainer}>
            {sentenceWords.map((word, i) => {
              const res = currentWordResults[i];
              const isActive = i === activeWordIndex;
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => handleWordPress(word, i)}
                  style={[
                    s.wordWrapper,
                    isActive && s.wordWrapperActive,
                    res === "correct" && s.wordWrapperCorrect,
                    res === "wrong" && s.wordWrapperWrong,
                    res === "orange" && s.wordWrapperTapped,
                  ]}
                >
                  <Text
                    style={[
                      s.wordText,
                      isActive && s.wordTextActive,
                      res === "correct" && s.wordTextCorrect,
                    ]}
                  >
                    {word}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Mic and Controls */}
      <View style={s.controls}>
        <TouchableOpacity
          style={[s.navBtn, currentSentence === 0 && { opacity: 0.3 }]}
          disabled={currentSentence === 0}
          onPress={handlePrev}
        >
          <Ionicons name="chevron-back" size={scale(32)} color="#60B5FF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.micBtn, micActive && s.micBtnActive]}
          onPress={handleMicPress}
          disabled={isEvaluating}
        >
          {isEvaluating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons
              name={micActive ? "stop" : "mic"}
              size={scale(40)}
              color="#fff"
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.navBtn, !allWordsCorrect && { opacity: 0.3 }]}
          disabled={!allWordsCorrect}
          onPress={handleNext}
        >
          <Ionicons
            name={isLastSentence ? "checkmark-done" : "chevron-forward"}
            size={scale(32)}
            color={allWordsCorrect ? "#4CAF50" : "#60B5FF"}
          />
        </TouchableOpacity>
      </View>

      <View style={s.manualControls}>
        <TouchableOpacity style={s.manualBtn} onPress={handleMarkWrong}>
          <Ionicons name="close-circle" size={scale(24)} color="#E53935" />
          <Text style={s.manualText}>Mark Wrong</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.manualBtn} onPress={handleMarkCorrect}>
          <Ionicons name="checkmark-circle" size={scale(24)} color="#4CAF50" />
          <Text style={s.manualText}>Mark Correct</Text>
        </TouchableOpacity>
      </View>

      {/* Points Pop */}
      {showPointsPop && (
        <Animated.View
          style={[
            s.pointsPop,
            {
              opacity: pointsPopAnim,
              transform: [
                {
                  scale: pointsPopAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1.2],
                  }),
                },
              ],
            },
          ]}
        >
          <Image
            source={require("../assets/icons/diamond.png")}
            style={s.popDiamond}
          />
          <Text style={s.popText}>+{sessionPointsRef.current} pts!</Text>
        </Animated.View>
      )}

      {/* ── Avatar: slides up only when feedback is active ── */}
      <View style={s.avatarSlideContainer} pointerEvents="none">
        <Animated.View
          style={[
            s.avatarSlideContent,
            {
              transform: [
                {
                  translateY: avatarSlideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [verticalScale(300), 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Speech Bubble */}
          {feedback && (
            <Animated.View
              style={[
                s.bubble,
                {
                  opacity: feedbackAnim,
                  transform: [
                    { scale: feedbackAnim },
                    {
                      translateY: feedbackAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View
                style={[
                  s.bubbleContent,
                  feedback.type === "correct" ? s.bubbleCorrect : s.bubbleWrong,
                ]}
              >
                <Text style={s.speechText}>{feedback.message}</Text>
              </View>
              <View
                style={[
                  s.bubbleTail,
                  feedback.type === "correct"
                    ? s.bubbleTailCorrect
                    : s.bubbleTailWrong,
                ]}
              />
            </Animated.View>
          )}

          <Image
            source={avatarSource}
            style={s.floatingAvatar}
            contentFit="contain"
          />
        </Animated.View>
      </View>

      {/* Congratulations Modal */}
      <Modal visible={showCongrats} transparent animationType="fade">
        <View style={s.congratsOverlay}>
          <Animated.View
            style={[
              s.congratsCard,
              { transform: [{ scale: congratsScaleAnim }] },
            ]}
          >
            <Text style={s.congratsTitle}>Amazing Reading!</Text>
            <Image
              source={require("../assets/animations/jump_owl.gif")}
              style={s.congratsGif}
            />
            <View style={s.congratsPointsRow}>
              <Image
                source={require("../assets/icons/diamond.png")}
                style={s.congratsDiamond}
              />
              <Text style={s.congratsPointsText}>
                You earned {sessionPointsRef.current} points!
              </Text>
            </View>
            <TouchableOpacity
              style={s.congratsDoneBtn}
              onPress={handleCongratsDone}
            >
              <Text style={s.congratsDoneText}>Great!</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      <Ellalert config={alertConfig} onClose={closeAlert} />
    </View>
  );
}

const getStyles = (scale, verticalScale) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff" },
    loader: { flex: 1, justifyContent: "center", alignItems: "center" },

    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingTop: verticalScale(50),
      paddingHorizontal: scale(20),
      paddingBottom: verticalScale(10),
      gap: scale(15),
    },
    backButton: { width: scale(40), height: scale(40), justifyContent: "center" },
    progressTrack: {
      flex: 1,
      height: verticalScale(12),
      backgroundColor: "#E0E0E0",
      borderRadius: scale(6),
      overflow: "hidden",
    },
    progressBar: { height: "100%", backgroundColor: "#60B5FF" },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#F5F5F5",
      paddingHorizontal: scale(10),
      paddingVertical: verticalScale(5),
      borderRadius: scale(20),
    },
    diamond: { width: scale(20), height: scale(20), marginRight: scale(4) },
    badgeText: {
      fontFamily: "Poppins",
      fontSize: scale(14),
      fontWeight: "bold",
      color: "#333",
    },

    content: {
      flexGrow: 1,
      justifyContent: "center",
      paddingHorizontal: scale(20),
    },
    sentenceCard: {
      backgroundColor: "#F9FBFF",
      borderRadius: scale(20),
      padding: scale(24),
      minHeight: verticalScale(200),
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "#EAF2FF",
    },
    wordsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: scale(10),
    },
    wordWrapper: {
      paddingHorizontal: scale(8),
      paddingVertical: verticalScale(4),
      borderRadius: scale(8),
      borderBottomWidth: 3,
      borderBottomColor: "transparent",
    },
    wordWrapperActive: { borderBottomColor: "#60B5FF" },
    wordWrapperCorrect: { backgroundColor: "#E8F5E9", borderBottomColor: "#4CAF50" },
    wordWrapperWrong: { backgroundColor: "#FFEBEE", borderBottomColor: "#E53935" },
    wordWrapperTapped: { borderBottomColor: "#FF9149" },
    wordText: { fontFamily: "Poppins", fontSize: scale(24), color: "#333" },
    wordTextActive: { color: "#60B5FF", fontWeight: "bold" },
    wordTextCorrect: { color: "#2E7D32" },

    controls: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: scale(40),
      paddingBottom: verticalScale(30),
    },
    micBtn: {
      width: scale(80),
      height: scale(80),
      borderRadius: scale(40),
      backgroundColor: "#60B5FF",
      justifyContent: "center",
      alignItems: "center",
      elevation: 4,
    },
    micBtnActive: { backgroundColor: "#E53935" },
    navBtn: { width: scale(60), height: scale(60), justifyContent: "center", alignItems: "center" },

    manualControls: {
      flexDirection: "row",
      justifyContent: "center",
      gap: scale(30),
      paddingBottom: verticalScale(40),
    },
    manualBtn: { alignItems: "center", gap: verticalScale(4) },
    manualText: { fontFamily: "Poppins", fontSize: scale(10), color: "#888" },

    pointsPop: {
      position: "absolute",
      top: "20%",
      alignSelf: "center",
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.9)",
      paddingHorizontal: scale(20),
      paddingVertical: verticalScale(10),
      borderRadius: scale(30),
      elevation: 5,
    },
    popDiamond: { width: scale(24), height: scale(24), marginRight: scale(8) },
    popText: {
      fontFamily: "PoppinsBold",
      fontSize: scale(20),
      color: "#FFD700",
    },

    avatarSlideContainer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      alignItems: "center",
      height: verticalScale(350),
      justifyContent: "flex-end",
    },
    avatarSlideContent: { alignItems: "center" },
    floatingAvatar: {
      width: scale(150),
      height: scale(150),
      marginBottom: verticalScale(-20),
    },

    bubble: { alignItems: "center", marginBottom: verticalScale(10) },
    bubbleContent: {
      paddingHorizontal: scale(20),
      paddingVertical: verticalScale(12),
      borderRadius: scale(20),
      maxWidth: scale(250),
    },
    bubbleCorrect: { backgroundColor: "#4CAF50" },
    bubbleWrong: { backgroundColor: "#E53935" },
    speechText: {
      fontFamily: "PoppinsBold",
      fontSize: scale(14),
      color: "#fff",
      textAlign: "center",
    },
    bubbleTail: {
      width: 0,
      height: 0,
      backgroundColor: "transparent",
      borderStyle: "solid",
      borderLeftWidth: scale(10),
      borderRightWidth: scale(10),
      borderTopWidth: verticalScale(10),
      borderLeftColor: "transparent",
      borderRightColor: "transparent",
      marginTop: verticalScale(-1),
    },
    bubbleTailCorrect: { borderTopColor: "#4CAF50" },
    bubbleTailWrong: { borderTopColor: "#E53935" },

    congratsOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.7)",
      justifyContent: "center",
      alignItems: "center",
    },
    congratsCard: {
      width: "85%",
      backgroundColor: "#fff",
      borderRadius: scale(30),
      padding: scale(30),
      alignItems: "center",
    },
    congratsTitle: {
      fontFamily: "Mochi",
      fontSize: scale(28),
      color: "#FF9149",
      marginBottom: verticalScale(20),
    },
    congratsGif: {
      width: scale(150),
      height: scale(150),
      marginBottom: verticalScale(20),
    },
    congratsPointsRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: verticalScale(30),
    },
    congratsDiamond: { width: scale(30), height: scale(30), marginRight: scale(10) },
    congratsPointsText: {
      fontFamily: "PoppinsBold",
      fontSize: scale(18),
      color: "#333",
    },
    congratsDoneBtn: {
      backgroundColor: "#60B5FF",
      borderRadius: scale(50),
      paddingVertical: verticalScale(12),
      paddingHorizontal: scale(48),
    },
    congratsDoneText: {
      fontFamily: "PixelifySans",
      fontSize: scale(18),
      color: "#fff",
    },
  });
