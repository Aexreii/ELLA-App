import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, StatusBar } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useEffect } from "react";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

import useAuth from "./hook/useAuth";
import useAppFonts from "./hook/useAppFonts";

import StartUp from "./Screen/StartUp";
import SignUp from "./Screen/SignUp";
import NameEntry from "./Screen/NameEntry";
import RoleSelect from "./Screen/roleSelect";
import HomeScreen from "./Screen/HomeScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        "519631852985-1jc2t0qu9e9kp6lfons0q0r47rkk55jp.apps.googleusercontent.com",
    });
  });

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#60B5FF" }}>
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
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
