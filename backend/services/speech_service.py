"""
Speech Recognition and Pronunciation Evaluation Service
Uses Google Speech-to-Text API for voice recognition
"""

from google.cloud import speech
import os
import io

class SpeechService:
    def __init__(self):
        """Initialize Google Speech-to-Text client"""
        # Set credentials from environment variable
        credentials_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
        if credentials_path:
            os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = credentials_path
        
        try:
            self.client = speech.SpeechClient()
            print("✅ Google Speech-to-Text initialized successfully")
        except Exception as e:
            print(f"⚠️  Google Speech-to-Text not configured: {str(e)}")
            print("   Speech recognition will not work until credentials are added.")
            self.client = None
    
    def transcribe_audio(self, audio_content, language_code='en-US'):
        """
        Transcribe audio content to text
        
        Args:
            audio_content: Audio file content in bytes
            language_code: Language code (default: en-US)
        
        Returns:
            Transcribed text or None if failed
        """
        if not self.client:
            print("Error: Speech client not initialized")
            return None
        
        try:
            audio = speech.RecognitionAudio(content=audio_content)
            
            config = speech.RecognitionConfig(
                encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
                sample_rate_hertz=16000,
                language_code=language_code,
                enable_automatic_punctuation=False,
                model='default'
            )
            
            # Detect speech in the audio
            response = self.client.recognize(config=config, audio=audio)
            
            # Get the first result
            if response.results:
                transcript = response.results[0].alternatives[0].transcript
                confidence = response.results[0].alternatives[0].confidence
                return {
                    'transcript': transcript.lower().strip(),
                    'confidence': confidence
                }
            
            return None
            
        except Exception as e:
            print(f"Transcription error: {str(e)}")
            return None
    
    def evaluate_pronunciation(self, audio_content, expected_word):
        """
        Evaluate pronunciation by comparing transcribed text with expected word
        
        Args:
            audio_content: Audio file content in bytes
            expected_word: The word the user is supposed to say
        
        Returns:
            Dictionary with evaluation results
        """
        try:
            # Transcribe the audio
            result = self.transcribe_audio(audio_content)
            
            if not result:
                return {
                    'success': False,
                    'correct': False,
                    'message': 'Could not recognize speech',
                    'transcript': '',
                    'expected': expected_word,
                    'confidence': 0
                }
            
            transcript = result['transcript']
            confidence = result['confidence']
            expected_word_lower = expected_word.lower().strip()
            
            # Check if transcribed text matches expected word
            is_correct = transcript == expected_word_lower
            
            # Calculate similarity score (simple approach for prototype)
            similarity_score = self._calculate_similarity(transcript, expected_word_lower)
            
            return {
                'success': True,
                'correct': is_correct,
                'transcript': transcript,
                'expected': expected_word_lower,
                'confidence': confidence,
                'similarity': similarity_score,
                'message': 'Correct!' if is_correct else f'You said "{transcript}", but the word is "{expected_word_lower}"'
            }
            
        except Exception as e:
            print(f"Evaluation error: {str(e)}")
            return {
                'success': False,
                'correct': False,
                'message': f'Evaluation failed: {str(e)}',
                'transcript': '',
                'expected': expected_word,
                'confidence': 0
            }
    
    def _calculate_similarity(self, text1, text2):
        """
        Calculate simple similarity score between two strings
        Returns a score between 0 and 1
        """
        if text1 == text2:
            return 1.0
        
        # Simple character-based similarity for prototype
        # In production, use more sophisticated algorithms (Levenshtein distance, phonetic matching)
        text1_chars = set(text1)
        text2_chars = set(text2)
        
        if not text1_chars or not text2_chars:
            return 0.0
        
        intersection = len(text1_chars.intersection(text2_chars))
        union = len(text1_chars.union(text2_chars))
        
        return intersection / union if union > 0 else 0.0

# Global instance
speech_service = SpeechService()
