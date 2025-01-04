import whisper
import time
import sys
import json
import os
from pathlib import Path

# Add FFmpeg to PATH if needed
ffmpeg_path = r"C:\ffmpeg"
if os.path.exists(ffmpeg_path):
    os.environ["PATH"] = ffmpeg_path + os.pathsep + os.environ["PATH"]

def get_romanization_prompt(language):
    """Get language-specific prompts for romanization"""
    prompts = {
        'ta': (
            "You must write everything in English letters only. "
            "IMPORTANT: Do not use Tamil script at all. "
            "Use only Latin alphabet (a-z) for sounds. "
            "Examples: "
            "எப்படி = eppidi, "
            "வணக்கம் = vanakkam, "
            "நன்றி = nandri, "
            "நல்ல = nalla"
        ),
        'si': (
            "You must write everything in English letters only. "
            "IMPORTANT: Do not use Sinhala script at all. "
            "Use only Latin alphabet (a-z) for sounds. "
            "Examples: "
            "ආයුබෝවන් = ayubowan, "
            "ස්තූතියි = sthuthiyi"
        ),
        'en': "Transcribe the speech to text"
    }
    return prompts.get(language, "Transcribe speech using English letters only")

def recognize_speech(audio_file_path, language='en'):
    start_time = time.time()
    
    try:
        # Validate file exists
        if not Path(audio_file_path).is_file():
            raise FileNotFoundError(f"Audio file not found: {audio_file_path}")
            
        # Load the base model
        model = whisper.load_model("base")
        
        if language != 'en':
            # Get English translation
            translation_result = model.transcribe(
                audio_file_path,
                language=language,
                task="translate",
                fp16=False
            )
            
            # Force romanization with English character output
            romanization_options = {
                'language': 'en',  # Force English output
                'task': 'transcribe',
                'fp16': False,
                'initial_prompt': get_romanization_prompt(language),
                'suppress_tokens': [],  # Don't suppress any tokens to allow all sounds
            }
            
            romanized_result = model.transcribe(
                audio_file_path,
                **romanization_options
            )
            
            # Clean up romanized text to ensure only English characters
            romanized_text = ''.join(c for c in romanized_result["text"] if c.isascii())
            
            result = {
                "text": translation_result["text"].strip(),
                "romanized": romanized_text.strip(),
                "error": None,
                "processingTime": int((time.time() - start_time) * 1000)
            }
        else:
            # For English, just do regular transcription
            transcription = model.transcribe(
                audio_file_path,
                language="en",
                task="transcribe",
                fp16=False
            )
            
            result = {
                "text": transcription["text"].strip(),
                "romanized": transcription["text"].strip(),
                "error": None,
                "processingTime": int((time.time() - start_time) * 1000)
            }
        
        return result
        
    except Exception as e:
        processing_time = int((time.time() - start_time) * 1000)
        error_message = f"{type(e).__name__}: {str(e)}"
        print(f"Error: {error_message}", file=sys.stderr)
        
        return {
            "text": "",
            "romanized": "",
            "error": error_message,
            "processingTime": processing_time
        }

if __name__ == "__main__":
    try:
        if len(sys.argv) < 2:
            raise ValueError("Invalid arguments. Usage: python whisperService.py <audio_file_path> [language]")
        
        audio_file_path = sys.argv[1]
        language = sys.argv[2] if len(sys.argv) > 2 else 'en'
        result = recognize_speech(audio_file_path, language)
        
        # Ensure proper JSON encoding
        print(json.dumps(result, ensure_ascii=False))
        
    except Exception as e:
        error_result = {
            "text": "",
            "romanized": "",
            "error": f"Failed to process: {str(e)}",
            "processingTime": 0
        }
        print(json.dumps(error_result, ensure_ascii=False))
        sys.exit(1)