# ELLA Backend API Documentation

## Overview

The ELLA (English Literacy Learning App) backend provides RESTful APIs for user authentication, book management, reading progress tracking, speech recognition, and rewards system.

**Base URL**: `http://localhost:5000` (development)

## Table of Contents

- [Authentication](#authentication)
- [User Management](#user-management)
- [Books](#books)
- [Reading Progress](#reading-progress)
- [Speech Recognition](#speech-recognition)
- [Prizes & Rewards](#prizes--rewards)

---

## Authentication

### POST `/api/auth/verify`
Verify Firebase ID token and get/create user profile.

**Request Body:**
```json
{
  "idToken": "firebase-id-token"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "uid": "user-uid",
    "email": "user@example.com",
    "name": "User Name",
    "character": "owl",
    "role": "Student",
    "points": 200,
    "totalPoints": 500,
    "enrolledCode": 1000,
    "classCode": null,
    "unlockedStickers": [1, 2, 3],
    "progress": [...]
  }
}
```

### POST `/api/auth/signup`
Complete user profile after Firebase authentication.

**Request Body:**
```json
{
  "idToken": "firebase-id-token",
  "name": "John Doe",
  "character": "owl",
  "role": "Student",
  "enrolledCode": 1000
}
```

**Response:**
```json
{
  "success": true,
  "message": "User profile created successfully",
  "user": {...}
}
```

### GET `/api/auth/user`
Get current authenticated user profile.

**Headers:** `Authorization: Bearer <idToken>`

**Response:**
```json
{
  "success": true,
  "user": {...}
}
```

---

## User Management

### GET `/api/user/progress`
Get user's reading progress.

**Headers:** `Authorization: Bearer <idToken>`

**Response:**
```json
{
  "success": true,
  "progress": [
    {
      "bookId": 1,
      "sentencesRead": 3,
      "totalSentences": 5
    }
  ],
  "points": 200,
  "totalPoints": 500,
  "unlockedStickers": [1, 2, 3]
}
```

### POST `/api/user/progress`
Update user's reading progress.

**Headers:** `Authorization: Bearer <idToken>`

**Request Body:**
```json
{
  "bookId": 1,
  "sentencesRead": 4,
  "totalSentences": 5,
  "pointsEarned": 50
}
```

**Response:**
```json
{
  "success": true,
  "progress": [...],
  "points": 250,
  "totalPoints": 550,
  "unlockedStickers": [1, 2, 3, 4],
  "message": "Progress updated successfully"
}
```

### GET `/api/user/achievements`
Get user's achievements and badges.

**Response:**
```json
{
  "success": true,
  "achievements": {
    "unlockedStickers": [1, 2, 3],
    "totalPoints": 500,
    "currentPoints": 200,
    "booksCompleted": 2
  }
}
```

### PUT `/api/user/profile`
Update user profile.

**Request Body:**
```json
{
  "name": "New Name",
  "character": "dino",
  "enrolledCode": 2000
}
```

### GET `/api/user/history`
Get user's activity history (last 20 activities).

---

## Books

### GET `/api/books/catalog`
Get all books with optional filtering.

**Query Parameters:**
- `source`: Filter by source (app, Teacher, user)
- `difficulty`: Filter by difficulty (Beginner, Intermediate, Advanced)

**Response:**
```json
{
  "success": true,
  "books": [
    {
      "bookId": "1",
      "title": "The Brave Little Owl",
      "writer": "Anna Reyes",
      "publisher": "BU Isarog Publishing",
      "difficulty": "Beginner",
      "source": "app",
      "contents": ["sentence1", "sentence2", ...],
      "sentenceCount": 5,
      "cover": "https://..."
    }
  ],
  "count": 10
}
```

### GET `/api/books/book/<book_id>`
Get detailed information about a specific book.

### GET `/api/books/recommended`
Get recommended books based on user's progress and points.

**Response:**
```json
{
  "success": true,
  "recommended": [...],
  "teacherMaterials": [...],
  "studentUploads": [...],
  "appBooks": [...]
}
```

### GET `/api/books/last-unfinished`
Get the last book the user was reading but didn't finish.

### POST `/api/books/upload`
Upload a new book (for teachers and students).

**Request Body:**
```json
{
  "title": "My Book",
  "writer": "Author Name",
  "difficulty": "Beginner",
  "source": "Teacher",
  "contents": ["sentence 1", "sentence 2", ...],
  "cover": "https://image-url"
}
```

### GET `/api/books/search?q=query`
Search books by title or writer.

---

## Reading Progress

### POST `/api/reading/start`
Start a new reading session.

**Request Body:**
```json
{
  "bookId": "1"
}
```

**Response:**
```json
{
  "success": true,
  "session": {
    "sessionId": "session-id",
    "uid": "user-id",
    "bookId": "1",
    "startTime": "2025-11-23T10:00:00",
    "currentSentence": 0,
    "totalSentences": 5,
    "wordsRead": [],
    "active": true
  },
  "message": "Reading session started"
}
```

### GET `/api/reading/session/<session_id>`
Get current reading session details.

### POST `/api/reading/record-word`
Record a word that was read.

**Request Body:**
```json
{
  "sessionId": "session-id",
  "word": "rabbit",
  "sentenceIndex": 0,
  "correct": true,
  "attempts": 1
}
```

### POST `/api/reading/advance-sentence`
Advance to the next sentence in the reading session.

**Request Body:**
```json
{
  "sessionId": "session-id"
}
```

**Response:**
```json
{
  "success": true,
  "currentSentence": 1,
  "completed": false
}
```

### POST `/api/reading/complete`
Complete a reading session and calculate rewards.

**Request Body:**
```json
{
  "sessionId": "session-id"
}
```

**Response:**
```json
{
  "success": true,
  "pointsEarned": 75,
  "accuracy": 0.85,
  "sentencesRead": 5,
  "message": "Great job! You earned 75 points!"
}
```

### GET `/api/reading/sessions/user`
Get all reading sessions for current user (last 20).

---

## Speech Recognition

### POST `/api/speech/evaluate`
Evaluate pronunciation from audio.

**Request Body (JSON):**
```json
{
  "audio": "base64-encoded-audio-data",
  "expectedWord": "rabbit",
  "format": "wav"
}
```

**Or use multipart/form-data:**
- `audio`: audio file
- `expectedWord`: expected word

**Response:**
```json
{
  "success": true,
  "correct": true,
  "transcript": "rabbit",
  "expected": "rabbit",
  "confidence": 0.95,
  "similarity": 1.0,
  "message": "Correct!",
  "score": 100
}
```

### POST `/api/speech/transcribe`
Transcribe audio to text without evaluation.

**Response:**
```json
{
  "success": true,
  "transcript": "hello world",
  "confidence": 0.92
}
```

---

## Prizes & Rewards

### GET `/api/prizes/stickers`
Get all available stickers with unlock status.

**Response:**
```json
{
  "success": true,
  "stickers": [
    {
      "stickerId": 1,
      "name": "Bronze Star",
      "pointCost": 0,
      "description": "Welcome sticker!",
      "unlocked": true,
      "canUnlock": true
    }
  ],
  "unlockedCount": 3,
  "totalCount": 8
}
```

### GET `/api/prizes/unlocked`
Get only unlocked stickers.

### POST `/api/prizes/unlock/<sticker_id>`
Manually unlock a sticker.

**Response:**
```json
{
  "success": true,
  "message": "Unlocked Silver Star!",
  "sticker": {...}
}
```

### POST `/api/prizes/redeem`
Redeem a prize by spending points.

**Request Body:**
```json
{
  "prizeId": "prize-1",
  "pointCost": 50
}
```

**Response:**
```json
{
  "success": true,
  "message": "Prize redeemed successfully",
  "newPoints": 150
}
```

### GET `/api/prizes/redemptions`
Get prize redemption history.

### GET `/api/prizes/leaderboard?limit=10`
Get leaderboard of top users by total points.

**Response:**
```json
{
  "success": true,
  "leaderboard": [
    {
      "rank": 1,
      "name": "John Doe",
      "character": "owl",
      "totalPoints": 1500,
      "booksCompleted": 10
    }
  ],
  "count": 10
}
```

### GET `/api/prizes/stats`
Get detailed statistics for current user.

**Response:**
```json
{
  "success": true,
  "stats": {
    "points": 200,
    "totalPoints": 500,
    "booksStarted": 5,
    "booksCompleted": 2,
    "sentencesRead": 25,
    "readingSessions": 8,
    "averageAccuracy": 87.5,
    "unlockedStickers": 3,
    "totalStickers": 8
  }
}
```

---

## User Data Model

```javascript
{
  uid: "user-id",
  email: "user@example.com",
  name: "User Name",
  character: "owl" | "dino" | "pink",
  role: "Student" | "Teacher",
  points: 200,              // Current available points
  totalPoints: 500,         // All-time points earned
  enrolledCode: 1000,       // For students (optional)
  classCode: 2000,          // For teachers (optional)
  unlockedStickers: [1, 2, 3],
  progress: [
    {
      bookId: 1,
      sentencesRead: 3,
      totalSentences: 5
    }
  ],
  createdAt: "2025-11-23T10:00:00",
  lastLogin: "2025-11-23T15:00:00"
}
```

## Book Data Model

```javascript
{
  bookId: "1",
  title: "Book Title",
  writer: "Author Name",
  publisher: "Publisher Name",
  difficulty: "Beginner" | "Intermediate" | "Advanced",
  source: "app" | "Teacher" | "user",
  contents: ["sentence 1", "sentence 2", ...],
  sentenceCount: 5,
  cover: "https://image-url",
  uploadedBy: "user-id",    // For user uploads
  uploadedAt: "2025-11-23T10:00:00"
}
```

## Point Calculation

- **Base Points**: 10 points per sentence
- **Difficulty Multiplier**:
  - Beginner: 1.0x
  - Intermediate: 1.5x
  - Advanced: 2.0x
- **Accuracy Multiplier**: Based on pronunciation accuracy
- **Formula**: `points = sentences_read × 10 × accuracy × difficulty_multiplier`

## Sticker Unlock Logic

Stickers automatically unlock based on total points:
- Sticker 1: 0 points (default)
- Sticker 2: 100 points
- Sticker 3: 200 points
- Sticker 4: 300 points
- Sticker 5: 400 points
- Sticker 6: 500 points
- Sticker 7: 600 points
- Sticker 8: 700 points

---

## Error Handling

All endpoints return standard error responses:

```json
{
  "error": "Error message",
  "details": "Additional details (optional)"
}
```

Common HTTP Status Codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

---

## Setup Instructions

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Configure environment variables in `.env`:
   ```
   SECRET_KEY=your-secret-key
   FLASK_ENV=development
   PORT=5000
   FIREBASE_CREDENTIALS=path/to/firebase-credentials.json
   GOOGLE_APPLICATION_CREDENTIALS=path/to/google-cloud-credentials.json
   ```

3. Run the server:
   ```bash
   python app.py
   ```

4. Server will be available at `http://localhost:5000`

---

## Frontend Integration Guide

### Authentication Flow

1. User signs in with Firebase on frontend
2. Get Firebase ID token
3. Send token to `/api/auth/verify` or `/api/auth/signup`
4. Store returned user data in app state
5. Include token in Authorization header for all subsequent requests

### Reading Flow

1. Get recommended books: `GET /api/books/recommended`
2. Start reading session: `POST /api/reading/start`
3. For each word read:
   - Record audio
   - Send to `/api/speech/evaluate`
   - Record result: `POST /api/reading/record-word`
4. Advance sentences: `POST /api/reading/advance-sentence`
5. Complete session: `POST /api/reading/complete`
6. Display points earned

### Example Request (JavaScript)

```javascript
const response = await fetch('http://localhost:5000/api/books/recommended', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${firebaseIdToken}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
```

---

For more information or support, please contact the development team.
