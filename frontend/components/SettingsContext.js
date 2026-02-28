import React, { createContext, useState } from "react";

export const SettingsContext = createContext();

export function SettingsProvider({ children }) {
  const [textSize, setTextSize] = useState("medium");
  const [musicVolume, setMusicVolume] = useState(0.5);
  const [soundVolume, setSoundVolume] = useState(0.5);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  return (
    <SettingsContext.Provider
      value={{
        textSize,
        setTextSize,
        musicVolume,
        setMusicVolume,
        soundVolume,
        setSoundVolume,
        notificationsEnabled,
        setNotificationsEnabled,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}
