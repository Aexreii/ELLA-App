"""
ELLA (English Literacy Learning App) - Backend API
Main Flask application entry point
"""

from flask import Flask, jsonify
from flask_cors import CORS
from config.firebase_config import initialize_firebase
from routes.auth_routes import auth_bp
from routes.user_routes import user_bp
from routes.speech_routes import speech_bp
from routes.books_routes import books_bp
from routes.reading_routes import reading_bp
from routes.prizes_routes import prizes_bp
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size for audio uploads

# Enable CORS for React Native frontend
CORS(app, resources={
    r"/api/*": {
        "origins": "*",  # For development - restrict in production
        "methods": ["GET", "POST", "PUT", "DELETE"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Initialize Firebase
initialize_firebase()

# Register blueprints (route modules)
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(user_bp, url_prefix='/api/user')
app.register_blueprint(speech_bp, url_prefix='/api/speech')
app.register_blueprint(books_bp, url_prefix='/api/books')
app.register_blueprint(reading_bp, url_prefix='/api/reading')
app.register_blueprint(prizes_bp, url_prefix='/api/prizes')

# Root endpoint
@app.route('/')
def index():
    return jsonify({
        'message': 'ELLA Backend API',
        'version': '1.0.0',
        'status': 'running'
    })

# Health check endpoint
@app.route('/api/health')
def health_check():
    return jsonify({
        'status': 'healthy',
        'firebase': 'connected'
    })

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV', 'development') == 'development'
    
    print(f"\n🚀 ELLA Backend starting on port {port}...")
    print(f"📱 Ready to accept requests from React Native frontend\n")
    
    app.run(host='0.0.0.0', port=port, debug=debug)
