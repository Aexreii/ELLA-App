# Migration Guide: Frontend-Backend Data Alignment

## Overview
This guide helps migrate existing data to the new data structure that aligns with the updated frontend.

## User Data Migration

### If you have existing users in Firestore

Run this migration script to update user documents:

```python
from config.firebase_config import get_db
from datetime import datetime

def migrate_users():
    """Migrate existing users to new data structure"""
    db = get_db()
    users = db.collection('users').stream()
    
    for user_doc in users:
        user_data = user_doc.to_dict()
        user_ref = db.collection('users').document(user_doc.id)
        
        # Prepare updates
        updates = {}
        
        # Rename avatar to character if exists
        if 'avatar' in user_data and 'character' not in user_data:
            # Map old avatar values to new character values
            avatar_map = {
                'owl': 'owl',
                'dino': 'dino', 
                'pink': 'pink',
                '': 'owl'  # default
            }
            updates['character'] = avatar_map.get(user_data['avatar'], 'owl')
        
        # Update role from child to Student
        if 'role' in user_data:
            if user_data['role'] == 'child':
                updates['role'] = 'Student'
        else:
            updates['role'] = 'Student'
        
        # Convert old progress format to new format
        if 'progress' in user_data and isinstance(user_data['progress'], dict):
            old_progress = user_data['progress']
            new_progress = []
            
            # Convert completedBooks to progress array
            completed_books = old_progress.get('completedBooks', [])
            for book_id in completed_books:
                # Assume completed books have all sentences read
                new_progress.append({
                    'bookId': book_id,
                    'sentencesRead': 5,  # Default, adjust as needed
                    'totalSentences': 5
                })
            
            updates['progress'] = new_progress
            
            # Convert totalScore to points and totalPoints
            total_score = old_progress.get('totalScore', 0)
            updates['points'] = total_score
            updates['totalPoints'] = total_score
        
        # Add new fields if they don't exist
        if 'points' not in user_data:
            updates['points'] = 0
        
        if 'totalPoints' not in user_data:
            updates['totalPoints'] = 0
        
        if 'enrolledCode' not in user_data:
            updates['enrolledCode'] = None
        
        if 'classCode' not in user_data:
            updates['classCode'] = None
        
        if 'unlockedStickers' not in user_data:
            # Calculate unlocked stickers based on totalPoints
            total_points = updates.get('totalPoints', user_data.get('totalPoints', 0))
            max_sticker = min(8, (total_points // 100) + 1)
            updates['unlockedStickers'] = list(range(1, max_sticker + 1))
        
        # Apply updates
        if updates:
            user_ref.update(updates)
            print(f"Updated user {user_doc.id}: {user_data.get('name', 'Unknown')}")
    
    print("User migration completed!")

if __name__ == '__main__':
    migrate_users()
```

## Book Data Setup

### Add Initial Books to Firestore

```python
from config.firebase_config import get_db
from datetime import datetime

def seed_books():
    """Seed initial books to Firestore"""
    db = get_db()
    
    books = [
        {
            'title': 'The Brave Little Owl',
            'writer': 'Anna Reyes',
            'publisher': 'BU Isarog Publishing',
            'difficulty': 'Beginner',
            'source': 'app',
            'contents': [
                'Once upon a time, there was a little owl who was afraid of the dark.',
                'Every night, she stayed close to her mother and refused to fly.',
                'One day, her mother got lost, and the little owl had to be brave.',
                'She flew through the dark forest, guided by the stars.',
                'In the end, she found her mother and learned that the night was not scary after all.'
            ],
            'sentenceCount': 5,
            'cover': 'https://picsum.photos/seed/owl/400/250',
            'uploadedAt': datetime.now()
        },
        {
            'title': "Dino's First Day at School",
            'writer': 'Carlos Lim',
            'publisher': 'Student Uploads',
            'difficulty': 'Intermediate',
            'source': 'user',
            'contents': [
                'Dino woke up early for his first day of school.',
                'He packed his bag and wore his favorite green cap.',
                'At first, he felt nervous, but his new friends made him smile.',
                'He learned to read, count, and share with others.',
                'Dino realized that learning can be fun!'
            ],
            'sentenceCount': 5,
            'cover': 'https://picsum.photos/seed/dino/400/250',
            'uploadedAt': datetime.now()
        },
        # Add more books as needed
    ]
    
    for book in books:
        book_ref = db.collection('books').document()
        book_ref.set(book)
        print(f"Added book: {book['title']}")
    
    print("Book seeding completed!")

if __name__ == '__main__':
    seed_books()
```

## Database Indexes

### Create these Firestore indexes for optimal performance:

1. **books collection**
   - Composite index: `source` (Ascending) + `difficulty` (Ascending)
   - Single field: `uploadedAt` (Descending)

2. **reading_sessions collection**
   - Composite index: `uid` (Ascending) + `active` (Ascending)
   - Composite index: `uid` (Ascending) + `startTime` (Descending)

3. **activities collection**
   - Composite index: `uid` (Ascending) + `timestamp` (Descending)

4. **redemptions collection**
   - Composite index: `uid` (Ascending) + `redeemedAt` (Descending)

5. **users collection**
   - Single field: `totalPoints` (Descending) for leaderboard

### Create indexes via Firebase Console or using Firebase CLI:

```bash
# Create firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "books",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "source", "order": "ASCENDING" },
        { "fieldPath": "difficulty", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "reading_sessions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "uid", "order": "ASCENDING" },
        { "fieldPath": "startTime", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "activities",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "uid", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "redemptions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "uid", "order": "ASCENDING" },
        { "fieldPath": "redeemedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "totalPoints", "order": "DESCENDING" }
      ]
    }
  ]
}
```

Deploy indexes:
```bash
firebase deploy --only firestore:indexes
```

## Security Rules

### Update Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Books collection
    match /books/{bookId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        (resource.data.uploadedBy == request.auth.uid || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Teacher');
    }
    
    // Reading sessions
    match /reading_sessions/{sessionId} {
      allow read: if request.auth != null && resource.data.uid == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;
      allow update: if request.auth != null && resource.data.uid == request.auth.uid;
    }
    
    // Activities
    match /activities/{activityId} {
      allow read: if request.auth != null && resource.data.uid == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;
    }
    
    // Redemptions
    match /redemptions/{redemptionId} {
      allow read: if request.auth != null && resource.data.uid == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;
    }
  }
}
```

## Testing Migration

### After migration, test these scenarios:

1. **User Login**
   ```bash
   POST /api/auth/verify
   # Verify user has new fields: character, points, totalPoints, unlockedStickers
   ```

2. **Book Access**
   ```bash
   GET /api/books/recommended
   # Verify books are returned with proper categorization
   ```

3. **Progress Update**
   ```bash
   POST /api/user/progress
   {
     "bookId": 1,
     "sentencesRead": 3,
     "totalSentences": 5,
     "pointsEarned": 30
   }
   # Verify progress array updates correctly
   ```

4. **Sticker Unlock**
   ```bash
   GET /api/prizes/stickers
   # Verify stickers unlock at correct point thresholds
   ```

## Rollback Plan

If migration issues occur:

1. **Backup Data**
   ```bash
   # Export Firestore data before migration
   gcloud firestore export gs://your-backup-bucket/backup-$(date +%Y%m%d)
   ```

2. **Restore if Needed**
   ```bash
   gcloud firestore import gs://your-backup-bucket/backup-YYYYMMDD
   ```

3. **Revert Code**
   ```bash
   git checkout previous-commit
   ```

## Post-Migration Checklist

- [ ] All users have `character` field
- [ ] All users have `points` and `totalPoints`
- [ ] Progress is in array format with sentencesRead/totalSentences
- [ ] Books are seeded in Firestore
- [ ] Firestore indexes are created
- [ ] Security rules are updated
- [ ] API endpoints return expected data format
- [ ] Frontend can successfully authenticate and fetch data
- [ ] Reading sessions can be created and completed
- [ ] Points are calculated correctly
- [ ] Stickers unlock at proper thresholds

## Support

For migration issues, check:
1. Firebase console for Firestore data structure
2. Backend logs for API errors
3. Network tab in browser for frontend API calls
4. `API_DOCUMENTATION.md` for expected data formats
