# ELLA Backend API

Backend API for the English Literacy Learning App (ELLA) - A learning application for children to practice reading and pronunciation.

## 🚀 Features

- **Authentication**: Email and Google login via Firebase Auth
- **Voice Recognition**: Speech-to-text using Google Cloud Speech API
- **Pronunciation Evaluation**: Compares spoken words with expected words
- **User Progress Tracking**: Stores scores, achievements, and learning history
- **RESTful API**: Clean API endpoints for React Native frontend

## 📋 Prerequisites

- Python 3.8 or higher
- Firebase project with Authentication and Firestore enabled
- Google Cloud project with Speech-to-Text API enabled

## 🛠️ Setup Instructions

### 1. Clone and Navigate
```bash
cd ELLA-Backend
```

### 2. Create Virtual Environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Enable **Authentication** (Email/Password and Google Sign-In)
4. Enable **Firestore Database**
5. Go to Project Settings > Service Accounts
6. Click "Generate New Private Key"
7. Save the JSON file as `firebase-credentials.json` in the `ELLA-Backend` folder

### 5. Google Cloud Speech-to-Text Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select the same Firebase project
3. Enable **Cloud Speech-to-Text API**
4. Go to IAM & Admin > Service Accounts
5. Create a service account with Speech-to-Text permissions
6. Generate and download the JSON key
7. Save it as `google-cloud-credentials.json` in the `ELLA-Backend` folder

### 6. Environment Configuration

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and update the paths:
```env
SECRET_KEY=your-random-secret-key-here
FLASK_ENV=development
PORT=5000

FIREBASE_CREDENTIALS=firebase-credentials.json
GOOGLE_APPLICATION_CREDENTIALS=google-cloud-credentials.json
```

### 7. Run the Server
```bash
python app.py
```

The server will start at `http://localhost:5000`

## 📡 API Endpoints

### Authentication
- `POST /api/auth/verify` - Verify Firebase token and get/create user
- `POST /api/auth/signup` - Complete user profile after signup
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/user` - Get current user profile

### User Management
- `GET /api/user/progress` - Get user's learning progress
- `POST /api/user/progress` - Update progress with points and stickers
- `GET /api/user/achievements` - Get achievements and unlocked stickers
- `PUT /api/user/profile` - Update user profile (name, character, codes)
- `GET /api/user/history` - Get activity history

### Books
- `GET /api/books/catalog` - Get all books with filtering (source, difficulty)
- `GET /api/books/book/<book_id>` - Get specific book details
- `GET /api/books/recommended` - Get personalized book recommendations
- `GET /api/books/last-unfinished` - Get last book being read
- `POST /api/books/upload` - Upload new book (Teacher/Student)
- `GET /api/books/search?q=query` - Search books by title or author

### Reading Progress
- `POST /api/reading/start` - Start a new reading session
- `GET /api/reading/session/<session_id>` - Get session details
- `POST /api/reading/record-word` - Record word pronunciation attempt
- `POST /api/reading/advance-sentence` - Move to next sentence
- `POST /api/reading/complete` - Complete session and calculate rewards
- `GET /api/reading/sessions/user` - Get user's reading sessions

### Speech Recognition
- `POST /api/speech/evaluate` - Evaluate pronunciation with scoring
- `POST /api/speech/transcribe` - Transcribe audio to text
- `GET /api/speech/test` - Test speech service configuration

### Prizes & Rewards
- `GET /api/prizes/stickers` - Get all stickers with unlock status
- `GET /api/prizes/unlocked` - Get only unlocked stickers
- `POST /api/prizes/unlock/<sticker_id>` - Manually unlock sticker
- `POST /api/prizes/redeem` - Redeem prize with points
- `GET /api/prizes/redemptions` - Get redemption history
- `GET /api/prizes/leaderboard?limit=10` - Get top users leaderboard
- `GET /api/prizes/stats` - Get detailed user statistics

### Health Check
- `GET /api/health` - Check API health status

**📖 For detailed API documentation, see [API_DOCUMENTATION.md](API_DOCUMENTATION.md)**

## 📤 API Usage Examples

### Verify User Token
```http
POST /api/auth/verify
Content-Type: application/json

{
  "idToken": "firebase-id-token-from-frontend"
}
```

### Evaluate Pronunciation
```http
POST /api/speech/evaluate
Authorization: Bearer <firebase-id-token>
Content-Type: application/json

{
  "audio": "base64_encoded_audio_data",
  "expectedWord": "rabbit"
}
```

Response:
```json
{
  "success": true,
  "correct": false,
  "transcript": "apple",
  "expected": "rabbit",
  "confidence": 0.95,
  "similarity": 0.2,
  "message": "You said 'apple', but the word is 'rabbit'",
  "score": 10
}
```

### Update Progress
```http
POST /api/user/progress
Authorization: Bearer <firebase-id-token>
Content-Type: application/json

{
  "bookId": "book_001",
  "score": 85,
  "completed": true
}
```

## 🗂️ Project Structure

```
ELLA-Backend/
├── app.py                     # Main Flask application
├── requirements.txt           # Python dependencies
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore rules
├── API_DOCUMENTATION.md      # Comprehensive API documentation
├── config/
│   └── firebase_config.py        # Firebase initialization
├── routes/
│   ├── auth_routes.py            # Authentication endpoints
│   ├── user_routes.py            # User profile & progress
│   ├── books_routes.py           # Book catalog & management
│   ├── reading_routes.py         # Reading session tracking
│   ├── speech_routes.py          # Speech recognition
│   └── prizes_routes.py          # Rewards & leaderboard
├── services/
│   └── speech_service.py         # Speech recognition logic
└── utils/
    └── decorators.py             # Authentication decorators
```

## 🔐 Security Notes

- **Never commit** credential files (`*credentials*.json`)
- Keep `.env` file secure and out of version control
- Use environment variables for sensitive data
- In production, restrict CORS origins
- Use HTTPS for all API communications

## 🧪 Testing

Test the API health:
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "firebase": "connected"
}
```

## 🐛 Troubleshooting

### Firebase Connection Issues
- Verify `firebase-credentials.json` path in `.env`
- Check Firebase project settings
- Ensure Firestore is enabled

### Speech API Errors
- Verify `google-cloud-credentials.json` path
- Check if Speech-to-Text API is enabled
- Ensure billing is enabled (free tier available)

### Import Errors
- Activate virtual environment
- Reinstall requirements: `pip install -r requirements.txt`

## 📝 Notes for Development

- This backend supports the updated frontend with:
  - Character selection (owl, dino, pink)
  - Point-based rewards system
  - Sentence-by-sentence reading progress
  - Sticker unlocking based on achievements
  - Role-based features (Student/Teacher)
  - Book categorization and recommendations
- Audio format: WAV, 16kHz, LINEAR16 encoding recommended
- Free tier limits:
  - Firebase: Generous free quotas for small projects
  - Google Speech-to-Text: 60 minutes free per month

## 🎮 Key Features for Frontend Integration

### User Data Structure
The backend now supports:
- `character`: "owl" | "dino" | "pink"
- `role`: "Student" | "Teacher"
- `points`: Current available points
- `totalPoints`: All-time earned points
- `enrolledCode`: For students joining classes
- `classCode`: For teachers creating classes
- `unlockedStickers`: Array of unlocked sticker IDs
- `progress`: Array of book progress with sentencesRead/totalSentences

### Point System
- Base: 10 points per sentence
- Difficulty multiplier: Beginner (1.0x), Intermediate (1.5x), Advanced (2.0x)
- Accuracy-based calculation
- Stickers unlock automatically at point milestones

### Book Categorization
- **App Books**: Built-in educational content
- **Teacher Uploads**: Materials uploaded by teachers
- **Student Uploads**: Books shared by students
- Difficulty levels: Beginner, Intermediate, Advanced
- Personalized recommendations based on progress and points

## 🤝 Frontend Integration

The React Native frontend should:
1. Handle Firebase Authentication (email/Google)
2. Send ID tokens in Authorization header: `Bearer <token>`
3. Record audio in compatible format (WAV, 16kHz)
4. Send base64-encoded audio or use multipart/form-data

## 📞 Support

For issues or questions about the backend setup, refer to:
- [Firebase Documentation](https://firebase.google.com/docs)
- [Google Cloud Speech-to-Text](https://cloud.google.com/speech-to-text/docs)
- [Flask Documentation](https://flask.palletsprojects.com/)
