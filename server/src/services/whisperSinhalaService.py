import whisper
import time
import sys
import json
import os
from pathlib import Path
from transformers import WhisperForConditionalGeneration, WhisperProcessor

class WhisperSinhalaModel:
    _instance = None
    _model = None
    _processor = None
    
    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def __init__(self):
        if WhisperSinhalaModel._model is None:
            self._load_model()
    
    def _load_model(self):
        try:
            print("Loading Sinhala model...", file=sys.stderr)
            model_id = "Ransaka/whisper-tiny-sinhala-20k"
            cache_dir = os.path.join(os.path.dirname(__file__), 'model_cache', 'sinhala')
            
            os.makedirs(cache_dir, exist_ok=True)
            
            WhisperSinhalaModel._processor = WhisperProcessor.from_pretrained(
                model_id,
                cache_dir=cache_dir
            )
            WhisperSinhalaModel._model = WhisperForConditionalGeneration.from_pretrained(
                model_id,
                cache_dir=cache_dir
            )
            
            print("Sinhala model loaded successfully", file=sys.stderr)
        except Exception as e:
            print(f"Error loading Sinhala model: {str(e)}", file=sys.stderr)
            raise

    def get_model_and_processor(self):
        return WhisperSinhalaModel._model, WhisperSinhalaModel._processor

def romanize_sinhala(text):
    """Convert Sinhala text to romanized form using custom mapping"""
    sinhala_to_roman = {
        'අ': 'a', 'ආ': 'aa', 'ඇ': 'ae', 'ඈ': 'aae',
        'ඉ': 'i', 'ඊ': 'ii', 'උ': 'u', 'ඌ': 'uu',
        'එ': 'e', 'ඒ': 'ee', 'ඓ': 'ai', 'ඔ': 'o',
        'ඕ': 'oo', 'ඖ': 'au', 'ං': 'm', 'ඃ': 'h',
        'ක': 'ka', 'ඛ': 'kha', 'ග': 'ga', 'ඝ': 'gha',
        'ඞ': 'nga', 'ච': 'ca', 'ඡ': 'cha', 'ජ': 'ja',
        'ඣ': 'jha', 'ඤ': 'nya', 'ට': 'ta', 'ඨ': 'tha',
        'ඩ': 'da', 'ඪ': 'dha', 'ණ': 'na', 'ත': 'tha',
        'ථ': 'thha', 'ද': 'da', 'ධ': 'dha', 'න': 'na',
        'ප': 'pa', 'ඵ': 'pha', 'බ': 'ba', 'භ': 'bha',
        'ම': 'ma', 'ය': 'ya', 'ර': 'ra', 'ල': 'la',
        'ව': 'va', 'ශ': 'sha', 'ෂ': 'sha', 'ස': 'sa',
        'හ': 'ha', 'ළ': 'la', '්': '', 'ා': 'a',
        'ැ': 'e', 'ෑ': 'ee', 'ි': 'i', 'ී': 'ii',
        'ු': 'u', 'ූ': 'uu', 'ෘ': 'ru', 'ෙ': 'e',
        'ේ': 'ee', 'ෛ': 'ai', 'ො': 'o', 'ෝ': 'oo',
        'ෞ': 'au', 'ෟ': 'lu', '෦': '0', '෧': '1',
        '෨': '2', '෩': '3', '෪': '4', '෫': '5',
        '෬': '6', '෭': '7', '෮': '8', '෯': '9'
    }
    
    romanized = ''
    i = 0
    while i < len(text):
        found = False
        # Try to match longer sequences first
        for char_len in range(2, 0, -1):
            if i + char_len <= len(text):
                chunk = text[i:i + char_len]
                if chunk in sinhala_to_roman:
                    romanized += sinhala_to_roman[chunk]
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
        
        # Get the cached model instance
        sinhala_model = WhisperSinhalaModel.get_instance()
        model, processor = sinhala_model.get_model_and_processor()
        
        # Load and process audio
        import librosa
        audio_input, _ = librosa.load(audio_file_path, sr=16000)
        
        # Process with specific instruction for Sinhala
        input_features = processor(
            audio_input, 
            sampling_rate=16000, 
            return_tensors="pt"
        ).input_features
        
        # Generate transcription with Sinhala text
        predicted_ids = model.generate(input_features)
        transcription = processor.batch_decode(
            predicted_ids, 
            skip_special_tokens=True
        )[0]
        
        # Romanize the Sinhala text
        romanized = romanize_sinhala(transcription)
        
        result = {
            "text": transcription.strip(),
            "romanized": romanized.strip(),
            "error": None,
            "processingTime": int((time.time() - start_time) * 1000),
            "model": "whisper-tiny-sinhala"
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
            "processingTime": processing_time,
            "model": "whisper-tiny-sinhala"
        }

if __name__ == "__main__":
    try:
        if len(sys.argv) != 2:
            raise ValueError("Invalid arguments. Usage: python whisperSinhalaService.py <audio_file_path>")
        
        audio_file_path = sys.argv[1]
        result = recognize_speech(audio_file_path)
        
        print(json.dumps(result, ensure_ascii=False))
        
    except Exception as e:
        error_result = {
            "text": "",
            "romanized": "",
            "error": f"Failed to process: {str(e)}",
            "processingTime": 0,
            "model": "whisper-tiny-sinhala"
        }
        print(json.dumps(error_result, ensure_ascii=False))
        sys.exit(1)