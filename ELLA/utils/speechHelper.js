import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import { auth } from "../firebase";
import { Platform } from "react-native";

export const BACKEND_URL = "http://10.60.79.79:5000";

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

export const transcribeSentence = async (recordingUri, expectedWords = []) => {
  console.log("[speech] uri:", recordingUri);

  const fileInfo = await FileSystem.getInfoAsync(recordingUri);
  console.log(
    "[speech] size:",
    fileInfo.size,
    "bytes  exists:",
    fileInfo.exists,
  );

  const base64Audio = await FileSystem.readAsStringAsync(recordingUri, {
    encoding: "base64",
  });

  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Not logged in");

  const encoding = Platform.OS === "android" ? "MP4" : "WAV";

  const response = await fetch(`${BACKEND_URL}/api/speech/transcribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      audio: base64Audio,
      encoding,
      hints: expectedWords,
    }),
  });

  const responseText = await response.text();
  console.log("[speech] server response:", responseText);

  if (!response.ok)
    throw new Error(`Server error ${response.status}: ${responseText}`);
  return JSON.parse(responseText);
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
