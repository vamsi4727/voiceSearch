# import whisper
import time
import sys
import json
import os
from pathlib import Path
from transformers import WhisperForConditionalGeneration, WhisperProcessor
import torch
import librosa
import numpy as np

class WhisperSinhalaModel:
    _instance = None
    _model = None
    _processor = None
    _is_initialized = False
    # _model_path = os.path.join(os.path.dirname(__file__), 'model_cache', 'sinhala')
    
    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def __init__(self):
        if not WhisperSinhalaModel._is_initialized:
            self._load_model()
            WhisperSinhalaModel._is_initialized = True
    
    def _load_model(self):
        try:
            if WhisperSinhalaModel._model is not None:
                print("Using cached model...", file=sys.stderr)
                return
                
            print("Loading Sinhala model...", file=sys.stderr)
            model_id = "Ransaka/whisper-tiny-sinhala-20k"
            cache_dir = os.path.join(os.path.dirname(__file__), 'model_cache', 'sinhala')
            
            os.makedirs(cache_dir, exist_ok=True)
            
            # Performance optimizations
            torch.set_num_threads(4)
            torch.set_num_interop_threads(4)
            
            # Load processor and model only if not already loaded
            if WhisperSinhalaModel._processor is None:
                WhisperSinhalaModel._processor = WhisperProcessor.from_pretrained(
                    model_id,
                    cache_dir=cache_dir
                )
            
            if WhisperSinhalaModel._model is None:
                WhisperSinhalaModel._model = WhisperForConditionalGeneration.from_pretrained(
                    model_id,
                    cache_dir=cache_dir,
                    torch_dtype=torch.float32,
                    low_cpu_mem_usage=True
                ).to('cpu').eval()
            
            print("Model loaded successfully", file=sys.stderr)
        except Exception as e:
            print(f"Error loading model: {str(e)}", file=sys.stderr)
            raise

    def get_model_and_processor(self):
        return WhisperSinhalaModel._model, WhisperSinhalaModel._processor

def romanize_sinhala(text):
    """Improved Sinhala to English romanization"""
    sinhala_to_roman = {
        # Base consonants (without hal)
        'ක': 'ka', 'ඛ': 'kha', 'ග': 'ga', 'ඝ': 'gha', 'ඞ': 'nga',
        'ච': 'cha', 'ඡ': 'chha', 'ජ': 'ja', 'ඣ': 'jha', 'ඤ': 'nya',
        'ට': 'ta', 'ඨ': 'tha', 'ඩ': 'da', 'ඪ': 'dha', 'ණ': 'na',
        'ත': 'tha', 'ථ': 'thha', 'ද': 'da', 'ධ': 'dha', 'න': 'na',
        'ප': 'pa', 'ඵ': 'pha', 'බ': 'ba', 'භ': 'bha', 'ම': 'ma',
        'ය': 'ya', 'ර': 'ra', 'ල': 'la', 'ව': 'va', 'ශ': 'sha',
        'ෂ': 'sha', 'ස': 'sa', 'හ': 'ha', 'ළ': 'la', 'ෆ': 'fa',

        # Vowels and modifiers
        'අ': 'a', 'ආ': 'aa', 'ඇ': 'ae', 'ඈ': 'aae',
        'ඉ': 'i', 'ඊ': 'ee', 'උ': 'u', 'ඌ': 'uu',
        'එ': 'e', 'ඒ': 'ee', 'ඓ': 'ai', 'ඔ': 'o',
        'ඕ': 'oo', 'ඖ': 'au',
        '්': '', 'ා': 'a', 'ැ': 'e', 'ෑ': 'ee',
        'ි': 'i', 'ී': 'ee', 'ු': 'u', 'ූ': 'uu',
        'ෘ': 'ru', 'ෙ': 'e', 'ේ': 'ee', 'ෛ': 'ai',
        'ො': 'o', 'ෝ': 'oo', 'ෞ': 'au',
        'ං': 'n', 'ඃ': 'h',
    }
    
    # Common word mappings
    common_words = {
        'සර': 'sara',
        'ස්ව': 'swa',
        'වියා': 'viya',
        # Add more common words
    }
    
    # First try common words
    for word in text.split():
        if word in common_words:
            text = text.replace(word, common_words[word])
    
    # Then process character by character
    result = ''
    i = 0
    while i < len(text):
        found = False
        # Try to match longer sequences first
        for length in range(3, 0, -1):
            if i + length <= len(text):
                chunk = text[i:i + length]
                if chunk in sinhala_to_roman:
                    result += sinhala_to_roman[chunk]
                    i += length
                    found = True
                    break
        if not found:
            # If not Sinhala, keep as is
            result += text[i]
            i += 1
    
    return ' '.join(word.capitalize() for word in result.split())

def preprocess_audio(audio_input, sr=16000):
    """
    Optimize audio for Sinhala speech recognition
    """
    try:
        # Trim silence
        audio_trimmed, _ = librosa.effects.trim(audio_input, top_db=20)
        
        # Normalize audio
        audio_normalized = librosa.util.normalize(audio_trimmed)
        
        # Voice activity detection to focus on speech segments
        intervals = librosa.effects.split(audio_normalized, top_db=20)
        audio_parts = []
        for interval in intervals:
            audio_parts.append(audio_normalized[interval[0]:interval[1]])
        
        # Concatenate voice segments if any were found
        if audio_parts:
            audio_processed = np.concatenate(audio_parts)
        else:
            audio_processed = audio_normalized
            
        return audio_processed
    except Exception as e:
        print(f"Audio preprocessing warning: {str(e)}", file=sys.stderr)
        return audio_input  # Return original audio if preprocessing fails

def recognize_speech(audio_file_path):
    total_start_time = time.time()
    stage_times = {}
    
    try:
        if not Path(audio_file_path).is_file():
            raise FileNotFoundError(f"Audio file not found: {audio_file_path}")
        
        # Model loading time
        model_start = time.time()
        sinhala_model = WhisperSinhalaModel.get_instance()
        model, processor = sinhala_model.get_model_and_processor()
        stage_times['model_loading'] = int((time.time() - model_start) * 1000)
        print(f"Model loading time: {stage_times['model_loading']}ms", file=sys.stderr)
        
        # Audio loading and preprocessing time
        audio_start = time.time()
        audio_input, sr = librosa.load(audio_file_path, sr=16000)
        audio_processed = preprocess_audio(audio_input)
        stage_times['audio_processing'] = int((time.time() - audio_start) * 1000)
        print(f"Audio processing time: {stage_times['audio_processing']}ms", file=sys.stderr)
        
        # Feature extraction time
        feature_start = time.time()
        input_features = processor(
            audio_processed, 
            sampling_rate=16000, 
            return_tensors="pt"
        ).input_features
        stage_times['feature_extraction'] = int((time.time() - feature_start) * 1000)
        print(f"Feature extraction time: {stage_times['feature_extraction']}ms", file=sys.stderr)
        
        # Inference time
        inference_start = time.time()
        with torch.no_grad():
            predicted_ids = model.generate(input_features)
        stage_times['inference'] = int((time.time() - inference_start) * 1000)
        print(f"Inference time: {stage_times['inference']}ms", file=sys.stderr)
        
        # Decoding time
        decode_start = time.time()
        transcription = processor.batch_decode(
            predicted_ids, 
            skip_special_tokens=True
        )[0]
        stage_times['decoding'] = int((time.time() - decode_start) * 1000)
        print(f"Decoding time: {stage_times['decoding']}ms", file=sys.stderr)
        
        # Romanization time
        roman_start = time.time()
        romanized = romanize_sinhala(transcription)
        stage_times['romanization'] = int((time.time() - roman_start) * 1000)
        print(f"Romanization time: {stage_times['romanization']}ms", file=sys.stderr)
        
        total_time = int((time.time() - total_start_time) * 1000)
        voice_to_text_time = (
            stage_times['model_loading'] +
            stage_times['audio_processing'] +
            stage_times['feature_extraction'] +
            stage_times['inference'] +
            stage_times['decoding']
        )
        
        print(f"\nTotal processing time: {total_time}ms", file=sys.stderr)
        print(f"Voice to text time: {voice_to_text_time}ms", file=sys.stderr)
        print(f"Romanization time: {stage_times['romanization']}ms", file=sys.stderr)
        
        result = {
            "text": transcription.strip(),
            "romanized": romanized.strip(),
            "error": None,
            "processingTime": total_time,
            "stageTimes": stage_times,
            "voiceToTextTime": voice_to_text_time,
            "romanizationTime": stage_times['romanization'],
            "model": "whisper-tiny-sinhala-CPU"
        }
        
        return result
        
    except Exception as e:
        total_time = int((time.time() - total_start_time) * 1000)
        error_message = f"{type(e).__name__}: {str(e)}"
        print(f"Error: {error_message}", file=sys.stderr)
        
        return {
            "text": "",
            "romanized": "",
            "error": error_message,
            "processingTime": total_time,
            "stageTimes": stage_times,
            "model": "whisper-tiny-sinhala-CPU"
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
            "model": "whisper-tiny-sinhala-CPU"
        }
        print(json.dumps(error_result, ensure_ascii=False))
        sys.exit(1)