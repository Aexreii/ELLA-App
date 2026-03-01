import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "react-native";
import { useEffect } from "react";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

import StartUp from "./Screen/StartUp";
import SignUp from "./Screen/SignUp";
import NameEntry from "./Screen/NameEntry";
import RoleSelect from "./Screen/roleSelect";
import HomeScreen from "./Screen/HomeScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        "553615369502-0pnceg6t2egegfk8hi70q5861h1rkrg4.apps.googleusercontent.com",
      profileImageSize: 150,
    });
  });

  return (
    <SafeAreaProvider>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />
      <NavigationContainer>
        <SafeAreaView
          style={{ flex: 1, backgroundColor: "#fff" }}
          edges={["top"]}
        >
          <Stack.Navigator
            initialRouteName="StartUp"
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
        </SafeAreaView>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
