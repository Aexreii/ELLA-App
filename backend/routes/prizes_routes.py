"""
Prizes and Rewards Routes
Handles stickers, prizes, point spending, and reward management
"""

from flask import Blueprint, request, jsonify
from config.firebase_config import get_db
from firebase_admin import firestore
from utils.decorators import require_auth
from datetime import datetime

prizes_bp = Blueprint('prizes', __name__)

@prizes_bp.route('/stickers', methods=['GET'])
@require_auth
def get_all_stickers(current_user):
    """Get all available stickers from Firestore"""
    try:
        db = get_db()
        stickers_ref = db.collection('stickers')
        stickers_docs = stickers_ref.stream()
        
        stickers_list = []
        for doc in stickers_docs:
            data = doc.to_dict()
            data['id'] = doc.id
            stickers_list.append(data)
            
        # Sort by cost
        stickers_list.sort(key=lambda x: x.get('cost', 0))
        
        return jsonify({
            'success': True,
            'stickers': stickers_list
        }), 200
        
    except Exception as e:
        print(f"Get stickers error: {str(e)}")
        return jsonify({'error': 'Failed to get stickers'}), 500

@prizes_bp.route('/buy', methods=['POST'])
@require_auth
def buy_sticker(current_user):
    """
    Purchase a sticker using points
    Expected body: { "stickerId": "..." }
    """
    try:
        uid = current_user['uid']
        data = request.get_json()
        sticker_id = data.get('stickerId')
        
        if not sticker_id:
            return jsonify({'error': 'stickerId is required'}), 400
            
        db = get_db()
        
        # 1. Get sticker details
        sticker_doc = db.collection('stickers').document(sticker_id).get()
        if not sticker_doc.exists:
            return jsonify({'error': 'Sticker not found'}), 404
            
        sticker_data = sticker_doc.to_dict()
        cost = sticker_data.get('cost', 0)
        
        # 2. Get user details
        user_ref = db.collection('users').document(uid)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
            
        user_data = user_doc.to_dict()
        points = user_data.get('points', 0)
        owned_stickers = user_data.get('ownedStickers', [])
        
        # 3. Validation
        if sticker_id in owned_stickers:
            return jsonify({'error': 'Sticker already owned'}), 400
            
        if points < cost:
            return jsonify({'error': f'Not enough points. Need {cost}, have {points}.'}), 400
            
        # 4. Atomic transaction (using batch for simplicity here)
        batch = db.batch()
        
        new_owned = owned_stickers + [sticker_id]
        batch.update(user_ref, {
            'points': firestore.Increment(-cost),
            'ownedStickers': new_owned
        })
        
        # Record purchase
        purchase_ref = db.collection('purchases').document()
        batch.set(purchase_ref, {
            'uid': uid,
            'stickerId': sticker_id,
            'cost': cost,
            'timestamp': datetime.now()
        })
        
        batch.commit()
        
        return jsonify({
            'success': True,
            'message': f'Purchased {sticker_data.get("name")} successfully!',
            'newPoints': points - cost
        }), 200
        
    except Exception as e:
        print(f"Buy sticker error: {str(e)}")
        return jsonify({'error': 'Failed to purchase sticker'}), 500

