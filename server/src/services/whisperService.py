import whisper
import time
import sys
import json
import os
import logging
import torch
from pathlib import Path

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stderr),
        logging.FileHandler('whisper_service.log')
    ]
)

logger = logging.getLogger(__name__)

# Load models once at startup with medium model for non-English
# Cache for loaded models
_models = {}

def load_model(model_size, device="cpu"):
    """Load and cache a model"""
    if model_size not in _models:
        logger.info(f"Loading {model_size} model...")
        _models[model_size] = whisper.load_model(model_size, device=device)
        logger.info(f"{model_size} model loaded successfully")
    return _models[model_size]

def get_model(language):
    """Get appropriate model based on language"""
    model_size = "base" if language == "en" else "medium"
    return load_model(model_size)

def get_romanization_prompt(language):
    prompts = {
        'si': (
            "Transcribe Sinhala speech to romanized text using English letters. "
            "Use standard Sinhala romanization rules. Examples:\n"
            "ආයුබෝවන් = ayubowan\n"
            "මැණිකේ = manikay\n"
            "මගේ හිතේ = mage hithe\n"
            "සුභ රාත්රියක් = subha raathriyak\n"
            "Please maintain proper Sinhala pronunciation patterns in romanization."
        ),
        'ta':(
            "Transcribe Tamil speech to romanized text using English letters. "
            "Use standard Tamil romanization rules. Examples:\n"
            "வணக்கம் = vanakkam\n"
            "என் பெயர் = en peyar\n"
            "நான் வருகிறேன் = naan varugiren\n"
            "நன்றி = nandri\n"
            "Please maintain proper Tamil pronunciation patterns in romanization."
        )

    }
    return prompts.get(language, "Transcribe speech using English letters only")

def recognize_speech(audio_file_path, language='en'):
    start_time = time.time()
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"Starting transcription for file: {audio_file_path}")
        logger.info(f"Selected language: {language}")
        
        if not Path(audio_file_path).is_file():
            raise FileNotFoundError(f"Audio file not found: {audio_file_path}")
            
        model = get_model(language)
        logger.info(f"Using {'base' if language == 'en' else 'medium'} model")
        
        if language in ['si', 'ta']:
            # First pass: Get native language transcription
            logger.info(f"Performing {language} transcription")
            native_result = model.transcribe(
                audio_file_path,
                language=language,
                task="transcribe",
                fp16=False
            )
            logger.debug(f"Native transcription result: {native_result['text']}")
            
            # Second pass: Get romanized version
            logger.info("Performing romanization")
            romanization_options = {
                'language': 'en',
                'task': 'transcribe',
                'fp16': False,
                'initial_prompt': get_romanization_prompt(language),
                'suppress_tokens': []
            }
            
            romanized_result = model.transcribe(
                audio_file_path,
                **romanization_options
            )
            
            # Clean and validate romanized text
            romanized_text = romanized_result["text"].strip()
            romanized_text = ''.join(c for c in romanized_text if c.isascii())
            logger.debug(f"Romanized result: {romanized_text}")
            
            # Verify output doesn't contain unwanted patterns
            if romanized_text.startswith("IMPORTANT") or romanized_text.isdigit():
                logger.warning(f"Invalid romanization detected: {romanized_text}")
                romanized_text = native_result["text"]  # Fallback to native text
            
            result = {
                "text": native_result["text"].strip(),
                "romanized": romanized_text,
                "error": None,
                "processingTime": int((time.time() - start_time) * 1000)
            }
            
        else:
            # Handle English and other languages
            logger.info(f"Performing transcription for {language}")
            transcription = model.transcribe(
                audio_file_path,
                language=language,
                task="transcribe",
                fp16=False
            )
            
            result = {
                "text": transcription["text"].strip(),
                "romanized": transcription["text"].strip(),
                "error": None,
                "processingTime": int((time.time() - start_time) * 1000)
            }
        
        logger.info(f"Transcription completed successfully in {result['processingTime']}ms")
        return result
        
    except Exception as e:
        logger.error(f"Error during transcription: {str(e)}", exc_info=True)
        return {
            "text": "",
            "romanized": "",
            "error": str(e),
            "processingTime": int((time.time() - start_time) * 1000)
        }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "Invalid arguments. Usage: python whisperService.py <audio_file_path> [language]"
        }))
        sys.exit(1)
    
    audio_file_path = sys.argv[1]
    language = sys.argv[2] if len(sys.argv) > 2 else 'en'
    result = recognize_speech(audio_file_path, language)
    print(json.dumps(result, ensure_ascii=False))