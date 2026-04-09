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
// Homophones + commonly misheard words
// The STT engine often substitutes these — we normalize them
// before comparing against expected words.
// ─────────────────────────────────────────────────────────────
const HOMOPHONE_MAP = {
  // "I" is often heard as "eye" or "aye"
  eye: "i",
  aye: "i",
  ai: "i",

  // "owl" is often heard as "all" or "ole"
  all: "owl", // only swap when "owl" is in expected — handled below
  ole: "owl",

  // other common mishearings
  their: "there",
  there: "their",
  theyre: "they're",
  its: "it's",
  "it's": "its",
  won: "one",
  to: "too",
  too: "to",
  two: "to",
  no: "know",
  know: "no",
  new: "knew",
  knew: "new",
  hear: "here",
  here: "hear",
  sea: "see",
  see: "sea",
  be: "bee",
  bee: "be",
  bare: "bear",
  bear: "bare",
  by: "bye",
  bye: "by",
  buy: "by",
  for: "four",
  four: "for",
};

// ── Normalize a transcript word against the expected word list ──
// If the spoken word is a homophone of an expected word, swap it.
function resolveHomophones(spokenWords, expectedWords) {
  const expectedClean = expectedWords.map((w) =>
    w.replace(/[^a-zA-Z0-9]/g, "").toLowerCase(),
  );

  return spokenWords.map((word) => {
    const clean = word.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

    // If the word is already in expected, keep it
    if (expectedClean.includes(clean)) return word;

    // Check if its homophone is in expected
    const mapped = HOMOPHONE_MAP[clean];
    if (mapped && expectedClean.includes(mapped)) return mapped;

    return word;
  });
}

// ─────────────────────────────────────────────────────────────
// Build a richer hints payload for the STT engine:
//  - the expected words themselves
//  - known homophones of each expected word
//  - the full sentence as a phrase hint (helps first-word accuracy)
// ─────────────────────────────────────────────────────────────
function buildHints(expectedWords) {
  const hints = [...expectedWords];

  // Add homophones of expected words so the engine considers them
  const reverseMap = {};
  Object.entries(HOMOPHONE_MAP).forEach(([spoken, expected]) => {
    if (!reverseMap[expected]) reverseMap[expected] = [];
    reverseMap[expected].push(spoken);
  });

  expectedWords.forEach((word) => {
    const clean = word.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    if (reverseMap[clean]) hints.push(...reverseMap[clean]);
    if (HOMOPHONE_MAP[clean]) hints.push(HOMOPHONE_MAP[clean]);
  });

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
  // Anything under ~0.5 seconds is almost always noise or a tap
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
      // Ask the backend to use enhanced model and enable word confidence
      enhanced: true,
    }),
  });

  const responseText = await response.text();
  console.log("[speech] server response:", responseText);

  if (!response.ok)
    throw new Error(`Server error ${response.status}: ${responseText}`);

  const parsed = JSON.parse(responseText);

  // ── Post-process: resolve homophones in transcript ──────────
  if (parsed.transcript) {
    const spokenWords = parsed.transcript.trim().split(/\s+/);
    const resolved = resolveHomophones(spokenWords, expectedWords);
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
