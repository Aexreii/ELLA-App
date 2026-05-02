"""
Reading Progress Routes
Handles sentence-by-sentence reading tracking and word pronunciation evaluation
"""

from flask import Blueprint, request, jsonify
from config.firebase_config import get_db
from firebase_admin import firestore
from utils.decorators import require_auth
from datetime import datetime

reading_bp = Blueprint('reading', __name__)

@reading_bp.route('/start-session', methods=['POST'])
@require_auth
def start_session(current_user):
    """
    Load progress and create a new reading session
    Expected body: { "bookId": "..." }
    """
    try:
        uid = current_user['uid']
        data = request.get_json()
        book_id = data.get('bookId')
        
        if not book_id:
            return jsonify({'error': 'bookId is required'}), 400
            
        db = get_db()
        
        # 1. Get or create persistent userProgress
        progress_id = f"{uid}_{book_id}"
        progress_ref = db.collection('userProgress').document(progress_id)
        progress_doc = progress_ref.get()
        
        user_progress = {}
        if progress_doc.exists:
            user_progress = progress_doc.to_dict()
        else:
            # Get book to know sentence count
            book_doc = db.collection('books').document(str(book_id)).get()
            sentence_count = 0
            if book_doc.exists:
                sentence_count = book_doc.to_dict().get('sentenceCount', 0)
            
            user_progress = {
                'userId': uid,
                'bookId': book_id,
                'currentSentence': 0,
                'wordResults': None,
                'totalSentences': sentence_count,
                'completed': False,
                'lastReadAt': datetime.now(),
                'totalSessions': 0,
                'totalTimeSeconds': 0
            }
            progress_ref.set(user_progress)
            
        # 2. Create a new reading session record
        session_ref = db.collection('readingSessions').document()
        session_id = session_ref.id
        
        session_data = {
            'userId': uid,
            'bookId': book_id,
            'startedAt': datetime.now(),
            'endedAt': None,
            'sentencesRead': 0,
            'totalSentences': user_progress.get('totalSentences', 0),
            'wordsTapped': 0,
            'recordingsAttempted': 0,
            'pointsEarned': 0,
            'completed': False
        }
        session_ref.set(session_data)
        
        return jsonify({
            'success': True,
            'sessionId': session_id,
            'userProgress': user_progress
        }), 201
        
    except Exception as e:
        print(f"Start session error: {str(e)}")
        return jsonify({'error': 'Failed to start session'}), 500

@reading_bp.route('/save-session', methods=['POST'])
@require_auth
def save_session(current_user):
    """
    Save reading progress and update session details
    Expected body: { "bookId": "...", "sessionId": "...", "currentSentence": 0, "wordResults": [...], "sentencesRead": 0, "elapsedSeconds": 0, "isFinished": false }
    """
    try:
        uid = current_user['uid']
        data = request.get_json()
        
        book_id = data.get('bookId')
        session_id = data.get('sessionId')
        current_sentence = data.get('currentSentence', 0)
        word_results = data.get('wordResults')
        sentences_read = data.get('sentencesRead', 0)
        elapsed_seconds = data.get('elapsedSeconds', 0)
        is_finished = data.get('isFinished', False)
        
        db = get_db()
        batch = db.batch()
        
        # 1. Update userProgress
        progress_id = f"{uid}_{book_id}"
        progress_ref = db.collection('userProgress').document(progress_id)
        
        progress_updates = {
            'currentSentence': current_sentence,
            'wordResults': word_results,
            'lastReadAt': datetime.now(),
            'totalSessions': firestore.Increment(1),
            'totalTimeSeconds': firestore.Increment(elapsed_seconds)
        }
        
        if is_finished:
            progress_updates['completed'] = True
            
        batch.update(progress_ref, progress_updates)
        
        # 2. Update reading session
        if session_id:
            session_ref = db.collection('readingSessions').document(session_id)
            batch.update(session_ref, {
                'endedAt': datetime.now(),
                'sentencesRead': sentences_read,
                'completed': is_finished
            })
            
        # 3. Update user's last read book
        user_ref = db.collection('users').document(uid)
        batch.update(user_ref, {
            'lastReadBook': book_id
        })
        
        batch.commit()
        
        return jsonify({'success': True, 'message': 'Session saved successfully'}), 200
        
    except Exception as e:
        print(f"Save session error: {str(e)}")
        return jsonify({'error': 'Failed to save session'}), 500

@reading_bp.route('/award-points', methods=['POST'])
@require_auth
def award_points(current_user):
    """
    Award points to user and record in session
    Expected body: { "sessionId": "...", "points": 10 }
    """
    try:
        uid = current_user['uid']
        data = request.get_json()
        points = data.get('points', 0)
        session_id = data.get('sessionId')
        
        db = get_db()
        batch = db.batch()
        
        # Update user points
        user_ref = db.collection('users').document(uid)
        batch.update(user_ref, {'points': firestore.Increment(points)})
        
        # Update session points
        if session_id:
            session_ref = db.collection('readingSessions').document(session_id)
            batch.update(session_ref, {'pointsEarned': firestore.Increment(points)})
            
        batch.commit()
        
        return jsonify({'success': True, 'newPoints': points}), 200
        
    except Exception as e:
        print(f"Award points error: {str(e)}")
        return jsonify({'error': 'Failed to award points'}), 500

@reading_bp.route('/word-event', methods=['POST'])
@require_auth
def record_word_event(current_user):
    """
    Record a word tap event
    Expected body: { "bookId": "...", "sessionId": "...", "word": "...", "tapCount": 1 }
    """
    try:
        uid = current_user['uid']
        data = request.get_json()
        
        book_id = data.get('bookId')
        session_id = data.get('sessionId')
        word = data.get('word', '').lower().strip()
        tap_count = data.get('tapCount', 1)
        
        if not book_id or not word:
            return jsonify({'error': 'bookId and word are required'}), 400
            
        db = get_db()
        word_event_id = f"{uid}_{book_id}_{word}"
        word_ref = db.collection('wordEvents').document(word_event_id)
        
        word_doc = word_ref.get()
        if word_doc.exists:
            word_ref.update({
                'tapCount': firestore.Increment(tap_count),
                'lastTappedAt': datetime.now()
            })
        else:
            word_ref.set({
                'userId': uid,
                'bookId': book_id,
                'sessionId': session_id,
                'word': word,
                'tapCount': tap_count,
                'lastTappedAt': datetime.now()
            })
            
        # Also update session wordsTapped count
        if session_id:
            session_ref = db.collection('readingSessions').document(session_id)
            session_ref.update({'wordsTapped': firestore.Increment(tap_count)})
            
        return jsonify({'success': True}), 200
        
    except Exception as e:
        print(f"Record word event error: {str(e)}")
        return jsonify({'error': 'Failed to record word event'}), 500

@reading_bp.route('/record-attempt', methods=['POST'])
@require_auth
def record_recording_attempt(current_user):
    """Increment recording attempts in session"""
    try:
        data = request.get_json()
        session_id = data.get('sessionId')
        
        if session_id:
            db = get_db()
            db.collection('readingSessions').document(session_id).update({
                'recordingsAttempted': firestore.Increment(1)
            })
            
        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
