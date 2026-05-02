import AsyncStorage from "@react-native-async-storage/async-storage";

// For Android Emulator, use 10.0.2.2. For iOS/Web, use localhost.
const ROOT_URL = "http://10.0.2.2:5000";
const BASE_URL = `${ROOT_URL}/api`; 

const api = {
  /**
   * Generic fetch wrapper with auth token
   */
  fetch: async (endpoint, options = {}) => {
    const token = await AsyncStorage.getItem("idToken");
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Something went wrong");
    }
    return data;
  },

  /**
   * Auth methods
   */
  auth: {
    login: async (email, password) => {
      const data = await api.fetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (data.idToken) {
        await AsyncStorage.setItem("idToken", data.idToken);
      }
      return data;
    },

    register: async (email, password, name, role) => {
      const data = await api.fetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, name, role }),
      });
      if (data.idToken) {
        await AsyncStorage.setItem("idToken", data.idToken);
      }
      return data;
    },

    verifyToken: async (idToken) => {
      return await api.fetch("/auth/verify", {
        method: "POST",
        body: JSON.stringify({ idToken }),
      });
    },

    logout: async () => {
      try {
        await api.fetch("/auth/logout", { method: "POST" });
      } catch (e) {
        console.log("Logout error on backend:", e);
      } finally {
        await AsyncStorage.removeItem("idToken");
      }
    },

    getUser: async () => {
      return await api.fetch("/auth/user");
    },
  },

  /**
   * User methods
   */
  user: {
    updateProfile: async (profileData) => {
      return await api.fetch("/user/profile", {
        method: "PUT",
        body: JSON.stringify(profileData),
      });
    },
    getProgress: async () => {
      return await api.fetch("/user/progress");
    },
    getFullStats: async () => {
      return await api.fetch("/user/full-stats");
    },
    updateProgress: async (progressData) => {
      return await api.fetch("/user/progress", {
        method: "POST",
        body: JSON.stringify(progressData),
      });
    },
    report: async (reportData) => {
      return await api.fetch("/user/report", {
        method: "POST",
        body: JSON.stringify(reportData),
      });
    },
  },

  /**
   * Books methods
   */
  books: {
    getCatalog: async (filters = {}) => {
      const query = new URLSearchParams(filters).toString();
      return await api.fetch(`/books/catalog${query ? `?${query}` : ""}`);
    },

    getRecommended: async () => {
      return await api.fetch("/books/recommended");
    },

    getBook: async (bookId) => {
      return await api.fetch(`/books/book/${bookId}`);
    },

    getLastUnfinished: async () => {
      return await api.fetch("/books/last-unfinished");
    },

    upload: async (bookData) => {
      return await api.fetch("/books/upload", {
        method: "POST",
        body: JSON.stringify(bookData),
      });
    },

    update: async (bookId, updates) => {
      return await api.fetch(`/books/book/${bookId}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });
    },

    delete: async (bookId) => {
      return await api.fetch(`/books/book/${bookId}`, {
        method: "DELETE",
      });
    },

    search: async (q) => {
      return await api.fetch(`/books/search?q=${encodeURIComponent(q)}`);
    },
  },

  /**
   * Class methods
   */
  class: {
    getDetails: async (classId) => {
      return await api.fetch(`/class/${classId}`);
    },

    getAggregates: async () => {
      return await api.fetch("/class/aggregates");
    },

    enroll: async (code) => {
      return await api.fetch("/class/enroll", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
    },

    create: async (classData) => {
      return await api.fetch("/class/create", {
        method: "POST",
        body: JSON.stringify(classData),
      });
    },

    getTeacherClasses: async () => {
      return await api.fetch("/class/teacher/classes");
    },

    getTeacherClassStudents: async () => {
      return await api.fetch("/class/teacher/class-students");
    },

    removeStudent: async (studentId, classId) => {
      return await api.fetch("/class/remove-student", {
        method: "POST",
        body: JSON.stringify({ studentId, classId }),
      });
    },

    leave: async () => {
      return await api.fetch("/class/leave", { method: "POST" });
    },
  },

  /**
   * Reading methods
   */
  reading: {
    startSession: async (bookId) => {
      return await api.fetch("/reading/start-session", {
        method: "POST",
        body: JSON.stringify({ bookId }),
      });
    },

    saveSession: async (sessionData) => {
      return await api.fetch("/reading/save-session", {
        method: "POST",
        body: JSON.stringify(sessionData),
      });
    },

    awardPoints: async (sessionId, points) => {
      return await api.fetch("/reading/award-points", {
        method: "POST",
        body: JSON.stringify({ sessionId, points }),
      });
    },

    recordWordEvent: async (bookId, sessionId, word, tapCount = 1) => {
      return await api.fetch("/reading/word-event", {
        method: "POST",
        body: JSON.stringify({ bookId, sessionId, word, tapCount }),
      });
    },

    recordAttempt: async (sessionId) => {
      return await api.fetch("/reading/record-attempt", {
        method: "POST",
        body: JSON.stringify({ sessionId }),
      });
    },
  },

  /**
   * Prize methods
   */
  prizes: {
    getStickers: async () => {
      return await api.fetch("/prizes/stickers");
    },

    buySticker: async (stickerId) => {
      return await api.fetch("/prizes/buy", {
        method: "POST",
        body: JSON.stringify({ stickerId }),
      });
    },
  },
};

export default api;
export { ROOT_URL, BASE_URL };
