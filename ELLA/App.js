import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useEffect } from "react";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { MusicProvider } from "./hook/MusicContext";
import { ScaleProvider } from "./utils/scaling";
import * as NavigationBar from "expo-navigation-bar";
import { Platform } from "react-native";

import * as ScreenOrientation from "expo-screen-orientation";

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
import AvatarSelect from "./Screen/avatarSelect";
import ContactUs from "./Screen/ContactUs";
import aboutElla from "./Screen/aboutElla";
import { useWindowDimensions, View, StyleSheet } from "react-native";

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setVisibilityAsync("hidden");
      NavigationBar.setBehaviorAsync("overlay-swipe");
    }
  }, []);

  const { user, profile, loading } = useAuth();
  const fontsLoaded = useAppFonts();

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  }, []);

  const { width, height } = useWindowDimensions();

  const isTablet = width >= 600;
  const containerWidth = isTablet ? Math.min(width, height * (9 / 20)) : width;
  const containerHeight = height;

  useEffect(() => {
    fetch("https://ella-app-e0gb.onrender.com/").catch(() => {});
  }, []);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        "519631852985-rsq2kspa67ssiaecs2sjlg9g8pkkn27n.apps.googleusercontent.com",
      offlineAccess: false,
    });
  }, []);

  if (!fontsLoaded || loading) return null;

  const getInitialRoute = () => {
    if (!user) return "StartUp";
    if (!profile?.role) return "RoleSelect";
    if (!profile?.name || !profile?.age) return "NameEntry";
    if (!profile?.character) return "AvatarSelect";
    return "HomeScreen";
  };

  return (
    <View style={styles.outer}>
      <View
        style={{
          width: containerWidth,
          height: containerHeight,
          overflow: "hidden",
          alignSelf: "center",
          flex: !isTablet ? 1 : undefined,
        }}
      >
        <ScaleProvider
          effectiveWidth={containerWidth}
          effectiveHeight={containerHeight}
        >
          <MusicProvider>
            <SafeAreaProvider>
              <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
                <StatusBar
                  translucent
                  backgroundColor="transparent"
                  barStyle="dark-content"
                />
                <NavigationContainer>
                  <Stack.Navigator
                    initialRouteName={getInitialRoute()}
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: "#FFF" },
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
                    <Stack.Screen
                      name="TeacherBooks"
                      component={TeacherBooks}
                    />
                    <Stack.Screen name="UploadBook" component={UploadBook} />
                    <Stack.Screen
                      name="AvatarSelect"
                      component={AvatarSelect}
                    />
                    <Stack.Screen name="ContactUs" component={ContactUs} />
                    <Stack.Screen name="aboutElla" component={aboutElla} />
                  </Stack.Navigator>
                </NavigationContainer>
              </SafeAreaView>
            </SafeAreaProvider>
          </MusicProvider>
        </ScaleProvider>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
});
