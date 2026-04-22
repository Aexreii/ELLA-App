# ELLA — English Literacy Learning App

> **Your English Buddy** — A gamified mobile reading app for young learners, powered by speech recognition and interactive literacy exercises.

---

## 🌟 Overview

**ELLA (English Literacy Learning App)** is a React Native mobile application designed to help young learners develop English reading and literacy skills. It features real-time speech recognition, gamified rewards, a digital library of books, and a classroom management system for teachers.

The app supports two user roles:
- **Students** — read books, practice pronunciation, earn points, and unlock sticker prizes.
- **Teachers** — upload reading materials, manage class enrollment, and monitor student progress.

---

## 🧑‍💻 Team

| Name | Role |
|---|---|
| Dexter Andrei B. Rañosa | Project Manager |
| Mark L. Dela Cruz | UI/UX & Frontend Developer |
| Viktor Cassidy P. Ocenar | Backend Developer |
| Shana Aislinn M. Gamis | Documentation Specialist & Database Engineer |
| Xaris Joy D. Tabayag | Quality Tester & Requirements Specialist |

---

## 🏗️ Tech Stack

### Frontend (Mobile)
- **React Native** — cross-platform iOS & Android
- **Firebase Auth** — email/password + Google Sign-In
- **Firebase Firestore** — real-time NoSQL database
- **Expo AV** — audio recording & playback
- **React Navigation** — screen routing
- **Cloudinary** — image hosting for book covers & avatars

### Backend
- **Python / Flask** — REST API server
- **Google Cloud Speech-to-Text** — voice transcription
- **Google Cloud Text-to-Speech** — word pronunciation (Neural2 voices)
- **Firebase Admin SDK** — server-side auth token verification

---

## 📁 Project Structure

```
ella-app/
├── App.js                      # Root component, navigation setup
├── Screen/
│   ├── StartUp.js              # Login screen (Email + Google)
│   ├── SignUp.js               # Registration screen
│   ├── RoleSelect.js           # Student or Teacher selection
│   ├── NameEntry.js            # Name & age onboarding
│   ├── AvatarSelect.js         # Character selection (Pink / Dino / Owl)
│   ├── HomeScreen.js           # Main library & book browsing
│   ├── OpenBook.js             # Book detail & edit/delete
│   ├── ReadBook.js             # Reading session with speech recognition
│   ├── Prizes.js               # Sticker shop (points-based rewards)
│   ├── UserProfile.js          # Profile stats, progress, achievements
│   ├── ManageClass.js          # Teacher: view enrolled students
│   ├── TeacherBooks.js         # Student: view teacher-uploaded books
│   ├── UploadBook.js           # Upload new books with cover image
│   ├── EnrollModal.js          # Student class enrollment modal
│   ├── Settings.js             # Audio, TTS voice, notifications
│   ├── ContactUs.js            # Feedback / bug report form
│   └── aboutElla.js            # App info & team credits
├── hook/
│   ├── MusicContext.js         # Global background music & audio context
│   ├── useAppFonts.js          # Custom font loader (PixelifySans, Poppins, Mochi)
│   └── useAuth.js              # Firebase auth state + Firestore profile hook
├── utils/
│   ├── speechHelper.js         # Speech-to-text API client & Levenshtein matching
│   ├── libUtil.js              # Book recommendation & filtering logic
│   └── scaling.js              # Responsive scaling utilities
├── components/
│   ├── Alerts.js               # EllAlert modal + useEllAlert hook
│   └── Sidebar.js              # Navigation drawer component
└── backend/
    ├── app.py                  # Flask entry point
    ├── services/
    │   └── speech_service.py   # Google STT/TTS service wrapper
    └── routes/
        └── speech_routes.py    # /api/speech/* endpoints
```

---

## 🚀 Getting Started

### To install the app you can view the releases page
[![GitHub Release](https://img.shields.io/github/v/release/Aexreii/ELLA-App)](https://github.com/Aexreii/ELLA-App/releases)
[View Releases](https://github.com/Aexreii/ELLA-App/releases)



### Prerequisites for local installation
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Python 3.10+
- A Firebase project (Firestore + Authentication enabled)
- Google Cloud project with Speech-to-Text and Text-to-Speech APIs enabled

### Frontend Setup

```bash
# Install dependencies
npm install

# Start the Expo development server
npx expo start

# Set environment variables
cp .env.example .env
# Fill in firebase credentials.
```

### Backend Setup

```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Fill in GOOGLE_APPLICATION_CREDENTIALS_JSON, SECRET_KEY, etc.

# Run the server
python app.py
```

### Environment Variables (Backend)

| Variable | Description |
|---|---|
| `SECRET_KEY` | Flask secret key |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | Google Cloud service account JSON (stringified) |
| `PORT` | Server port (default: 5000) |

---

## 🔑 Firebase Collections

| Collection | Description |
|---|---|
| `users` | User profiles (name, age, role, points, character, progress) |
| `books` | Book documents (title, contents array, cover URL, difficulty, source) |
| `classes` | Teacher-created classes (code, teacherID, students array) |
| `stickers` | Prize stickers available in the shop |
| `reports` | Contact Us / feedback submissions |

---

## 🎮 Key Features

### Authentication
- Email/password sign-in and registration
- Google OAuth sign-in via `@react-native-google-signin/google-signin`
- Automatic onboarding flow: Role → Name/Age → Avatar → Home

### Reading Mode (`ReadBook.js`)
- Sentence-by-sentence reading with word highlighting
- Voice recording via `expo-av` with platform-specific encoding (WAV on iOS, M4A on Android)
- Levenshtein edit-distance word matching for robust speech recognition
- Positive/negative audio feedback sounds
- Progress and points saved to Firestore on completion

### Speech Services (`speechHelper.js` + `speech_service.py`)
- Audio sent as Base64 to `/api/speech/transcribe`
- Google Speech-to-Text with phrase hints for accuracy
- Dynamic word normalization using edit distance (no hardcoded maps)
- TTS pronunciation playback via `/api/speech/pronounce` with 4 Neural2 voices

### Book System
- Books categorized as: `app/Ella`, `Teacher`, `student/User`
- Difficulty levels: `Beginner`, `Intermediate`, `Advanced`
- Teacher books linked to classes via `uploadedById`
- Students see recommended books based on points thresholds (0 / 200 / 400)

### Classroom
- Teachers get a unique 8-character class code on role selection
- Students enroll via `EnrollModal` by entering the code
- Teachers view enrolled students via `ManageClass`
- Students access teacher materials via `TeacherBooks`

### Prizes
- Students earn points for completing reading sessions
- Points spent in the sticker shop (`Prizes.js`)
- Sticker ownership stored in `ownedStickers[]` on user document

---

## 🎨 Design System

| Token | Value |
|---|---|
| Primary Blue | `#60B5FF` |
| Accent Orange | `#FF9149` |
| Background | `#f2f2f2` |
| Dark Text | `#1a1a2e` |
| Font — Display | `PixelifySans` |
| Font — Body | `Poppins` |
| Font — Headings | `Mochi` |

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `GET` | `/api/health` | Firebase connection status |
| `POST` | `/api/speech/transcribe` | Transcribe audio (Base64) to text |
| `POST` | `/api/speech/pronounce` | Synthesize word pronunciation (TTS) |
| `POST` | `/api/speech/evaluate` | Evaluate pronunciation correctness |

All `/api/speech/*` routes require a valid Firebase ID token in the `Authorization: Bearer <token>` header.

---

## 📱 Supported Platforms

- Android (primary)
- Tablet support with pillarbox layout (aspect ratio threshold: 1.6)

---

## 📄 License

This project was developed as an academic capstone project. All rights reserved by the ELLA development team.
