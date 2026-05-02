"""
User Progress and Profile Routes
Handles user progress, stats, profile updates, and reports
"""

from flask import Blueprint, request, jsonify
from config.firebase_config import get_db
from firebase_admin import firestore
from utils.decorators import require_auth
from datetime import datetime

user_bp = Blueprint('user', __name__)

@user_bp.route('/profile', methods=['GET'])
@require_auth
def get_profile(current_user):
    """Get the current user's profile data"""
    try:
        uid = current_user['uid']
        db = get_db()
        user_doc = db.collection('users').document(uid).get()
        
        if not user_doc.exists:
            return jsonify({'error': 'User profile not found'}), 404
            
        user_data = user_doc.to_dict()
        user_data['id'] = user_doc.id
        
        # Format dates
        for key in ['createdAt', 'updatedAt', 'lastLogin']:
            if data.get(key) and hasattr(data[key], 'isoformat'):
                data[key] = data[key].isoformat()

        return jsonify({
            'success': True,
            'user': user_data
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_bp.route('/profile', methods=['PUT'])
@require_auth
def update_profile(current_user):
    """
    Update user profile
    Expected body: { "name": "...", "age": 10, "character": "...", "role": "...", "classEnrolled": "...", "points": 100 }
    """
    try:
        uid = current_user['uid']
        data = request.get_json()
        
        db = get_db()
        user_ref = db.collection('users').document(uid)
        user_doc = user_ref.get()
        user_data_old = user_doc.to_dict() if user_doc.exists else {}
        
        # Fields that are allowed to be updated directly
        allowed_fields = [
            'name', 'age', 'character', 'role', 
            'classEnrolled', 'enrolledCode', 'classCode',
            'points', 'totalPoints', 'customAvatarUrl',
            'unlockedStickers', 'ownedStickers'
        ]
        
        update_data = {}
        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field]
                
                # Special cases for redundant fields used in frontend
                if field == 'enrolledCode':
                    update_data['classEnrolled'] = data[field]
                if field == 'classEnrolled':
                    update_data['enrolledCode'] = data[field]
        
        if update_data:
            update_data['updatedAt'] = datetime.now()
            user_ref.update(update_data)
            
            # Update class teacher name if teacher
            if 'name' in update_data and user_data_old.get('role') == 'Teacher':
                class_id = user_data_old.get('ownedClassId')
                if class_id:
                    db.collection('classes').document(class_id).update({
                        'teacherName': update_data['name'],
                        'className': f"{update_data['name']}'s Class"
                    })
            
        # Get updated user
        updated_doc = user_ref.get()
        user_data = updated_doc.to_dict()
        user_data['id'] = updated_doc.id
        
        # Format dates
        for key in ['createdAt', 'updatedAt', 'lastLogin']:
            if user_data.get(key) and hasattr(user_data[key], 'isoformat'):
                user_data[key] = user_data[key].isoformat()
        
        return jsonify({
            'success': True,
            'message': 'Profile updated successfully',
            'user': user_data
        }), 200
        
    except Exception as e:
        print(f"Update profile error: {str(e)}")
        return jsonify({'error': 'Failed to update profile'}), 500

@user_bp.route('/full-stats', methods=['GET'])
@require_auth
def get_full_stats(current_user):
    """
    Get comprehensive stats for the current user, 
    joining progress, sessions and book details.
    """
    try:
        uid = current_user['uid']
        db = get_db()
        
        # 1. Get Progress Docs
        progress_docs = db.collection('userProgress').where('userId', '==', uid).get()
        progress_list = [d.to_dict() for d in progress_docs]
        
        # 2. Get Session Docs
        session_docs = db.collection('readingSessions').where('userId', '==', uid).get()
        session_list = []
        for d in session_docs:
            data = d.to_dict()
            # Convert datetime to string
            for key in ['startedAt', 'endedAt']:
                if data.get(key) and hasattr(data[key], 'isoformat'):
                    data[key] = data[key].isoformat()
            session_list.append(data)
            
        # 3. Join with Book details for completed/abandoned books
        completed_books = []
        abandoned_books = []
        
        for p in progress_list:
            book_id = p.get('bookId')
            if not book_id: continue
            
            book_doc = db.collection('books').document(str(book_id)).get()
            if book_doc.exists:
                book_data = book_doc.to_dict()
                book_data['id'] = book_doc.id
                if p.get('completed'):
                    completed_books.append(book_data)
                else:
                    abandoned_books.append(book_data)
        
        # 4. Calculate stats
        total_time_seconds = sum(p.get('totalTimeSeconds', 0) for p in progress_list)
        
        return jsonify({
            'success': True,
            'stats': {
                'totalTimeSeconds': total_time_seconds,
                'booksReadCount': len(completed_books),
                'abandonedCount': len(abandoned_books),
                'sessionCount': len(session_list)
            },
            'completedBooks': completed_books,
            'abandonedBooks': abandoned_books,
            'sessions': session_list
        }), 200
        
    except Exception as e:
        print(f"Get full stats error: {str(e)}")
        return jsonify({'error': 'Failed to get full stats'}), 500

@user_bp.route('/history', methods=['GET'])
@require_auth
def get_activity_history(current_user):
    """Get chronological history of user activities"""
    try:
        uid = current_user['uid']
        db = get_db()
        
        sessions = db.collection('readingSessions').where('userId', '==', uid).order_by('startedAt', direction='DESCENDING').limit(20).get()
        
        activity_list = []
        for s in sessions:
            data = s.to_dict()
            ts = data.get('startedAt')
            activity_list.append({
                'type': 'reading_session',
                'bookId': data.get('bookId'),
                'timestamp': ts.isoformat() if hasattr(ts, 'isoformat') else ts,
                'details': f"Read {data.get('sentencesRead', 0)} sentences"
            })
            
        return jsonify({
            'success': True,
            'activities': activity_list
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_bp.route('/report', methods=['POST'])
@require_auth
def create_report(current_user):
    """
    Create a new user report/feedback
    Expected body: { "name": "...", "email": "...", "subject": "...", "comment": "..." }
    """
    try:
        uid = current_user['uid']
        data = request.get_json()
        
        db = get_db()
        report_data = {
            'userId': uid,
            'name': data.get('name'),
            'email': data.get('email'),
            'subject': data.get('subject'),
            'comment': data.get('comment'),
            'createdAt': datetime.now()
        }
        
        db.collection('reports').add(report_data)
        
        return jsonify({
            'success': True,
            'message': 'Report submitted successfully'
        }), 201
        
    except Exception as e:
        print(f"Create report error: {str(e)}")
        return jsonify({'error': 'Failed to submit report'}), 500
