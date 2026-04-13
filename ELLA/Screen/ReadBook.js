import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  BackHandler,
  Animated,
} from "react-native";
import { Image as RNImage } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { useMusic } from "../hook/MusicContext";
import { useScale } from "../utils/scaling";
import { auth } from "../firebase";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  increment,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

import {
  BACKEND_URL,
  RECORDING_OPTIONS,
  transcribeSentence,
  pronounceWord,
} from "../utils/speechHelper";

// ─────────────────────────────────────────────────────────────
// Feedback messages
// ─────────────────────────────────────────────────────────────
const CORRECT_MESSAGES = [
  "Good job!",
  "That's right!",
  "Well done!",
  "Keep it up!",
  "Excellent!",
  "Perfect!",
];
const WRONG_MESSAGES = [
  "Try again!",
  "Almost there!",
  "Give it another go!",
  "Don't give up!",
  "Try once more!",
];

const VOICE_FILES = {
  correct_0: require("../assets/sounds/gjob.mp3"),
  correct_2: require("../assets/sounds/gjob.mp3"),
  correct_4: require("../assets/sounds/gjob.mp3"),
  wrong_0: require("../assets/sounds/tagain.mp3"),
  wrong_1: require("../assets/sounds/tagain.mp3"),
  wrong_2: require("../assets/sounds/tagain.mp3"),
  wrong_3: require("../assets/sounds/tagain.mp3"),
  wrong_4: require("../assets/sounds/tagain.mp3"),
};

// Aligns spoken words to expected words using dynamic programming
function alignWords(expectedWords, spokenWords) {
  const exp = expectedWords.map(cleanWord);
  const spk = spokenWords.map(cleanWord).filter(Boolean);

  const m = exp.length;
  const n = spk.length;

  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (exp[i - 1] === spk[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const matched = new Array(m).fill(false);
  let i = m,
    j = n;
  while (i > 0 && j > 0) {
    if (exp[i - 1] === spk[j - 1]) {
      matched[i - 1] = true;
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return matched.map((hit) => (hit ? "correct" : "wrong"));
}

function cleanWord(w) {
  return w.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

const ROW_SEP = "||";

function flattenWordResults(wordResults) {
  return wordResults.reduce((acc, row, i) => {
    if (i > 0) acc.push(ROW_SEP);
    return acc.concat(row.map((r) => r ?? "null"));
  }, []);
}

function unflattenWordResults(flat, book) {
  const rows = [];
  let current = [];
  for (const val of flat) {
    if (val === ROW_SEP) {
      rows.push(current);
      current = [];
    } else {
      current.push(val === "null" ? null : val);
    }
  }
  rows.push(current);

  return book.contents.map((sentence, sIndex) => {
    const words = sentence.split(" ");
    const savedRow = rows[sIndex];
    if (!savedRow || savedRow.length !== words.length) {
      return words.map(() => null);
    }
    return savedRow;
  });
}

// ─────────────────────────────────────────────────────────────
// Character assets (defined outside component — stable refs)
// ─────────────────────────────────────────────────────────────
const CHARACTER_ASSETS = {
  pink: require("../assets/animations/jump_pink.gif"),
  dino: require("../assets/animations/jump_dino.gif"),
  owl: require("../assets/animations/jump_owl.gif"),
};
const CHARACTER_KEYS = Object.keys(CHARACTER_ASSETS);

export default function ReadBook({ route, navigation }) {
  const { book, currUser } = route.params;
  const { pauseMusic, resumeMusic, soundVolume, ttsVoice } = useMusic();
  const { scale, verticalScale } = useScale();

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

  const pointsPopAnim = useRef(new Animated.Value(0)).current;
  const [showPointsPop, setShowPointsPop] = useState(false);

  const [feedback, setFeedback] = useState(null);
  const feedbackAnim = useRef(new Animated.Value(0)).current;
  const feedbackTimer = useRef(null);
  const voiceSoundRef = useRef(null);

  const [micActive, setMicActive] = useState(false);
  const recordingRef = useRef(null);
  const recordingTimerRef = useRef(null);

  const sessionIdRef = useRef(null);
  const sessionStartRef = useRef(Date.now());
  const wordTapCountsRef = useRef({});
  const sentencesReadRef = useRef(0);
  // ── CHANGED: object instead of Set so we can track previously-awarded sentences
  const awardedSentencesRef = useRef({});

  const sentenceWords = book.contents[currentSentence].split(" ");
  const currentWordResults = wordResults[currentSentence];
  const allWordsCorrect = currentWordResults.every((r) => r === "correct");
  const isLastSentence = currentSentence === book.contents.length - 1;
  const [isEvaluating, setIsEvaluating] = useState(false);

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
    };
  }, []);

  const loadProgressAndCreateSession = async () => {
    try {
      const db = getFirestore();
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setProgressLoaded(true);
        return;
      }

      const progressId = `${uid}_${book.id}`;
      const progressSnap = await getDoc(doc(db, "userProgress", progressId));

      if (progressSnap.exists()) {
        const saved = progressSnap.data();
        const savedSentence = saved.currentSentence ?? 0;
        const savedFlat = saved.wordResults ?? null;

        if (savedSentence > 0) {
          setCurrentSentence(savedSentence);
          sentencesReadRef.current = savedSentence;
        }

        if (savedFlat) {
          const restored = unflattenWordResults(savedFlat, book);

          // ── CHANGED: mark previously completed sentences for half-points,
          //    then reset all words to null so they can be re-read fresh
          restored.forEach((row, sIndex) => {
            if (row.every((r) => r === "correct")) {
              awardedSentencesRef.current[sIndex] = true;
            }
          });
          const reset = restored.map((row) => row.map(() => null));
          setWordResults(reset);
        } else {
          const emptyFlat = flattenWordResults(
            book.contents.map((s) => s.split(" ").map(() => null)),
          );
          await updateDoc(doc(db, "userProgress", progressId), {
            wordResults: emptyFlat,
          });
        }
      } else {
        const emptyFlat = flattenWordResults(
          book.contents.map((s) => s.split(" ").map(() => null)),
        );
        await setDoc(doc(db, "userProgress", progressId), {
          userId: uid,
          bookId: book.id,
          currentSentence: 0,
          wordResults: emptyFlat,
          totalSentences: book.contents.length,
          completed: false,
          lastReadAt: serverTimestamp(),
          totalSessions: 0,
          totalTimeSeconds: 0,
        });
      }

      setProgressLoaded(true);

      const sessionTimestamp = Date.now();
      const newSessionId = `${uid}_${sessionTimestamp}`;
      sessionIdRef.current = newSessionId;
      sessionStartRef.current = sessionTimestamp;

      await setDoc(doc(db, "readingSessions", newSessionId), {
        userId: uid,
        bookId: book.id,
        classId: currUser?.enrolledClasses?.[0] ?? null,
        startedAt: serverTimestamp(),
        endedAt: null,
        sentencesRead: 0,
        totalSentences: book.contents.length,
        wordsTapped: 0,
        recordingsAttempted: 0,
        pointsEarned: 0,
        completed: false,
      });
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
      const db = getFirestore();
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const elapsedSeconds = Math.floor(
        (Date.now() - sessionStartRef.current) / 1000,
      );
      const totalWordTaps = Object.values(wordTapCountsRef.current).reduce(
        (a, b) => a + b,
        0,
      );
      const snapshotSentence = currentSentenceRef.current;
      const isCompleted =
        isFinished || sentencesReadRef.current === book.contents.length;

      const serializedWordResults = flattenWordResults(
        wordResultsRef.current.map((sentence) =>
          sentence.map((r) => (r === "orange" ? null : r)),
        ),
      );

      const batch = writeBatch(db);
      const progressId = `${uid}_${book.id}`;
      const progressRef = doc(db, "userProgress", progressId);
      const progressSnap = await getDoc(progressRef);

      if (progressSnap.exists()) {
        batch.update(progressRef, {
          currentSentence: snapshotSentence,
          wordResults: serializedWordResults,
          lastReadAt: serverTimestamp(),
          completed: isCompleted,
          totalSessions: increment(1),
          totalTimeSeconds: increment(elapsedSeconds),
        });
      } else {
        batch.set(progressRef, {
          userId: uid,
          bookId: book.id,
          currentSentence: snapshotSentence,
          wordResults: serializedWordResults,
          totalSentences: book.contents.length,
          completed: isCompleted,
          lastReadAt: serverTimestamp(),
          totalSessions: 1,
          totalTimeSeconds: elapsedSeconds,
        });
      }

      if (sessionIdRef.current) {
        batch.update(doc(db, "readingSessions", sessionIdRef.current), {
          endedAt: serverTimestamp(),
          sentencesRead: sentencesReadRef.current,
          wordsTapped: totalWordTaps,
          completed: isCompleted,
        });
      }

      batch.update(doc(db, "users", uid), {
        lastReadBook: book.id,
      });

      await batch.commit();

      const wordEventPromises = Object.entries(wordTapCountsRef.current).map(
        async ([word, tapCount]) => {
          const wordEventId = `${uid}_${book.id}_${cleanWord(word)}`;
          const wordRef = doc(db, "wordEvents", wordEventId);
          try {
            const wordSnap = await getDoc(wordRef);
            if (wordSnap.exists()) {
              return updateDoc(wordRef, {
                tapCount: increment(tapCount),
                lastTappedAt: serverTimestamp(),
              });
            } else {
              return setDoc(wordRef, {
                userId: uid,
                bookId: book.id,
                sessionId: sessionIdRef.current ?? null,
                word: cleanWord(word),
                tapCount,
                lastTappedAt: serverTimestamp(),
              });
            }
          } catch (e) {
            console.log("wordEvent error:", e);
          }
        },
      );

      Promise.all(wordEventPromises).catch((e) =>
        console.log("wordEvents batch error:", e),
      );
    } catch (error) {
      console.log("saveAndExit error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      handleBackPress();
      return true;
    });
    return () => sub.remove();
  }, []);

  const handleBackPress = () => {
    Alert.alert("Stop Reading?", "Your progress will be saved.", [
      { text: "Keep Reading", style: "cancel" },
      {
        text: "Exit",
        style: "destructive",
        onPress: async () => {
          await saveAndExit();
          resumeMusic();
          navigation.navigate("HomeScreen");
        },
      },
    ]);
  };

  // ─────────────────────────────────────────────────────────
  // 3. Avatar feedback + voice
  // ─────────────────────────────────────────────────────────
  const showFeedback = async (type) => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);

    const messages = type === "correct" ? CORRECT_MESSAGES : WRONG_MESSAGES;
    const msgIndex = Math.floor(Math.random() * messages.length);
    setFeedback({ message: messages[msgIndex], type });

    feedbackAnim.setValue(0);
    Animated.spring(feedbackAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 140,
      friction: 9,
    }).start();

    const voiceKey = `${type}_${msgIndex}`;
    if (VOICE_FILES[voiceKey]) {
      try {
        if (voiceSoundRef.current) {
          await voiceSoundRef.current.stopAsync().catch(() => {});
          await voiceSoundRef.current.unloadAsync().catch(() => {});
          voiceSoundRef.current = null;
        }
        const { sound } = await Audio.Sound.createAsync(VOICE_FILES[voiceKey], {
          shouldPlay: false,
        });
        await sound.setVolumeAsync(soundVolume ?? 0.8);
        await sound.playAsync();
        voiceSoundRef.current = sound;
        sound.setOnPlaybackStatusUpdate((st) => {
          if (st.didJustFinish) sound.unloadAsync();
        });
      } catch (e) {
        console.log("Voice error:", e);
      }
    }

    feedbackTimer.current = setTimeout(() => {
      Animated.timing(feedbackAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setFeedback(null));
    }, 500);
  };

  // ─────────────────────────────────────────────────────────
  // 4. Points pop animation
  // ─────────────────────────────────────────────────────────
  const triggerPointsPop = (points = 3) => {
    setShowPointsPop(points);
    pointsPopAnim.setValue(0);
    Animated.sequence([
      Animated.spring(pointsPopAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 160,
        friction: 6,
      }),
      Animated.delay(600),
      Animated.timing(pointsPopAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setShowPointsPop(false));
  };

  // ── CHANGED: half points if sentence was already completed in a previous session
  const awardPoints = async (sentenceIndex, points = 10) => {
    const alreadyAwarded = awardedSentencesRef.current[sentenceIndex] === true;
    const finalPoints = alreadyAwarded
      ? Math.max(10, Math.floor(points / 2))
      : points;

    awardedSentencesRef.current[sentenceIndex] = true;

    setLocalPoints((p) => p + finalPoints);
    triggerPointsPop(finalPoints);
    try {
      const db = getFirestore();
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      await updateDoc(doc(db, "users", uid), {
        points: increment(finalPoints),
      });
      if (sessionIdRef.current) {
        await updateDoc(doc(db, "readingSessions", sessionIdRef.current), {
          pointsEarned: increment(finalPoints),
        });
      }
    } catch (e) {
      console.log("Points update error:", e);
    }
  };

  // ─────────────────────────────────────────────────────────
  // 5. Mark correct
  // ─────────────────────────────────────────────────────────
  const handleMarkCorrect = () => {
    const word = sentenceWords[activeWordIndex];
    const key = cleanWord(word);
    wordTapCountsRef.current[key] = (wordTapCountsRef.current[key] ?? 0) + 1;

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
  // 6. Mark wrong
  // ─────────────────────────────────────────────────────────
  const handleMarkWrong = () => {
    const word = sentenceWords[activeWordIndex];
    const key = cleanWord(word);
    wordTapCountsRef.current[key] = (wordTapCountsRef.current[key] ?? 0) + 1;

    setWordResults((prev) => {
      const next = prev.map((s) => [...s]);
      next[currentSentence][activeWordIndex] = "wrong";
      return next;
    });

    showFeedback("wrong");
  };

  // ─────────────────────────────────────────────────────────
  // 7. Tap a word → highlight orange briefly
  // ─────────────────────────────────────────────────────────
  const handleWordPress = async (index) => {
    if (wordResults[currentSentence][index] === "correct") return;

    setWordResults((prev) => {
      const next = prev.map((s) => [...s]);
      next[currentSentence][index] = "orange";
      return next;
    });

    try {
      const word = sentenceWords[index];
      const result = await pronounceWord(word, ttsVoice);

      if (result?.audio) {
        const { sound } = await Audio.Sound.createAsync(
          { uri: `data:audio/mp3;base64,${result.audio}` },
          { shouldPlay: true, volume: soundVolume ?? 0.8 },
        );
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) sound.unloadAsync();
        });
      }
    } catch (e) {
      console.log("[TTS] error:", e);
    }

    setTimeout(() => {
      setWordResults((prev) => {
        const next = prev.map((s) => [...s]);
        if (next[currentSentence][index] === "orange") {
          next[currentSentence][index] = null;
        }
        return next;
      });
    }, 800);
  };

  // ─────────────────────────────────────────────────────────
  // 8. Next / Prev
  // ─────────────────────────────────────────────────────────
  const handleNext = () => {
    if (!allWordsCorrect) return;

    sentencesReadRef.current = Math.max(
      sentencesReadRef.current,
      currentSentence + 1,
    );

    if (!isLastSentence) {
      setCurrentSentence((prev) => prev + 1);
    } else {
      Alert.alert("Great job!", "You've finished reading this book!", [
        {
          text: "Done",
          onPress: async () => {
            await saveAndExit(true);
            resumeMusic();
            navigation.navigate("HomeScreen");
          },
        },
      ]);
    }
  };

  const handlePrev = () => {
    if (currentSentence > 0) setCurrentSentence((prev) => prev - 1);
  };

  // ─────────────────────────────────────────────────────────
  // 9. Mic
  // ─────────────────────────────────────────────────────────
  const handleMicPress = async () => {
    if (micActive) {
      if (recordingTimerRef.current) {
        clearTimeout(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setMicActive(false);
      setIsEvaluating(true);

      await stopAndEvaluate();
      setIsEvaluating(false);
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
        }, 9000);
      } catch (error) {
        Alert.alert("Error", "Failed to start recording.");
      }
    }
  };

  const stopAndEvaluate = async () => {
    setIsEvaluating(true);
    try {
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
        Alert.alert("Could not hear you", "Please try again.");
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

      if (sessionIdRef.current) {
        const db = getFirestore();
        updateDoc(doc(db, "readingSessions", sessionIdRef.current), {
          recordingsAttempted: increment(1),
        }).catch(() => {});
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
      console.log("Mic evaluate error:", error);
      Alert.alert("Error", "Could not evaluate. Please try again.");
      setMicActive(false);
      recordingRef.current = null;
    } finally {
      setIsEvaluating(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────
  const s = getStyles(scale, verticalScale);

  if (!progressLoaded) {
    return (
      <View style={[s.container, { justifyContent: "center" }]}>
        <Text style={s.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Modal transparent visible={isSaving} animationType="fade">
        <View style={s.savingOverlay}>
          <View style={s.savingBox}>
            <ActivityIndicator size="large" color="#FF9149" />
            <Text style={s.savingText}>Saving your progress…</Text>
          </View>
        </View>
      </Modal>
      <TouchableOpacity style={s.backButton} onPress={handleBackPress}>
        <Ionicons name="arrow-back" size={scale(26)} color="#fff" />
      </TouchableOpacity>
      <View style={s.header}>
        <View style={s.headerText}>
          <Text style={s.headerTitle}>ELLA</Text>
          <Text style={s.headerSubTitle}>Your English Buddy</Text>
        </View>

        <View style={s.badgeWrapper}>
          <View style={s.badgeContainer}>
            <Image
              source={require("../assets/icons/diamond.png")}
              style={s.diamondIcon}
              resizeMode="contain"
            />
            <Text style={s.amountText}>{localPoints}</Text>
          </View>
          {showPointsPop && (
            <Animated.Text
              style={[
                s.pointsPop,
                {
                  opacity: pointsPopAnim,
                  transform: [
                    {
                      translateY: pointsPopAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -scale(30)],
                      }),
                    },
                    {
                      scale: pointsPopAnim.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0.5, 1.4, 1.1],
                      }),
                    },
                  ],
                },
              ]}
            >
              {`+${showPointsPop} ✦`}
            </Animated.Text>
          )}
        </View>
      </View>
      <Text style={s.booktitle}>{book.title}</Text>
      <Text style={s.writer}>By {book.writer}</Text>
      <RNImage source={{ uri: book.cover }} style={s.coverImage} />
      <View style={s.readerBox}>
        <View style={s.wordsContainer}>
          {sentenceWords.map((word, index) => {
            const result = currentWordResults[index];
            const isPointer = index === activeWordIndex;
            return (
              <TouchableOpacity
                key={index}
                onPress={() => handleWordPress(index)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    s.word,
                    result === "correct" && s.wordCorrect,
                    result === "wrong" && s.wordWrong,
                    result === "orange" && s.wordOrange,
                    isPointer && !result && s.wordPointer,
                  ]}
                >
                  {word}{" "}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={s.progress}>
          {currentSentence + 1} / {book.contents.length}
        </Text>
      </View>
      <View style={s.controlRow}>
        <TouchableOpacity
          style={[s.navButton, currentSentence === 0 && s.disabled]}
          disabled={currentSentence === 0}
          onPress={handlePrev}
        >
          <Ionicons name="arrow-back-circle" size={scale(48)} color="#555" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            s.micButton,
            micActive && s.micButtonActive,
            isEvaluating && s.micButtonDisabled,
          ]}
          onPress={handleMicPress}
        >
          {isEvaluating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons
              name={micActive ? "stop-circle-outline" : "mic-outline"}
              size={scale(48)}
              color="#fff"
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.navButton, !allWordsCorrect && s.disabled]}
          disabled={!allWordsCorrect}
          onPress={handleNext}
        >
          <Ionicons
            name={isLastSentence ? "checkmark-circle" : "arrow-forward-circle"}
            size={scale(48)}
            color={allWordsCorrect ? "#FF9149" : "#ccc"}
          />
        </TouchableOpacity>
      </View>
      <Text style={[s.micText, micActive && { color: "#e05555" }]}>
        {micActive ? "Listening..." : "Speak"}
      </Text>
      <Text style={s.hintText}>
        {allWordsCorrect
          ? "All words read! Tap → to continue"
          : `Tap a word to hear it pronounced`}
      </Text>
      <View style={s.avatarSection}>
        {feedback && (
          <Animated.View
            style={[
              s.bubbleWrapper,
              {
                opacity: feedbackAnim,
                transform: [
                  {
                    translateY: feedbackAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [12, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View
              style={[
                s.speechBubble,
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
          style={s.avatarImage}
          contentFit="contain"
        />
      </View>
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
    loadingText: {
      fontFamily: "PixelifySans",
      fontSize: scale(16),
      color: "#888",
    },
    backButton: {
      position: "absolute",
      top: verticalScale(18),
      left: scale(20),
      zIndex: 50,
    },
    savingOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "center",
      alignItems: "center",
    },
    savingBox: {
      backgroundColor: "#fff",
      borderRadius: scale(16),
      paddingVertical: verticalScale(28),
      paddingHorizontal: scale(36),
      alignItems: "center",
      gap: scale(14),
      elevation: 8,
      shadowColor: "#000",
      shadowOpacity: 0.18,
      shadowRadius: scale(12),
      shadowOffset: { width: 0, height: 4 },
    },
    savingText: {
      fontFamily: "PixelifySans",
      fontSize: scale(15),
      color: "#444",
      marginTop: scale(8),
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      marginBottom: verticalScale(6),
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
      color: "#fff",
    },
    headerSubTitle: {
      fontFamily: "PixelifySans",
      fontSize: scale(12),
      color: "#fff",
    },
    badgeWrapper: {
      position: "relative",
      marginRight: scale(12),
      alignItems: "center",
    },
    badgeContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.2)",
      borderColor: "white",
      borderWidth: 1,
      borderRadius: scale(50),
      paddingVertical: 2,
      paddingHorizontal: scale(10),
    },
    diamondIcon: { width: scale(14), height: scale(14), marginRight: scale(6) },
    amountText: { color: "#fff", fontSize: scale(13), fontFamily: "Mochi" },
    pointsPop: {
      position: "absolute",
      top: -scale(6),
      right: -scale(4),
      fontFamily: "PixelifySans",
      fontSize: scale(15),
      color: "#FFD700",
      zIndex: 10,
    },
    booktitle: {
      fontSize: scale(20),
      fontFamily: "Mochi",
      color: "#000",
      marginTop: verticalScale(15),
    },
    writer: {
      fontSize: scale(11),
      fontFamily: "Poppins",
      fontStyle: "italic",
      color: "#555",
      marginBottom: verticalScale(6),
    },
    coverImage: {
      width: "75%",
      height: verticalScale(200),
      borderRadius: scale(10),
      borderWidth: 5,
      borderColor: "#60B5FF",
      marginBottom: verticalScale(30),
      marginTop: verticalScale(30),
    },
    readerBox: {
      backgroundColor: "#fff",
      width: "90%",
      minHeight: verticalScale(150),
      borderRadius: scale(15),
      padding: scale(15),
      borderColor: "#FF9149",
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
    },
    wordsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      padding: scale(5),
    },
    word: {
      fontSize: scale(20),
      fontFamily: "Poppins",
      color: "#111",
      lineHeight: scale(34),
    },
    wordPointer: {
      textDecorationLine: "underline",
      fontFamily: "PoppinsBold",
    },
    wordCorrect: { fontFamily: "PoppinsBold", color: "#4CAF50" },
    wordWrong: { fontFamily: "PoppinsBold", color: "#E53935" },
    wordOrange: { fontFamily: "PoppinsBold", color: "#FF9149" },
    progress: {
      marginTop: verticalScale(8),
      fontSize: scale(11),
      fontFamily: "Poppins",
      color: "#888",
    },
    controlRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: scale(10),
      marginTop: verticalScale(10),
      width: "90%",
    },
    navButton: { padding: scale(4), margin: 12 },
    disabled: { opacity: 0.28 },
    micButton: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#60B5FF",
      borderRadius: scale(50),
      width: scale(60),
      height: scale(60),
      margin: 10,
    },
    micButtonActive: { backgroundColor: "#e05555" },
    micButtonDisabled: { backgroundColor: "#aaa" },
    micText: {
      color: "#aaa",
      fontSize: scale(16),
      fontFamily: "Poppins",
      marginTop: scale(2),
    },
    avatarSection: {
      position: "absolute",
      bottom: 0,
      left: scale(10),
      alignItems: "flex-start",
    },
    bubbleWrapper: {
      alignItems: "flex-start",
      marginBottom: scale(2),
    },
    speechBubble: {
      borderRadius: scale(12),
      paddingHorizontal: scale(12),
      paddingVertical: verticalScale(7),
      maxWidth: scale(150),
    },
    hintText: {
      fontFamily: "Poppins",
      fontSize: scale(16),
      color: "#aaa",
      marginTop: verticalScale(4),
      fontStyle: "italic",
      textAlign: "center",
    },
    bubbleCorrect: { backgroundColor: "#4CAF50" },
    bubbleWrong: { backgroundColor: "#E53935" },
    speechText: {
      fontFamily: "PixelifySans",
      fontSize: scale(13),
      color: "#fff",
      textAlign: "center",
    },
    bubbleTail: {
      width: 0,
      height: 0,
      borderLeftWidth: scale(8),
      borderRightWidth: scale(8),
      borderTopWidth: scale(9),
      borderLeftColor: "transparent",
      borderRightColor: "transparent",
      marginLeft: scale(18),
    },
    bubbleTailCorrect: { borderTopColor: "#4CAF50" },
    bubbleTailWrong: { borderTopColor: "#E53935" },
    avatarImage: {
      width: scale(65),
      height: scale(65),
    },
  });
