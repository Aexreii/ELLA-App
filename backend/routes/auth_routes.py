"""
Authentication Routes
Handles user login, logout, and token verification
"""

from flask import Blueprint, request, jsonify
from config.firebase_config import verify_token, get_db, get_user_by_uid
from utils.decorators import require_auth
from datetime import datetime

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/verify', methods=['POST'])
def verify_user_token():
    """
    Verify Firebase ID token from client
    Expected body: { "idToken": "..." }
    """
    try:
        data = request.get_json()
        id_token = data.get('idToken')
        
        if not id_token:
            return jsonify({'error': 'ID token is required'}), 400
        
        # Verify token with Firebase
        decoded_token = verify_token(id_token)
        
        if not decoded_token:
            return jsonify({'error': 'Invalid token'}), 401
        
        uid = decoded_token['uid']
        email = decoded_token.get('email', '')
        
        # Get or create user in Firestore
        db = get_db()
        user_ref = db.collection('users').document(uid)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            # Create new user document
            user_data = {
                'uid': uid,
                'email': email,
                'name': decoded_token.get('name', ''),
                'character': 'owl',  # Default character
                'role': 'Student',  # Default role (Student or Teacher)
                'points': 0,  # Current available points
                'totalPoints': 0,  # All-time points earned
                'enrolledCode': None,  # For students
                'classCode': None,  # For teachers
                'unlockedStickers': [1],  # Start with first sticker
                'progress': [],  # Array of {bookId, sentencesRead, totalSentences}
                'createdAt': datetime.now(),
                'lastLogin': datetime.now()
            }
            user_ref.set(user_data)
        else:
            # Update last login
            user_ref.update({'lastLogin': datetime.now()})
            user_data = user_doc.to_dict()
        
        return jsonify({
            'success': True,
            'user': {
                'uid': uid,
                'email': email,
                'name': user_data.get('name', ''),
                'character': user_data.get('character', 'owl'),
                'role': user_data.get('role', 'Student'),
                'points': user_data.get('points', 0),
                'totalPoints': user_data.get('totalPoints', 0),
                'enrolledCode': user_data.get('enrolledCode'),
                'classCode': user_data.get('classCode'),
                'unlockedStickers': user_data.get('unlockedStickers', [1]),
                'progress': user_data.get('progress', [])
            }
        }), 200
        
    except Exception as e:
        print(f"Verify token error: {str(e)}")
        return jsonify({'error': 'Verification failed'}), 500

@auth_bp.route('/signup', methods=['POST'])
def signup():
    """
    Complete user profile after Firebase signup
    Expected body: { "idToken": "...", "name": "...", "character": "...", "role": "...", "enrolledCode": "..." (optional) }
    """
    try:
        data = request.get_json()
        id_token = data.get('idToken')
        name = data.get('name', '')
        character = data.get('character', 'owl')
        role = data.get('role', 'Student')
        enrolled_code = data.get('enrolledCode')
        class_code = data.get('classCode')
        
        if not id_token:
            return jsonify({'error': 'ID token is required'}), 400
        
        # Verify token
        decoded_token = verify_token(id_token)
        if not decoded_token:
            return jsonify({'error': 'Invalid token'}), 401
        
        uid = decoded_token['uid']
        email = decoded_token.get('email', '')
        
        # Create/update user profile in Firestore
        db = get_db()
        user_ref = db.collection('users').document(uid)
        
        user_data = {
            'uid': uid,
            'email': email,
            'name': name,
            'character': character,
            'role': role,
            'points': 0,
            'totalPoints': 0,
            'enrolledCode': enrolled_code,
            'classCode': class_code,
            'unlockedStickers': [1],
            'progress': [],
            'createdAt': datetime.now(),
            'lastLogin': datetime.now()
        }
        
        user_ref.set(user_data)
        
        return jsonify({
            'success': True,
            'message': 'User profile created successfully',
            'user': {
                'uid': uid,
                'email': email,
                'name': name,
                'character': character,
                'role': role,
                'points': 0,
                'totalPoints': 0,
                'enrolledCode': enrolled_code,
                'classCode': class_code,
                'unlockedStickers': [1],
                'progress': []
            }
        }), 201
        
    except Exception as e:
        print(f"Signup error: {str(e)}")
        return jsonify({'error': 'Signup failed'}), 500

@auth_bp.route('/logout', methods=['POST'])
@require_auth
def logout(current_user):
    """
    Logout user (client-side should clear token)
    This endpoint mainly for logging purposes
    """
    try:
        uid = current_user['uid']
        
        # Update last activity
        db = get_db()
        user_ref = db.collection('users').document(uid)
        user_ref.update({'lastActivity': datetime.now()})
        
        return jsonify({
            'success': True,
            'message': 'Logged out successfully'
        }), 200
        
    except Exception as e:
        print(f"Logout error: {str(e)}")
        return jsonify({'error': 'Logout failed'}), 500

@auth_bp.route('/user', methods=['GET'])
@require_auth
def get_current_user(current_user):
    """Get current authenticated user's profile"""
    try:
        uid = current_user['uid']
        
        db = get_db()
        user_doc = db.collection('users').document(uid).get()
        
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = user_doc.to_dict()
        
        # Remove sensitive data
        if 'createdAt' in user_data:
            user_data['createdAt'] = user_data['createdAt'].isoformat()
        if 'lastLogin' in user_data:
            user_data['lastLogin'] = user_data['lastLogin'].isoformat()
        
        return jsonify({
            'success': True,
            'user': user_data
        }), 200
        
    except Exception as e:
        print(f"Get user error: {str(e)}")
        return jsonify({'error': 'Failed to get user'}), 500
