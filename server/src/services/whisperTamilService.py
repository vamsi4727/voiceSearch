import whisper
import time
import sys
import json
import os
from pathlib import Path

def romanize_tamil(text):
    """Convert Tamil text to romanized form using custom mapping"""
    tamil_to_roman = {
        'அ': 'a', 'ஆ': 'aa', 'இ': 'i', 'ஈ': 'ii',
        'உ': 'u', 'ஊ': 'uu', 'எ': 'e', 'ஏ': 'ee',
        'ஐ': 'ai', 'ஒ': 'o', 'ஓ': 'oo', 'ஔ': 'au',
        'க': 'ka', 'ங': 'nga', 'ச': 'sa', 'ஞ': 'nya',
        'ட': 'ta', 'ண': 'na', 'த': 'tha', 'ந': 'na',
        'ப': 'pa', 'ம': 'ma', 'ய': 'ya', 'ர': 'ra',
        'ல': 'la', 'வ': 'va', 'ழ': 'zha', 'ள': 'la',
        'ற': 'ra', 'ன': 'na', 'ஜ': 'ja', 'ஷ': 'sha',
        'ஸ': 'sa', 'ஹ': 'ha', '்': '', 'ா': 'aa',
        'ி': 'i', 'ீ': 'ii', 'ு': 'u', 'ூ': 'uu',
        'ெ': 'e', 'ே': 'ee', 'ை': 'ai', 'ொ': 'o',
        'ோ': 'oo', 'ௌ': 'au', 'ஃ': 'h',
        # Tamil numbers
        '௧': '1', '௨': '2', '௩': '3', '௪': '4',
        '௫': '5', '௬': '6', '௭': '7', '௮': '8',
        '௯': '9', '௦': '0',
        # Common combinations
        'கா': 'kaa', 'கி': 'ki', 'கீ': 'kii',
        'கு': 'ku', 'கூ': 'kuu', 'கெ': 'ke',
        'கே': 'kee', 'கை': 'kai', 'கொ': 'ko',
        'கோ': 'koo', 'கௌ': 'kau'
    }
    
    romanized = ''
    i = 0
    while i < len(text):
        found = False
        # Try to match longer sequences first (for combined characters)
        for char_len in range(3, 0, -1):
            if i + char_len <= len(text):
                chunk = text[i:i + char_len]
                if chunk in tamil_to_roman:
                    romanized += tamil_to_roman[chunk]
                    i += char_len
                    found = True
                    break
        if not found:
            # If character not found in mapping, keep it as is
            romanized += text[i]
            i += 1
    
    return romanized

def recognize_speech(audio_file_path):
    start_time = time.time()
    
    try:
        if not Path(audio_file_path).is_file():
            raise FileNotFoundError(f"Audio file not found: {audio_file_path}")
            
        # Load the base model
        print("Loading base Whisper model...", file=sys.stderr)
        model = whisper.load_model("base")
        
        # Get both English translation and Tamil transcription
        print("Generating transcription...", file=sys.stderr)
        translation_result = model.transcribe(
            audio_file_path,
            language="ta",
            task="translate",
            fp16=False
        )
        
        # Force romanization with English character output
        romanization_options = {
            'language': "ta",
            'task': 'transcribe',
            'fp16': False,
            'initial_prompt': (
                "You must write everything in English letters only. "
                "IMPORTANT: Do not use Tamil script at all. "
                "Use only Latin alphabet (a-z) for sounds. "
                "Examples: "
                "வணக்கம் = vanakkam, "
                "நன்றி = nandri"
            )
        }
        
        transcription_result = model.transcribe(
            audio_file_path,
            **romanization_options
        )
        
        # Clean up romanized text
        tamil_text = transcription_result["text"].strip()
        romanized = romanize_tamil(tamil_text)
        
        result = {
            "text": tamil_text,
            "romanized": romanized,
            "error": None,
            "processingTime": int((time.time() - start_time) * 1000),
            "model": "whisper-base-tamil"
        }
        
        print("Processing complete", file=sys.stderr)
        return result
        
    except Exception as e:
        processing_time = int((time.time() - start_time) * 1000)
        error_message = f"{type(e).__name__}: {str(e)}"
        print(f"Error: {error_message}", file=sys.stderr)
        
        return {
            "text": "",
            "romanized": "",
            "error": error_message,
            "processingTime": processing_time,
            "model": "whisper-base-tamil"
        }

if __name__ == "__main__":
    try:
        if len(sys.argv) != 2:
            raise ValueError("Invalid arguments. Usage: python whisperTamilService.py <audio_file_path>")
        
        audio_file_path = sys.argv[1]
        result = recognize_speech(audio_file_path)
        
        print(json.dumps(result, ensure_ascii=False))
        
    except Exception as e:
        error_result = {
            "text": "",
            "romanized": "",
            "error": f"Failed to process: {str(e)}",
            "processingTime": 0,
            "model": "whisper-base-tamil"
        }
        print(json.dumps(error_result, ensure_ascii=False))
        sys.exit(1)