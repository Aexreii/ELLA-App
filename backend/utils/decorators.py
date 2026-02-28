"""
Utility Decorators
Authentication and authorization decorators
"""

from functools import wraps
from flask import request, jsonify
from config.firebase_config import verify_token

def require_auth(f):
    """
    Decorator to require authentication for routes
    Expects Authorization header with Bearer token
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            return jsonify({'error': 'No authorization header'}), 401
        
        # Extract token from "Bearer <token>"
        try:
            token = auth_header.split(' ')[1]
        except IndexError:
            return jsonify({'error': 'Invalid authorization header format'}), 401
        
        # Verify token
        decoded_token = verify_token(token)
        
        if not decoded_token:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Pass user info to the route function
        return f(current_user=decoded_token, *args, **kwargs)
    
    return decorated_function

def require_role(required_role):
    """
    Decorator to require specific role for routes
    Use after @require_auth
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(current_user, *args, **kwargs):
            user_role = current_user.get('role', 'child')
            
            if user_role != required_role and user_role != 'admin':
                return jsonify({'error': 'Insufficient permissions'}), 403
            
            return f(current_user=current_user, *args, **kwargs)
        
        return decorated_function
    return decorator
