import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import { auth } from "../firebase";
import { Platform } from "react-native";

export const BACKEND_URL = "https://ella-app-e0gb.onrender.com/";

export const RECORDING_OPTIONS = {
  isMeteringEnabled: false,
  android: {
    extension: ".m4a",
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: ".wav",
    outputFormat: Audio.IOSOutputFormat.LINEARPCM,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {},
};

// ─────────────────────────────────────────────────────────────
// Edit Distance (Levenshtein) Functions
// Used to normalize STT transcript words against expected words
// ─────────────────────────────────────────────────────────────

function getEditDistance(a, b) {
  const dp = Array(a.length + 1)
    .fill(null)
    .map(() => Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] =
          1 +
          Math.min(
            dp[i - 1][j], // delete
            dp[i][j - 1], // insert
            dp[i - 1][j - 1], // replace
          );
      }
    }
  }

  return dp[a.length][b.length];
}

function isSimilarWord(spoken, expected) {
  if (spoken === expected) return true;

  const distance = getEditDistance(spoken, expected);

  // Allow small mistakes (1 char difference)
  // Note: You might want to adjust this for very short words (e.g., length < 3)
  // to avoid false positives like matching "to" with "do".
  if (distance <= 1) return true;

  return false;
}

// ── Normalize a transcript word against the expected word list ──
// If the spoken word is within the allowed edit distance of an
// expected word, swap it.
function resolveSimilarWords(spokenWords, expectedWords) {
  const expectedClean = expectedWords.map((w) =>
    w.replace(/[^a-zA-Z0-9]/g, "").toLowerCase(),
  );

  return spokenWords.map((word) => {
    const clean = word.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

    // Check if the cleaned spoken word is similar to any expected word
    for (let i = 0; i < expectedClean.length; i++) {
      if (isSimilarWord(clean, expectedClean[i])) {
        // Return the expected word to normalize the transcript
        return expectedClean[i];
      }
    }

    // If no similar word is found, return the original spoken word
    return word;
  });
}

// ─────────────────────────────────────────────────────────────
// Build a hints payload for the STT engine:
//  - the expected words themselves
//  - the full sentence as a phrase hint (helps first-word accuracy)
// ─────────────────────────────────────────────────────────────
function buildHints(expectedWords) {
  const hints = [...expectedWords];

  // Add the full sentence as a phrase — this significantly helps
  // the engine with first-word recognition and short utterances
  if (expectedWords.length > 0) {
    hints.push(expectedWords.join(" "));
  }

  // Deduplicate
  return [...new Set(hints)];
}

export const transcribeSentence = async (recordingUri, expectedWords = []) => {
  console.log("[speech] uri:", recordingUri);

  const fileInfo = await FileSystem.getInfoAsync(recordingUri);
  console.log(
    "[speech] size:",
    fileInfo.size,
    "bytes  exists:",
    fileInfo.exists,
  );

  // ── Guard: reject recordings that are too short to be valid ──
  if (!fileInfo.exists || (fileInfo.size ?? 0) < 8000) {
    console.log("[speech] recording too short, skipping transcription");
    return { success: false, transcript: null, confidence: 0 };
  }

  const base64Audio = await FileSystem.readAsStringAsync(recordingUri, {
    encoding: "base64",
  });

  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Not logged in");

  const encoding = Platform.OS === "android" ? "MP4" : "WAV";
  const hints = buildHints(expectedWords);

  const response = await fetch(`${BACKEND_URL}/api/speech/transcribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      audio: base64Audio,
      encoding,
      hints,
      enhanced: true,
    }),
  });

  const responseText = await response.text();
  console.log("[speech] server response:", responseText);

  if (!response.ok)
    throw new Error(`Server error ${response.status}: ${responseText}`);

  const parsed = JSON.parse(responseText);

  // ── Post-process: resolve similar words in transcript ──────────
  if (parsed.transcript) {
    const spokenWords = parsed.transcript.trim().split(/\s+/);
    const resolved = resolveSimilarWords(spokenWords, expectedWords);
    parsed.transcript = resolved.join(" ");
    console.log("[speech] resolved transcript:", parsed.transcript);
  }

  return parsed;
};

export const pronounceWord = async (word, voice = "en-US-Neural2-F") => {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Not logged in");

  const response = await fetch(`${BACKEND_URL}/api/speech/pronounce`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ word, voice }),
  });

  if (!response.ok) throw new Error("Failed to pronounce word");
  return response.json();
};
