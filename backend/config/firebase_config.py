"""
Firebase Configuration and Initialization
Handles Firebase Admin SDK setup for Authentication and Firestore
"""

import firebase_admin
from firebase_admin import credentials, auth, firestore
import os
import json

# Global Firebase instances
db = None
firebase_initialized = False

def initialize_firebase():
    """
    Initialize Firebase Admin SDK
    Requires FIREBASE_CREDENTIALS environment variable with path to service account JSON
    """
    global db, firebase_initialized
    
    if firebase_initialized:
        return db
    
    try:
        # Get Firebase credentials from environment
        creds_path = os.getenv('FIREBASE_CREDENTIALS')
        
        if not creds_path or creds_path == 'path/to/firebase-service-account.json':
            # Try to get credentials from JSON string (alternative for deployment)
            creds_json = os.getenv('FIREBASE_CREDENTIALS_JSON')
            if creds_json:
                cred_dict = json.loads(creds_json)
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)
                db = firestore.client()
                firebase_initialized = True
                print("✅ Firebase initialized successfully")
                return db
            else:
                print("⚠️  Warning: No Firebase credentials found. Running in demo mode.")
                print("   Authentication and database features will not work.")
                firebase_initialized = True
                db = None
                return db
        else:
            cred = credentials.Certificate(creds_path)
            # Initialize Firebase app
            firebase_admin.initialize_app(cred)
            # Initialize Firestore
            db = firestore.client()
            firebase_initialized = True
            print("✅ Firebase initialized successfully")
            return db
        
    except Exception as e:
        print(f"⚠️  Firebase initialization failed: {str(e)}")
        print("   Running in demo mode - auth/database features disabled")
        firebase_initialized = True
        db = None
        return db

def get_db():
    """Get Firestore database instance"""
    global db
    if db is None:
        raise Exception("Firebase not initialized. Call initialize_firebase() first.")
    return db

def verify_token(id_token):
    """
    Verify Firebase ID token from client
    Returns decoded token if valid, None otherwise
    """
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        print(f"Token verification error: {str(e)}")
        return None

def get_user_by_uid(uid):
    """Get user data from Firebase Auth by UID"""
    try:
        user = auth.get_user(uid)
        return user
    except Exception as e:
        print(f"Error getting user: {str(e)}")
        return None
