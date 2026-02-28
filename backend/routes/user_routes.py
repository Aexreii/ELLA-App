"""
User Progress Routes
Handles user progress, scores, and achievements
"""

from flask import Blueprint, request, jsonify
from config.firebase_config import get_db
from utils.decorators import require_auth
from datetime import datetime

user_bp = Blueprint('user', __name__)

@user_bp.route('/progress', methods=['GET'])
@require_auth
def get_progress(current_user):
    """Get user's learning progress"""
    try:
        uid = current_user['uid']
        
        db = get_db()
        user_doc = db.collection('users').document(uid).get()
        
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = user_doc.to_dict()
        progress = user_data.get('progress', [])
        points = user_data.get('points', 0)
        total_points = user_data.get('totalPoints', 0)
        unlocked_stickers = user_data.get('unlockedStickers', [1])
        
        return jsonify({
            'success': True,
            'progress': progress,
            'points': points,
            'totalPoints': total_points,
            'unlockedStickers': unlocked_stickers
        }), 200
        
    except Exception as e:
        print(f"Get progress error: {str(e)}")
        return jsonify({'error': 'Failed to get progress'}), 500

@user_bp.route('/progress', methods=['POST'])
@require_auth
def update_progress(current_user):
    """
    Update user's progress
    Expected body: { "bookId": "...", "sentencesRead": 3, "totalSentences": 5, "pointsEarned": 50 }
    """
    try:
        uid = current_user['uid']
        data = request.get_json()
        
        book_id = data.get('bookId')
        sentences_read = data.get('sentencesRead', 0)
        total_sentences = data.get('totalSentences', 0)
        points_earned = data.get('pointsEarned', 0)
        
        if not book_id:
            return jsonify({'error': 'bookId is required'}), 400
        
        db = get_db()
        user_ref = db.collection('users').document(uid)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = user_doc.to_dict()
        progress = user_data.get('progress', [])
        current_points = user_data.get('points', 0)
        current_total_points = user_data.get('totalPoints', 0)
        unlocked_stickers = user_data.get('unlockedStickers', [1])
        
        # Find existing progress for this book
        book_progress = None
        for idx, p in enumerate(progress):
            if str(p.get('bookId')) == str(book_id):
                book_progress = idx
                break
        
        # Update or create progress entry
        new_progress_entry = {
            'bookId': book_id,
            'sentencesRead': sentences_read,
            'totalSentences': total_sentences
        }
        
        if book_progress is not None:
            progress[book_progress] = new_progress_entry
        else:
            progress.append(new_progress_entry)
        
        # Update points
        new_points = current_points + points_earned
        new_total_points = current_total_points + points_earned
        
        # Check for new sticker unlocks (every 100 total points unlocks a sticker)
        max_sticker = min(8, (new_total_points // 100) + 1)
        for i in range(1, max_sticker + 1):
            if i not in unlocked_stickers:
                unlocked_stickers.append(i)
        
        # Update in database
        user_ref.update({
            'progress': progress,
            'points': new_points,
            'totalPoints': new_total_points,
            'unlockedStickers': unlocked_stickers,
            'lastActivity': datetime.now()
        })
        
        # Save activity record
        completed = sentences_read >= total_sentences
        activity_ref = db.collection('activities').document()
        activity_ref.set({
            'uid': uid,
            'bookId': book_id,
            'sentencesRead': sentences_read,
            'totalSentences': total_sentences,
            'pointsEarned': points_earned,
            'completed': completed,
            'timestamp': datetime.now()
        })
        
        return jsonify({
            'success': True,
            'progress': progress,
            'points': new_points,
            'totalPoints': new_total_points,
            'unlockedStickers': unlocked_stickers,
            'message': 'Progress updated successfully'
        }), 200
        
    except Exception as e:
        print(f"Update progress error: {str(e)}")
        return jsonify({'error': 'Failed to update progress'}), 500

@user_bp.route('/achievements', methods=['GET'])
@require_auth
def get_achievements(current_user):
    """Get user's achievements and badges"""
    try:
        uid = current_user['uid']
        
        db = get_db()
        user_doc = db.collection('users').document(uid).get()
        
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = user_doc.to_dict()
        progress = user_data.get('progress', [])
        unlocked_stickers = user_data.get('unlockedStickers', [1])
        total_points = user_data.get('totalPoints', 0)
        current_points = user_data.get('points', 0)
        
        # Calculate completed books
        completed_books = [p for p in progress if p.get('sentencesRead', 0) >= p.get('totalSentences', 0)]
        
        return jsonify({
            'success': True,
            'achievements': {
                'unlockedStickers': unlocked_stickers,
                'totalPoints': total_points,
                'currentPoints': current_points,
                'booksCompleted': len(completed_books)
            }
        }), 200
        
    except Exception as e:
        print(f"Get achievements error: {str(e)}")
        return jsonify({'error': 'Failed to get achievements'}), 500

@user_bp.route('/profile', methods=['PUT'])
@require_auth
def update_profile(current_user):
    """
    Update user profile
    Expected body: { "name": "...", "character": "...", "enrolledCode": "..." }
    """
    try:
        uid = current_user['uid']
        data = request.get_json()
        
        name = data.get('name')
        character = data.get('character')
        enrolled_code = data.get('enrolledCode')
        class_code = data.get('classCode')
        
        db = get_db()
        user_ref = db.collection('users').document(uid)
        
        update_data = {}
        if name:
            update_data['name'] = name
        if character:
            update_data['character'] = character
        if enrolled_code is not None:
            update_data['enrolledCode'] = enrolled_code
        if class_code is not None:
            update_data['classCode'] = class_code
        
        if update_data:
            user_ref.update(update_data)
        
        return jsonify({
            'success': True,
            'message': 'Profile updated successfully'
        }), 200
        
    except Exception as e:
        print(f"Update profile error: {str(e)}")
        return jsonify({'error': 'Failed to update profile'}), 500

@user_bp.route('/history', methods=['GET'])
@require_auth
def get_activity_history(current_user):
    """Get user's activity history"""
    try:
        uid = current_user['uid']
        
        db = get_db()
        activities = db.collection('activities')\
            .where('uid', '==', uid)\
            .order_by('timestamp', direction='DESCENDING')\
            .limit(20)\
            .stream()
        
        activity_list = []
        for activity in activities:
            activity_data = activity.to_dict()
            if 'timestamp' in activity_data:
                activity_data['timestamp'] = activity_data['timestamp'].isoformat()
            activity_list.append(activity_data)
        
        return jsonify({
            'success': True,
            'activities': activity_list
        }), 200
        
    except Exception as e:
        print(f"Get history error: {str(e)}")
        return jsonify({'error': 'Failed to get history'}), 500
