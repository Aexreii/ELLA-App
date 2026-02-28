"""
Reading Progress Routes
Handles sentence-by-sentence reading tracking and word pronunciation evaluation
"""

from flask import Blueprint, request, jsonify
from config.firebase_config import get_db
from utils.decorators import require_auth
from datetime import datetime

reading_bp = Blueprint('reading', __name__)

@reading_bp.route('/start', methods=['POST'])
@require_auth
def start_reading_session(current_user):
    """
    Start a new reading session for a book
    Expected body: { "bookId": "..." }
    """
    try:
        uid = current_user['uid']
        data = request.get_json()
        
        book_id = data.get('bookId')
        
        if not book_id:
            return jsonify({'error': 'bookId is required'}), 400
        
        db = get_db()
        
        # Get book details
        book_doc = db.collection('books').document(str(book_id)).get()
        
        if not book_doc.exists:
            return jsonify({'error': 'Book not found'}), 404
        
        book_data = book_doc.to_dict()
        
        # Create reading session
        session_ref = db.collection('reading_sessions').document()
        session_data = {
            'sessionId': session_ref.id,
            'uid': uid,
            'bookId': book_id,
            'startTime': datetime.now(),
            'currentSentence': 0,
            'totalSentences': book_data.get('sentenceCount', len(book_data.get('contents', []))),
            'wordsRead': [],
            'active': True
        }
        session_ref.set(session_data)
        
        return jsonify({
            'success': True,
            'session': session_data,
            'message': 'Reading session started'
        }), 201
        
    except Exception as e:
        print(f"Start reading session error: {str(e)}")
        return jsonify({'error': 'Failed to start reading session'}), 500

@reading_bp.route('/session/<session_id>', methods=['GET'])
@require_auth
def get_reading_session(current_user, session_id):
    """Get current reading session details"""
    try:
        uid = current_user['uid']
        
        db = get_db()
        session_doc = db.collection('reading_sessions').document(session_id).get()
        
        if not session_doc.exists:
            return jsonify({'error': 'Session not found'}), 404
        
        session_data = session_doc.to_dict()
        
        # Verify session belongs to user
        if session_data.get('uid') != uid:
            return jsonify({'error': 'Unauthorized'}), 403
        
        return jsonify({
            'success': True,
            'session': session_data
        }), 200
        
    except Exception as e:
        print(f"Get reading session error: {str(e)}")
        return jsonify({'error': 'Failed to get reading session'}), 500

@reading_bp.route('/record-word', methods=['POST'])
@require_auth
def record_word_read(current_user):
    """
    Record a word that was read correctly
    Expected body: { "sessionId": "...", "word": "...", "sentenceIndex": 0, "correct": true, "attempts": 1 }
    """
    try:
        uid = current_user['uid']
        data = request.get_json()
        
        session_id = data.get('sessionId')
        word = data.get('word')
        sentence_index = data.get('sentenceIndex', 0)
        correct = data.get('correct', False)
        attempts = data.get('attempts', 1)
        
        if not session_id or not word:
            return jsonify({'error': 'sessionId and word are required'}), 400
        
        db = get_db()
        session_ref = db.collection('reading_sessions').document(session_id)
        session_doc = session_ref.get()
        
        if not session_doc.exists:
            return jsonify({'error': 'Session not found'}), 404
        
        session_data = session_doc.to_dict()
        
        # Verify session belongs to user
        if session_data.get('uid') != uid:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Add word to words read
        words_read = session_data.get('wordsRead', [])
        words_read.append({
            'word': word,
            'sentenceIndex': sentence_index,
            'correct': correct,
            'attempts': attempts,
            'timestamp': datetime.now()
        })
        
        # Update session
        session_ref.update({
            'wordsRead': words_read,
            'lastActivity': datetime.now()
        })
        
        return jsonify({
            'success': True,
            'message': 'Word recorded successfully'
        }), 200
        
    except Exception as e:
        print(f"Record word error: {str(e)}")
        return jsonify({'error': 'Failed to record word'}), 500

@reading_bp.route('/advance-sentence', methods=['POST'])
@require_auth
def advance_sentence(current_user):
    """
    Advance to the next sentence in the reading session
    Expected body: { "sessionId": "..." }
    """
    try:
        uid = current_user['uid']
        data = request.get_json()
        
        session_id = data.get('sessionId')
        
        if not session_id:
            return jsonify({'error': 'sessionId is required'}), 400
        
        db = get_db()
        session_ref = db.collection('reading_sessions').document(session_id)
        session_doc = session_ref.get()
        
        if not session_doc.exists:
            return jsonify({'error': 'Session not found'}), 404
        
        session_data = session_doc.to_dict()
        
        # Verify session belongs to user
        if session_data.get('uid') != uid:
            return jsonify({'error': 'Unauthorized'}), 403
        
        current_sentence = session_data.get('currentSentence', 0)
        total_sentences = session_data.get('totalSentences', 0)
        
        # Advance to next sentence
        new_sentence = min(current_sentence + 1, total_sentences)
        
        session_ref.update({
            'currentSentence': new_sentence,
            'lastActivity': datetime.now()
        })
        
        return jsonify({
            'success': True,
            'currentSentence': new_sentence,
            'completed': new_sentence >= total_sentences
        }), 200
        
    except Exception as e:
        print(f"Advance sentence error: {str(e)}")
        return jsonify({'error': 'Failed to advance sentence'}), 500

@reading_bp.route('/complete', methods=['POST'])
@require_auth
def complete_reading_session(current_user):
    """
    Complete a reading session and calculate rewards
    Expected body: { "sessionId": "..." }
    """
    try:
        uid = current_user['uid']
        data = request.get_json()
        
        session_id = data.get('sessionId')
        
        if not session_id:
            return jsonify({'error': 'sessionId is required'}), 400
        
        db = get_db()
        session_ref = db.collection('reading_sessions').document(session_id)
        session_doc = session_ref.get()
        
        if not session_doc.exists:
            return jsonify({'error': 'Session not found'}), 404
        
        session_data = session_doc.to_dict()
        
        # Verify session belongs to user
        if session_data.get('uid') != uid:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Calculate points based on performance
        words_read = session_data.get('wordsRead', [])
        current_sentence = session_data.get('currentSentence', 0)
        total_sentences = session_data.get('totalSentences', 1)
        book_id = session_data.get('bookId')
        
        # Calculate accuracy
        correct_words = sum(1 for w in words_read if w.get('correct', False))
        total_attempts = sum(w.get('attempts', 1) for w in words_read)
        accuracy = correct_words / total_attempts if total_attempts > 0 else 0
        
        # Get book difficulty for point multiplier
        book_doc = db.collection('books').document(str(book_id)).get()
        difficulty_multiplier = 1.0
        if book_doc.exists:
            book_data = book_doc.to_dict()
            difficulty = book_data.get('difficulty', 'Beginner')
            if difficulty == 'Intermediate':
                difficulty_multiplier = 1.5
            elif difficulty == 'Advanced':
                difficulty_multiplier = 2.0
        
        # Calculate points: base 10 points per sentence * accuracy * difficulty
        base_points = 10
        points_earned = int(current_sentence * base_points * accuracy * difficulty_multiplier)
        
        # Update session as completed
        session_ref.update({
            'active': False,
            'completedAt': datetime.now(),
            'pointsEarned': points_earned,
            'accuracy': accuracy
        })
        
        # Update user progress
        user_ref = db.collection('users').document(uid)
        user_doc = user_ref.get()
        
        if user_doc.exists:
            user_data = user_doc.to_dict()
            progress = user_data.get('progress', [])
            current_points = user_data.get('points', 0)
            total_points = user_data.get('totalPoints', 0)
            unlocked_stickers = user_data.get('unlockedStickers', [1])
            
            # Update book progress
            book_progress_found = False
            for idx, p in enumerate(progress):
                if str(p.get('bookId')) == str(book_id):
                    progress[idx] = {
                        'bookId': book_id,
                        'sentencesRead': current_sentence,
                        'totalSentences': total_sentences
                    }
                    book_progress_found = True
                    break
            
            if not book_progress_found:
                progress.append({
                    'bookId': book_id,
                    'sentencesRead': current_sentence,
                    'totalSentences': total_sentences
                })
            
            # Update points
            new_points = current_points + points_earned
            new_total_points = total_points + points_earned
            
            # Check for new sticker unlocks
            max_sticker = min(8, (new_total_points // 100) + 1)
            for i in range(1, max_sticker + 1):
                if i not in unlocked_stickers:
                    unlocked_stickers.append(i)
            
            user_ref.update({
                'progress': progress,
                'points': new_points,
                'totalPoints': new_total_points,
                'unlockedStickers': unlocked_stickers,
                'lastActivity': datetime.now()
            })
        
        return jsonify({
            'success': True,
            'pointsEarned': points_earned,
            'accuracy': accuracy,
            'sentencesRead': current_sentence,
            'message': f'Great job! You earned {points_earned} points!'
        }), 200
        
    except Exception as e:
        print(f"Complete reading session error: {str(e)}")
        return jsonify({'error': 'Failed to complete reading session'}), 500

@reading_bp.route('/sessions/user', methods=['GET'])
@require_auth
def get_user_sessions(current_user):
    """Get all reading sessions for current user"""
    try:
        uid = current_user['uid']
        
        db = get_db()
        sessions = db.collection('reading_sessions')\
            .where('uid', '==', uid)\
            .order_by('startTime', direction='DESCENDING')\
            .limit(20)\
            .stream()
        
        session_list = []
        for session in sessions:
            session_data = session.to_dict()
            session_data['sessionId'] = session.id
            
            # Convert timestamps to ISO format
            if 'startTime' in session_data:
                session_data['startTime'] = session_data['startTime'].isoformat()
            if 'completedAt' in session_data:
                session_data['completedAt'] = session_data['completedAt'].isoformat()
            
            session_list.append(session_data)
        
        return jsonify({
            'success': True,
            'sessions': session_list
        }), 200
        
    except Exception as e:
        print(f"Get user sessions error: {str(e)}")
        return jsonify({'error': 'Failed to get user sessions'}), 500
