import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../utils/api";

export default function useAuth() {
  const [user, setUser] = useState(null); // Backend user data
  const [profile, setProfile] = useState(null); // Firestore user data (same as user in this case)
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem("idToken");
      if (!token) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      // Verify token and get user profile from backend
      const response = await api.auth.getUser();
      if (response.success) {
        setUser(response.user);
        setProfile(response.user);
      } else {
        setUser(null);
        setProfile(null);
      }
    } catch (error) {
      console.log("Error checking auth:", error);
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
    // In a real app, you might want to add a listener or use a state management library
    // for more reactive auth state across the app.
  }, []);

  return { user, profile, loading, refreshAuth: checkAuth };
}
