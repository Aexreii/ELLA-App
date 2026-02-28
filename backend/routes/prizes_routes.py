"""
Prizes and Rewards Routes
Handles stickers, prizes, point spending, and reward management
"""

from flask import Blueprint, request, jsonify
from config.firebase_config import get_db
from utils.decorators import require_auth
from datetime import datetime

prizes_bp = Blueprint('prizes', __name__)

# Default stickers/prizes configuration
STICKERS = [
    {'stickerId': 1, 'name': 'Bronze Star', 'pointCost': 0, 'description': 'Welcome sticker!'},
    {'stickerId': 2, 'name': 'Silver Star', 'pointCost': 100, 'description': 'Read your first book!'},
    {'stickerId': 3, 'name': 'Gold Star', 'pointCost': 200, 'description': 'Keep reading!'},
    {'stickerId': 4, 'name': 'Reading Master', 'pointCost': 300, 'description': 'You\'re doing great!'},
    {'stickerId': 5, 'name': 'Word Wizard', 'pointCost': 400, 'description': 'Amazing progress!'},
    {'stickerId': 6, 'name': 'Book Champion', 'pointCost': 500, 'description': 'Outstanding reader!'},
    {'stickerId': 7, 'name': 'Super Reader', 'pointCost': 600, 'description': 'Incredible dedication!'},
    {'stickerId': 8, 'name': 'Ultimate Scholar', 'pointCost': 700, 'description': 'You\'re a legend!'},
]

@prizes_bp.route('/stickers', methods=['GET'])
@require_auth
def get_all_stickers(current_user):
    """Get all available stickers with unlock status"""
    try:
        uid = current_user['uid']
        
        db = get_db()
        user_doc = db.collection('users').document(uid).get()
        
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = user_doc.to_dict()
        unlocked_stickers = user_data.get('unlockedStickers', [1])
        total_points = user_data.get('totalPoints', 0)
        
        # Add unlock status to each sticker
        stickers_with_status = []
        for sticker in STICKERS:
            sticker_copy = sticker.copy()
            sticker_copy['unlocked'] = sticker['stickerId'] in unlocked_stickers
            sticker_copy['canUnlock'] = total_points >= sticker['pointCost']
            stickers_with_status.append(sticker_copy)
        
        return jsonify({
            'success': True,
            'stickers': stickers_with_status,
            'unlockedCount': len(unlocked_stickers),
            'totalCount': len(STICKERS)
        }), 200
        
    except Exception as e:
        print(f"Get stickers error: {str(e)}")
        return jsonify({'error': 'Failed to get stickers'}), 500

@prizes_bp.route('/unlocked', methods=['GET'])
@require_auth
def get_unlocked_stickers(current_user):
    """Get only the stickers that user has unlocked"""
    try:
        uid = current_user['uid']
        
        db = get_db()
        user_doc = db.collection('users').document(uid).get()
        
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = user_doc.to_dict()
        unlocked_sticker_ids = user_data.get('unlockedStickers', [1])
        
        # Filter stickers to only unlocked ones
        unlocked_stickers = [s for s in STICKERS if s['stickerId'] in unlocked_sticker_ids]
        
        return jsonify({
            'success': True,
            'stickers': unlocked_stickers,
            'count': len(unlocked_stickers)
        }), 200
        
    except Exception as e:
        print(f"Get unlocked stickers error: {str(e)}")
        return jsonify({'error': 'Failed to get unlocked stickers'}), 500

@prizes_bp.route('/unlock/<int:sticker_id>', methods=['POST'])
@require_auth
def unlock_sticker(current_user, sticker_id):
    """
    Manually unlock a sticker (if user has enough points)
    Note: Stickers auto-unlock based on totalPoints, this is for manual unlock
    """
    try:
        uid = current_user['uid']
        
        # Find sticker
        sticker = next((s for s in STICKERS if s['stickerId'] == sticker_id), None)
        if not sticker:
            return jsonify({'error': 'Sticker not found'}), 404
        
        db = get_db()
        user_ref = db.collection('users').document(uid)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = user_doc.to_dict()
        unlocked_stickers = user_data.get('unlockedStickers', [1])
        total_points = user_data.get('totalPoints', 0)
        
        # Check if already unlocked
        if sticker_id in unlocked_stickers:
            return jsonify({
                'success': True,
                'message': 'Sticker already unlocked'
            }), 200
        
        # Check if user has enough points
        if total_points < sticker['pointCost']:
            return jsonify({
                'error': 'Not enough points to unlock this sticker',
                'required': sticker['pointCost'],
                'current': total_points
            }), 400
        
        # Unlock sticker
        unlocked_stickers.append(sticker_id)
        user_ref.update({
            'unlockedStickers': unlocked_stickers
        })
        
        return jsonify({
            'success': True,
            'message': f'Unlocked {sticker["name"]}!',
            'sticker': sticker
        }), 200
        
    except Exception as e:
        print(f"Unlock sticker error: {str(e)}")
        return jsonify({'error': 'Failed to unlock sticker'}), 500

@prizes_bp.route('/redeem', methods=['POST'])
@require_auth
def redeem_prize(current_user):
    """
    Redeem a prize by spending points
    Expected body: { "prizeId": "...", "pointCost": 50 }
    """
    try:
        uid = current_user['uid']
        data = request.get_json()
        
        prize_id = data.get('prizeId')
        point_cost = data.get('pointCost', 0)
        
        if not prize_id:
            return jsonify({'error': 'prizeId is required'}), 400
        
        db = get_db()
        user_ref = db.collection('users').document(uid)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = user_doc.to_dict()
        current_points = user_data.get('points', 0)
        
        # Check if user has enough points
        if current_points < point_cost:
            return jsonify({
                'error': 'Not enough points',
                'required': point_cost,
                'current': current_points
            }), 400
        
        # Deduct points
        new_points = current_points - point_cost
        user_ref.update({
            'points': new_points
        })
        
        # Record redemption
        redemption_ref = db.collection('redemptions').document()
        redemption_ref.set({
            'uid': uid,
            'prizeId': prize_id,
            'pointCost': point_cost,
            'redeemedAt': datetime.now()
        })
        
        return jsonify({
            'success': True,
            'message': 'Prize redeemed successfully',
            'newPoints': new_points
        }), 200
        
    except Exception as e:
        print(f"Redeem prize error: {str(e)}")
        return jsonify({'error': 'Failed to redeem prize'}), 500

@prizes_bp.route('/redemptions', methods=['GET'])
@require_auth
def get_redemption_history(current_user):
    """Get user's prize redemption history"""
    try:
        uid = current_user['uid']
        
        db = get_db()
        redemptions = db.collection('redemptions')\
            .where('uid', '==', uid)\
            .order_by('redeemedAt', direction='DESCENDING')\
            .limit(20)\
            .stream()
        
        redemption_list = []
        for redemption in redemptions:
            redemption_data = redemption.to_dict()
            if 'redeemedAt' in redemption_data:
                redemption_data['redeemedAt'] = redemption_data['redeemedAt'].isoformat()
            redemption_list.append(redemption_data)
        
        return jsonify({
            'success': True,
            'redemptions': redemption_list,
            'count': len(redemption_list)
        }), 200
        
    except Exception as e:
        print(f"Get redemptions error: {str(e)}")
        return jsonify({'error': 'Failed to get redemptions'}), 500

@prizes_bp.route('/leaderboard', methods=['GET'])
@require_auth
def get_leaderboard(current_user):
    """
    Get leaderboard of top users by total points
    Query params:
        - limit: Number of users to return (default: 10)
    """
    try:
        limit = int(request.args.get('limit', 10))
        limit = min(limit, 50)  # Max 50 users
        
        db = get_db()
        users = db.collection('users')\
            .order_by('totalPoints', direction='DESCENDING')\
            .limit(limit)\
            .stream()
        
        leaderboard = []
        rank = 1
        for user in users:
            user_data = user.to_dict()
            leaderboard.append({
                'rank': rank,
                'name': user_data.get('name', 'Anonymous'),
                'character': user_data.get('character', 'owl'),
                'totalPoints': user_data.get('totalPoints', 0),
                'booksCompleted': len([p for p in user_data.get('progress', []) 
                                      if p.get('sentencesRead', 0) >= p.get('totalSentences', 0)])
            })
            rank += 1
        
        return jsonify({
            'success': True,
            'leaderboard': leaderboard,
            'count': len(leaderboard)
        }), 200
        
    except Exception as e:
        print(f"Get leaderboard error: {str(e)}")
        return jsonify({'error': 'Failed to get leaderboard'}), 500

@prizes_bp.route('/stats', methods=['GET'])
@require_auth
def get_user_stats(current_user):
    """Get detailed statistics for current user"""
    try:
        uid = current_user['uid']
        
        db = get_db()
        user_doc = db.collection('users').document(uid).get()
        
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = user_doc.to_dict()
        progress = user_data.get('progress', [])
        
        # Calculate stats
        total_books_started = len(progress)
        completed_books = [p for p in progress if p.get('sentencesRead', 0) >= p.get('totalSentences', 0)]
        total_books_completed = len(completed_books)
        
        total_sentences_read = sum(p.get('sentencesRead', 0) for p in progress)
        
        # Get reading sessions
        sessions = db.collection('reading_sessions')\
            .where('uid', '==', uid)\
            .where('active', '==', False)\
            .stream()
        
        session_count = 0
        total_accuracy = 0
        for session in sessions:
            session_data = session.to_dict()
            total_accuracy += session_data.get('accuracy', 0)
            session_count += 1
        
        average_accuracy = (total_accuracy / session_count) if session_count > 0 else 0
        
        return jsonify({
            'success': True,
            'stats': {
                'points': user_data.get('points', 0),
                'totalPoints': user_data.get('totalPoints', 0),
                'booksStarted': total_books_started,
                'booksCompleted': total_books_completed,
                'sentencesRead': total_sentences_read,
                'readingSessions': session_count,
                'averageAccuracy': round(average_accuracy * 100, 2),
                'unlockedStickers': len(user_data.get('unlockedStickers', [1])),
                'totalStickers': len(STICKERS)
            }
        }), 200
        
    except Exception as e:
        print(f"Get user stats error: {str(e)}")
        return jsonify({'error': 'Failed to get user stats'}), 500
