import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Audio } from "expo-av";

const MusicContext = createContext(null);

export function MusicProvider({ children }) {
  const soundRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [soundVolume, setSoundVolume] = useState(0.8); // shared SFX volume

  useEffect(() => {
    loadMusic();
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const loadMusic = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        require("../assets/sounds/bg_sound1.mp3"),
        {
          shouldPlay: true,
          isLooping: true,
          volume: 0.2,
        },
      );

      soundRef.current = sound;
      setIsPlaying(true);
    } catch (error) {
      console.log("Error loading background music:", error);
    }
  };

  const pauseMusic = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      }
    } catch (error) {
      console.log("Error pausing music:", error);
    }
  };

  const resumeMusic = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.log("Error resuming music:", error);
    }
  };

  const toggleMusic = () => {
    if (isPlaying) pauseMusic();
    else resumeMusic();
  };

  const setVolume = async (volume) => {
    try {
      if (!soundRef.current) return;
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded) {
        await soundRef.current.setVolumeAsync(volume);
      }
    } catch (error) {
      if (!error.message?.includes("AudioFocusNotAcquired")) {
        console.log("Error setting volume:", error);
      }
    }
  };

  return (
    <MusicContext.Provider
      value={{
        isPlaying,
        pauseMusic,
        resumeMusic,
        toggleMusic,
        setVolume,
        soundVolume, // current SFX volume (0–1)
        setSoundVolume, // call this from Settings slider
      }}
    >
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error("useMusic must be used inside MusicProvider");
  }
  return context;
}
