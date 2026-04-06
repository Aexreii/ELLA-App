import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useEffect } from "react";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { MusicProvider } from "./hook/MusicContext";

import useAuth from "./hook/useAuth";
import useAppFonts from "./hook/useAppFonts";

import StartUp from "./Screen/StartUp";
import SignUp from "./Screen/SignUp";
import NameEntry from "./Screen/NameEntry";
import RoleSelect from "./Screen/roleSelect";
import HomeScreen from "./Screen/HomeScreen";
import OpenBook from "./Screen/OpenBook";
import ReadBook from "./Screen/ReadBook";
import UserProfile from "./Screen/UserProfile";
import Prizes from "./Screen/Prizes";
import Settings from "./Screen/Settings";
import ManageClass from "./Screen/ManageClass";
import TeacherBooks from "./Screen/TeacherBooks";
import UploadBook from "./Screen/uploadBook";

const Stack = createNativeStackNavigator();

export default function App() {
  const { user, profile, loading } = useAuth();

  // At the top of App.js useEffect
  useEffect(() => {
    const webClientId =
      "519631852985-1jc2t0qu9e9kp6lfons0q0r47rkk55jp.apps.googleusercontent.com";
    console.log("[Google] Configuring with webClientId:", webClientId);
    GoogleSignin.configure({ webClientId });
  }, []);
  return (
    <MusicProvider>
      <SafeAreaProvider>
        <StatusBar
          translucent
          backgroundColor="transparent"
          barStyle="dark-content"
        />
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "#fff" },
            }}
          >
            <Stack.Screen name="StartUp" component={StartUp} />
            <Stack.Screen name="SignUp" component={SignUp} />
            <Stack.Screen name="NameEntry" component={NameEntry} />
            <Stack.Screen name="RoleSelect" component={RoleSelect} />
            <Stack.Screen name="HomeScreen" component={HomeScreen} />
            <Stack.Screen name="UserProfile" component={UserProfile} />
            <Stack.Screen name="OpenBook" component={OpenBook} />
            <Stack.Screen name="ReadBook" component={ReadBook} />
            <Stack.Screen name="Settings" component={Settings} />
            <Stack.Screen name="Prizes" component={Prizes} />
            <Stack.Screen name="ManageClass" component={ManageClass} />
            <Stack.Screen name="TeacherBooks" component={TeacherBooks} />
            <Stack.Screen name="UploadBook" component={UploadBook} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </MusicProvider>
  );
}
