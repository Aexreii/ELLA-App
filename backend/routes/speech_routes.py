"""
Speech Recognition Routes
Handles voice recording and pronunciation evaluation
"""

from flask import Blueprint, request, jsonify
from services.speech_service import speech_service
from utils.decorators import require_auth
import base64

speech_bp = Blueprint('speech', __name__)

@speech_bp.route('/evaluate', methods=['POST'])
@require_auth
def evaluate_pronunciation(current_user):
    """
    Evaluate pronunciation from audio file
    Expected body: 
    {
        "audio": "base64_encoded_audio_data",
        "expectedWord": "rabbit",
        "format": "wav"  // optional
    }
    
    Or multipart/form-data with:
    - audio: audio file
    - expectedWord: expected word
    """
    try:
        # Check if multipart form data
        if request.files and 'audio' in request.files:
            audio_file = request.files['audio']
            audio_content = audio_file.read()
            expected_word = request.form.get('expectedWord', '')
        else:
            # JSON with base64 encoded audio
            data = request.get_json()
            
            if not data:
                return jsonify({'error': 'No data provided'}), 400
            
            audio_base64 = data.get('audio')
            expected_word = data.get('expectedWord', '')
            
            if not audio_base64:
                return jsonify({'error': 'No audio data provided'}), 400
            
            # Decode base64 audio
            try:
                audio_content = base64.b64decode(audio_base64)
            except Exception as e:
                return jsonify({'error': f'Invalid audio data: {str(e)}'}), 400
        
        if not expected_word:
            return jsonify({'error': 'Expected word is required'}), 400
        
        # Evaluate pronunciation
        result = speech_service.evaluate_pronunciation(audio_content, expected_word)
        
        if not result['success']:
            return jsonify({
                'success': False,
                'error': result['message']
            }), 400
        
        # Return evaluation results
        return jsonify({
            'success': True,
            'correct': result['correct'],
            'transcript': result['transcript'],
            'expected': result['expected'],
            'confidence': result['confidence'],
            'similarity': result['similarity'],
            'message': result['message'],
            'score': 100 if result['correct'] else int(result['similarity'] * 50)  # Partial credit
        }), 200
        
    except Exception as e:
        print(f"Evaluate pronunciation error: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to evaluate pronunciation'
        }), 500

@speech_bp.route('/transcribe', methods=['POST'])
@require_auth
def transcribe_audio(current_user):
    """
    Transcribe audio to text without evaluation
    Expected body: 
    {
        "audio": "base64_encoded_audio_data"
    }
    
    Or multipart/form-data with:
    - audio: audio file
    """
    try:
        # Check if multipart form data
        if request.files and 'audio' in request.files:
            audio_file = request.files['audio']
            audio_content = audio_file.read()
        else:
            # JSON with base64 encoded audio
            data = request.get_json()
            
            if not data:
                return jsonify({'error': 'No data provided'}), 400
            
            audio_base64 = data.get('audio')
            
            if not audio_base64:
                return jsonify({'error': 'No audio data provided'}), 400
            
            # Decode base64 audio
            try:
                audio_content = base64.b64decode(audio_base64)
            except Exception as e:
                return jsonify({'error': f'Invalid audio data: {str(e)}'}), 400
        
        # Transcribe audio
        result = speech_service.transcribe_audio(audio_content)
        
        if not result:
            return jsonify({
                'success': False,
                'error': 'Could not transcribe audio'
            }), 400
        
        return jsonify({
            'success': True,
            'transcript': result['transcript'],
            'confidence': result['confidence']
        }), 200
        
    except Exception as e:
        print(f"Transcribe error: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to transcribe audio'
        }), 500

@speech_bp.route('/test-file', methods=['POST'])
def test_pronunciation_file():
    """
    Test endpoint for file upload without authentication
    Use this to test pronunciation evaluation easily
    
    Usage with curl:
    curl -X POST http://localhost:5000/api/speech/test-file \
      -F "audio=@path/to/audio.wav" \
      -F "expectedWord=hello"
    """
    try:
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        expected_word = request.form.get('expectedWord', 'hello')
        
        if not audio_file:
            return jsonify({'error': 'Audio file is empty'}), 400
        
        audio_content = audio_file.read()
        
        # Evaluate pronunciation
        result = speech_service.evaluate_pronunciation(audio_content, expected_word)
        
        if not result['success']:
            return jsonify({
                'success': False,
                'error': result['message']
            }), 400
        
        # Return evaluation results with score
        return jsonify({
            'success': True,
            'correct': result['correct'],
            'transcript': result['transcript'],
            'expected': result['expected'],
            'confidence': result['confidence'],
            'similarity': result['similarity'],
            'message': result['message'],
            'score': 100 if result['correct'] else int(result['similarity'] * 50)
        }), 200
        
    except Exception as e:
        print(f"Test pronunciation error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to test pronunciation: {str(e)}'
        }), 500

@speech_bp.route('/test', methods=['GET'])
def test_speech_api():
    """Test endpoint to check if speech service is configured"""
    try:
        return jsonify({
            'success': True,
            'message': 'Speech service is configured',
            'info': 'Send POST request to /api/speech/evaluate with audio data or use /api/speech/test-file for easy file upload testing'
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
