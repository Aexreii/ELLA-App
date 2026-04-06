import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { auth } from "../firebase";

export const BACKEND_URL = "http://10.60.79.79:5000"; // ← your LAN IP for now

export const RECORDING_OPTIONS = {
  android: {
    extension: ".wav",
    outputFormat: Audio.AndroidOutputFormat.DEFAULT,
    audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: ".wav",
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {},
};

export const transcribeSentence = async (recordingUri) => {
  const base64Audio = await FileSystem.readAsStringAsync(recordingUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Not logged in");

  const response = await fetch(`${BACKEND_URL}/api/speech/transcribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ audio: base64Audio }),
  });

  if (!response.ok) throw new Error(`Server error: ${response.status}`);
  return await response.json();
  // Returns: { success, transcript, confidence }
};
