"""
Speech Recognition and Pronunciation Evaluation Service
Uses Google Speech-to-Text API for voice recognition.
"""

from google.cloud import speech
import os
import json
import struct
import traceback
import re
from num2words import num2words


class SpeechService:
    def __init__(self):
        try:
            google_creds_json = os.getenv('GOOGLE_APPLICATION_CREDENTIALS_JSON')
            if google_creds_json:
                import tempfile
                cred_dict = json.loads(google_creds_json)
                with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
                    json.dump(cred_dict, f)
                    os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = f.name
            else:
                creds_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
                if creds_path:
                    os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = creds_path

            self.client = speech.SpeechClient()
            print("✅ Google Speech-to-Text initialized successfully")

            from google.cloud import texttospeech
            self.tts_client = texttospeech.TextToSpeechClient()
            print("✅ Google Text-to-Speech initialized successfully")

        except Exception as e:
            print(f"⚠️  Google Speech/TTS not configured: {e}")
            print(traceback.format_exc())
            self.client = None
            self.tts_client = None

    # ── Dynamic edit-distance resolver ────────────────────────────────────────
    # Replaces both hardcoded homophone maps. For each spoken word, if it's
    # within edit distance of an expected word, it gets replaced — no static
    # map needed. Stricter threshold for short words to avoid "to"↔"do" etc.

    @staticmethod
    def _edit_distance(a, b):
        dp = list(range(len(b) + 1))
        for i, ca in enumerate(a):
            ndp = [i + 1]
            for j, cb in enumerate(b):
                ndp.append(min(
                    dp[j] + (0 if ca == cb else 1),
                    dp[j + 1] + 1,
                    ndp[j] + 1,
                ))
            dp = ndp
        return dp[len(b)]

    @staticmethod
    def _resolve_against_expected(transcript_words, expected_words):
        """
        Dynamically resolves spoken words against expected words using edit
        distance. No hardcoded maps — if a spoken word is close enough to an
        expected word, it gets normalized to that word.
        """
        expected_clean = [
            re.sub(r'[^a-z0-9]', '', w.lower()) for w in expected_words
        ]

        resolved = []
        for word in transcript_words:
            clean = re.sub(r'[^a-z0-9]', '', word.lower())
            best_match = None
            best_dist = float('inf')

            for exp in expected_clean:
                dist = SpeechService._edit_distance(clean, exp)
                # Stricter for short words — "to"/"do"/"go" are too similar
                threshold = 1 if len(exp) >= 4 else 0
                if dist <= threshold and dist < best_dist:
                    best_dist = dist
                    best_match = exp

            resolved.append(best_match if best_match else clean)
        return resolved

    @staticmethod
    def _build_speech_contexts(expected_words):
        """
        Builds STT hint contexts from expected words only — no hardcoded
        homophone map. Uses the $ prefix on the full sentence to strongly
        bias the engine toward the expected utterance, which handles most
        homophone cases at the acoustic level before any post-processing.
        """
        if not expected_words:
            return []

        phrases = list(expected_words)

        # $ prefix = near-exact phrase hint, dramatically helps function words
        # like "the", "and", "a" that are acoustically ambiguous in isolation
        full_sentence = " ".join(expected_words)
        phrases.append(f"${full_sentence}")

        return [
            speech.SpeechContext(
                phrases=list(set(phrases)),
                boost=20.0,
            )
        ]

    def _normalize_transcript(self, text):
        """Converts digits to words and removes hyphens. No homophone map."""
        if not text:
            return ""
        text = re.sub(r'\d+', lambda m: num2words(int(m.group(0))), text)
        return text.replace("-", " ").lower().strip()

    def _read_wav_sample_rate(self, audio_content):
        try:
            if len(audio_content) < 44:
                return 16000
            if audio_content[:4] != b'RIFF' or audio_content[8:12] != b'WAVE':
                return 16000
            sample_rate = struct.unpack_from('<I', audio_content, 24)[0]
            channels    = struct.unpack_from('<H', audio_content, 22)[0]
            bit_depth   = struct.unpack_from('<H', audio_content, 34)[0]
            print(f"   WAV header → sample_rate={sample_rate} Hz  channels={channels}  bit_depth={bit_depth}")
            return sample_rate
        except Exception as e:
            print(f"   WAV header parse error: {e} — defaulting to 16000 Hz")
            return 16000

    def transcribe_audio(self, audio_content, language_code='en-US', **kwargs):
        if not self.client:
            print("❌ Speech client not initialized")
            return None

        try:
            encoding = kwargs.get('encoding', 'WAV')
            expected_words = kwargs.get('hints', [])

            print(f"📤 Sending {len(audio_content)} bytes to Google STT (encoding={encoding})")
            print(f"   first 8 bytes : {audio_content[:8].hex()}")
            if expected_words:
                print(f"   expected words: {expected_words}")

            audio = speech.RecognitionAudio(content=audio_content)
            speech_contexts = self._build_speech_contexts(expected_words)

            shared_params = dict(
                language_code=language_code,
                enable_automatic_punctuation=False,
                use_enhanced=True,
                model="latest_long",
                speech_contexts=speech_contexts,
            )

            if encoding == 'MP4':
                config = speech.RecognitionConfig(
                    encoding=speech.RecognitionConfig.AudioEncoding.MP3,
                    sample_rate_hertz=16000,
                    audio_channel_count=1,
                    **shared_params,
                )
            else:
                sample_rate = self._read_wav_sample_rate(audio_content)
                config = speech.RecognitionConfig(
                    encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
                    sample_rate_hertz=sample_rate,
                    **shared_params,
                )

            response = self.client.recognize(config=config, audio=audio)
            print(f"📥 Google STT → {len(response.results)} result(s)")

            for i, result in enumerate(response.results):
                for j, alt in enumerate(result.alternatives):
                    print(f"   [{i}][{j}] {alt.transcript!r}  conf={alt.confidence:.3f}")

            if not response.results:
                print("⚠️  No results — audio may be silent or too short")
                return None

            raw_transcript = response.results[0].alternatives[0].transcript
            confidence = response.results[0].alternatives[0].confidence

            # Step 1: normalize digits and hyphens
            normalized = self._normalize_transcript(raw_transcript)

            # Step 2: dynamically resolve spoken words against expected words
            # using edit distance — no hardcoded homophone map
            if expected_words:
                spoken_words = normalized.split()
                resolved = self._resolve_against_expected(spoken_words, expected_words)
                clean_transcript = " ".join(resolved)
            else:
                clean_transcript = normalized

            print(f"✅ Transcript: {clean_transcript!r} (raw: {raw_transcript!r})")
            return {
                'transcript': clean_transcript,
                'confidence': confidence,
            }

        except Exception as e:
            print(f"❌ Transcription error: {type(e).__name__}: {e}")
            print(traceback.format_exc())
            return None

    def pronounce_word(self, word, voice_name='en-US-Neural2-F'):
        try:
            from google.cloud import texttospeech
            import base64

            if not self.tts_client:
                print("❌ TTS client not initialized")
                return None

            synthesis_input = texttospeech.SynthesisInput(text=word)
            voice = texttospeech.VoiceSelectionParams(
                language_code='en-US',
                name=voice_name,
                ssml_gender=texttospeech.SsmlVoiceGender.FEMALE
                if voice_name.endswith(('F', 'C'))
                else texttospeech.SsmlVoiceGender.MALE,
            )
            audio_config = texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.MP3,
                speaking_rate=0.85,
                pitch=1.0,
            )

            response = self.tts_client.synthesize_speech(
                input=synthesis_input,
                voice=voice,
                audio_config=audio_config,
            )

            audio_base64 = base64.b64encode(response.audio_content).decode('utf-8')
            print(f"✅ TTS [{voice_name}] synthesized {len(response.audio_content)} bytes for: {word!r}")
            return {'audio': audio_base64}

        except Exception as e:
            print(f"❌ TTS error: {type(e).__name__}: {e}")
            print(traceback.format_exc())
            return None

    def evaluate_pronunciation(self, audio_content, expected_word, **kwargs):
        try:
            print(f"\n🔍 evaluate_pronunciation: expected={expected_word!r}")
            result = self.transcribe_audio(audio_content, **kwargs)

            if not result:
                return {
                    'success': False, 'correct': False,
                    'message': 'Could not recognize speech',
                    'transcript': '', 'expected': expected_word, 'confidence': 0,
                }

            transcript     = result['transcript']
            confidence     = result['confidence']
            expected_lower = expected_word.lower().strip()
            is_correct     = transcript == expected_lower
            similarity     = self._calculate_similarity(transcript, expected_lower)

            print(f"   transcript={transcript!r}  correct={is_correct}  sim={similarity:.2f}")

            return {
                'success': True, 'correct': is_correct,
                'transcript': transcript, 'expected': expected_lower,
                'confidence': confidence, 'similarity': similarity,
                'message': 'Correct!' if is_correct else f'You said "{transcript}", expected "{expected_lower}"',
            }

        except Exception as e:
            print(f"❌ Evaluation error: {type(e).__name__}: {e}")
            print(traceback.format_exc())
            return {
                'success': False, 'correct': False,
                'message': f'Evaluation failed: {e}',
                'transcript': '', 'expected': expected_word, 'confidence': 0,
            }

    def _calculate_similarity(self, text1, text2):
        if text1 == text2:
            return 1.0
        s1, s2 = set(text1), set(text2)
        if not s1 or not s2:
            return 0.0
        return len(s1 & s2) / len(s1 | s2)


# Global instance
speech_service = SpeechService()