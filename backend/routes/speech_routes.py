"""
Speech Recognition Routes
Handles voice recording and pronunciation evaluation
"""

from flask import Blueprint, request, jsonify
from services.speech_service import speech_service
from utils.decorators import require_auth
import base64

speech_bp = Blueprint("speech", __name__)


@speech_bp.route('/transcribe', methods=['POST'])
@require_auth
def transcribe_audio(current_user):
    try:
        if request.files and 'audio' in request.files:
            audio_file = request.files['audio']
            audio_content = audio_file.read()
            encoding = 'WAV'
            hints = []
        else:
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No data provided'}), 400

            audio_base64 = data.get('audio')
            if not audio_base64:
                return jsonify({'error': 'No audio data provided'}), 400

            try:
                audio_content = base64.b64decode(audio_base64)
            except Exception as e:
                return jsonify({'error': f'Invalid audio data: {e}'}), 400

            encoding = data.get('encoding', 'WAV')
            hints = data.get('hints', [])  # ← list of words from the sentence

        result = speech_service.transcribe_audio(
            audio_content, encoding=encoding, hints=hints
        )

        if not result:
            return jsonify({'success': False, 'error': 'Could not transcribe audio'}), 400

        return jsonify({
            'success': True,
            'transcript': result['transcript'],
            'confidence': result['confidence'],
        }), 200

    except Exception as e:
        print(f"Transcribe error: {e}")
        return jsonify({'success': False, 'error': 'Failed to transcribe audio'}), 500

@speech_bp.route("/evaluate", methods=["POST"])
@require_auth
def evaluate_pronunciation(current_user):
    try:
        if request.files and "audio" in request.files:
            audio_file = request.files["audio"]
            audio_content = audio_file.read()
            expected_word = request.form.get("expectedWord", "")
            encoding = "WAV"
        else:
            data = request.get_json()
            if not data:
                return jsonify({"error": "No data provided"}), 400

            audio_base64 = data.get("audio")
            expected_word = data.get("expectedWord", "")
            if not audio_base64:
                return jsonify({"error": "No audio data provided"}), 400

            try:
                audio_content = base64.b64decode(audio_base64)
            except Exception as e:
                return jsonify({"error": f"Invalid audio data: {e}"}), 400

            encoding = data.get("encoding", "WAV")

        if not expected_word:
            return jsonify({"error": "Expected word is required"}), 400

        result = speech_service.evaluate_pronunciation(
            audio_content, expected_word, encoding=encoding
        )

        if not result["success"]:
            return jsonify({"success": False, "error": result["message"]}), 400

        return (
            jsonify(
                {
                    "success": True,
                    "correct": result["correct"],
                    "transcript": result["transcript"],
                    "expected": result["expected"],
                    "confidence": result["confidence"],
                    "similarity": result["similarity"],
                    "message": result["message"],
                    "score": (
                        100 if result["correct"] else int(result["similarity"] * 50)
                    ),
                }
            ),
            200,
        )

    except Exception as e:
        print(f"Evaluate pronunciation error: {e}")
        return (
            jsonify({"success": False, "error": "Failed to evaluate pronunciation"}),
            500,
        )


@speech_bp.route('/pronounce', methods=['POST'])
@require_auth
def pronounce_word(current_user):
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        word = data.get('word', '').strip()
        voice = data.get('voice', 'en-US-Neural2-F')  # ← accept voice from app
        if not word:
            return jsonify({'error': 'No word provided'}), 400

        result = speech_service.pronounce_word(word, voice_name=voice)

        if not result:
            return jsonify({'success': False, 'error': 'Could not synthesize speech'}), 400

        return jsonify({
            'success': True,
            'audio': result['audio'],
            'word': word,
        }), 200

    except Exception as e:
        print(f"Pronounce error: {e}")
        return jsonify({'success': False, 'error': 'Failed to pronounce word'}), 500


@speech_bp.route("/test-file", methods=["POST"])
def test_pronunciation_file():
    try:
        if "audio" not in request.files:
            return jsonify({"error": "No audio file provided"}), 400

        audio_file = request.files["audio"]
        expected_word = request.form.get("expectedWord", "hello")
        mime_type = audio_file.content_type

        if not audio_file:
            return jsonify({"error": "Audio file is empty"}), 400

        audio_content = audio_file.read()
        result = speech_service.evaluate_pronunciation(
            audio_content, expected_word, mime_type=mime_type
        )

        if not result["success"]:
            return jsonify({"success": False, "error": result["message"]}), 400

        return (
            jsonify(
                {
                    "success": True,
                    "correct": result["correct"],
                    "transcript": result["transcript"],
                    "expected": result["expected"],
                    "confidence": result["confidence"],
                    "similarity": result["similarity"],
                    "message": result["message"],
                    "score": (
                        100 if result["correct"] else int(result["similarity"] * 50)
                    ),
                }
            ),
            200,
        )

    except Exception as e:
        print(f"Test pronunciation error: {e}")
        return jsonify({"success": False, "error": f"Failed: {e}"}), 500


@speech_bp.route("/test", methods=["GET"])
def test_speech_api():
    return (
        jsonify(
            {
                "success": True,
                "message": "Speech service is configured",
                "info": 'POST to /api/speech/transcribe with { audio: base64, encoding: "MP4" }',
            }
        ),
        200,
    )
