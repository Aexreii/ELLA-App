<<<<<<< HEAD
# ELLA - English Literacy Learning App

A comprehensive reading literacy application designed to help children learn to read through interactive storytelling, speech recognition, and gamified learning experiences.

## 📱 Project Overview

ELLA is a full-stack React Native application with a Flask backend that provides:
- **Interactive Reading**: Sentence-by-sentence reading with word-by-word pronunciation practice
- **Speech Recognition**: Real-time pronunciation evaluation using Google Cloud Speech-to-Text
- **Gamification**: Point-based rewards system with unlockable stickers and achievements
- **Personalized Learning**: Book recommendations based on user progress and reading level
- **Role-Based Access**: Separate experiences for Students and Teachers
- **Progress Tracking**: Detailed analytics on reading sessions, accuracy, and performance

## 🏗️ Architecture

```
Reading-Literacy-App-Tutor/
├── frontend/               # React Native mobile app (Expo)
│   ├── App.js
│   ├── package.json
│   ├── Screen/            # App screens
│   ├── components/        # Reusable components
│   ├── Data/              # Local data and utilities
│   └── assets/            # Images, fonts, animations
│
└── backend/               # Flask backend API
        ├── app.py         # Main Flask application
        ├── requirements.txt
        ├── routes/        # API endpoints
        ├── services/      # Business logic
        ├── config/        # Firebase & configuration
        └── utils/         # Helper utilities
```

## 🚀 Getting Started

### Prerequisites

- **Frontend**: Node.js 16+, npm or yarn, Expo CLI
- **Backend**: Python 3.8+, Firebase account, Google Cloud account
- **Mobile**: iOS Simulator, Android Emulator, or Expo Go app

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm start

# Or run on specific platform
npm run android    # Android emulator
npm run ios        # iOS simulator
npm run web        # Web browser
```

### Backend Setup

```bash
# Navigate to backend directory
cd BackEnd/ELLA-Backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your Firebase and Google Cloud credentials

# Run the server
python app.py
```

Server will start at `http://localhost:5000`

## 📚 Key Features

### For Students
- **Character Selection**: Choose from Owl, Dino, or Pink avatars
- **Reading Library**: Access books categorized by difficulty (Beginner, Intermediate, Advanced)
- **Interactive Reading**: Read sentence-by-sentence with pronunciation feedback
- **Rewards System**: Earn points and unlock stickers for reading achievements
- **Progress Tracking**: See your reading history and statistics
- **Leaderboard**: Compete with other students

### For Teachers
- **Content Management**: Upload custom reading materials
- **Class Codes**: Manage student enrollment
- **Progress Monitoring**: Track student performance and reading habits
- **Resource Sharing**: Share books with students

### Technical Features
- **Firebase Authentication**: Secure email and Google sign-in
- **Firestore Database**: Real-time data synchronization
- **Speech-to-Text**: Google Cloud Speech API integration
- **RESTful API**: Clean, documented backend endpoints
- **Responsive Design**: Optimized for various screen sizes

## 📖 API Documentation

Comprehensive API documentation is available at:
- **[Backend API Documentation](BackEnd/ELLA-Backend/API_DOCUMENTATION.md)**
- **[Backend Setup Guide](BackEnd/ELLA-Backend/README.md)**

### Main Endpoints

- **Authentication**: `/api/auth/*`
- **User Management**: `/api/user/*`
- **Books**: `/api/books/*`
- **Reading Progress**: `/api/reading/*`
- **Speech Recognition**: `/api/speech/*`
- **Prizes & Rewards**: `/api/prizes/*`

## 🎮 User Flow

1. **Sign Up**: Create account with email or Google
2. **Profile Setup**: Choose name, character (owl/dino/pink), and role
3. **Browse Books**: View personalized recommendations
4. **Start Reading**: Select a book and begin reading session
5. **Practice Pronunciation**: Speak words and get instant feedback
6. **Earn Rewards**: Complete sentences to earn points
7. **Unlock Achievements**: Collect stickers and climb the leaderboard

## 🎯 Point System

- **Base Points**: 10 points per sentence read
- **Difficulty Multiplier**: 
  - Beginner: 1.0x
  - Intermediate: 1.5x
  - Advanced: 2.0x
- **Accuracy Bonus**: Based on pronunciation correctness
- **Formula**: `points = sentences × 10 × accuracy × difficulty_multiplier`

## 🏆 Sticker Unlocking

Stickers automatically unlock based on total points earned:
- 🥉 Bronze Star: 0 points (starter)
- 🥈 Silver Star: 100 points
- 🥇 Gold Star: 200 points
- 📖 Reading Master: 300 points
- ✨ Word Wizard: 400 points
- 🏆 Book Champion: 500 points
- 🌟 Super Reader: 600 points
- 👑 Ultimate Scholar: 700 points

## 🗄️ Database Schema

### User Model
```javascript
{
  uid: string,
  email: string,
  name: string,
  character: "owl" | "dino" | "pink",
  role: "Student" | "Teacher",
  points: number,              // Current available
  totalPoints: number,         // All-time earned
  enrolledCode: number?,       // Student class code
  classCode: number?,          // Teacher class code
  unlockedStickers: number[],
  progress: [{
    bookId: string,
    sentencesRead: number,
    totalSentences: number
  }]
}
```

### Book Model
```javascript
{
  bookId: string,
  title: string,
  writer: string,
  publisher: string,
  difficulty: "Beginner" | "Intermediate" | "Advanced",
  source: "app" | "Teacher" | "user",
  contents: string[],          // Array of sentences
  sentenceCount: number,
  cover: string                // Image URL
}
```

## 🔒 Environment Variables

### Backend (.env)
```env
SECRET_KEY=your-secret-key
FLASK_ENV=development
PORT=5000
FIREBASE_CREDENTIALS=path/to/firebase-credentials.json
GOOGLE_APPLICATION_CREDENTIALS=path/to/google-credentials.json
```

## 🧪 Testing

### Frontend
```bash
cd frontend
npm test
```

### Backend
```bash
cd BackEnd/ELLA-Backend
python -m pytest
```

## 📦 Tech Stack

### Frontend
- React Native (Expo)
- React Navigation
- Expo Image & Expo Font
- React Native Safe Area Context
- Expo Vector Icons

### Backend
- Flask 3.0
- Firebase Admin SDK
- Google Cloud Speech-to-Text
- Python-dotenv
- Flask-CORS

### Database & Services
- Firebase Authentication
- Cloud Firestore
- Google Cloud Speech API
- Firebase Storage (for assets)

## 🤝 Contributing

1. Clone the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Commit: `git commit -m "Add feature"`
5. Push: `git push origin feature-name`
6. Create a Pull Request

## 📄 License

This project is licensed under the 0BSD License.

## 👥 Team

Developed by BU Software Engineering Students for the Reading Literacy App Tutor project.

## 📞 Support

For setup issues or questions:
- Frontend: Check `frontend/README.md`
- Backend: Check `BackEnd/ELLA-Backend/README.md`
- API: Check `BackEnd/ELLA-Backend/API_DOCUMENTATION.md`

## 🔄 Migration Notes

If you have an existing installation, see `BackEnd/ELLA-Backend/MIGRATION_GUIDE.md` for data migration instructions.

---

**Happy Reading! 📚✨**
=======
# ELLA-MVP
English Literacy Learning App using STT technology for young learners.
>>>>>>> b42fbb0822695840d37cf779253beb4acf32bdbb
