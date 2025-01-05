import os
import wave
import json
import time
import sys
import logging
from vosk import Model, KaldiRecognizer

# Configure logging to write to stderr
logging.basicConfig(level=logging.INFO, stream=sys.stderr, format='%(message)s')
logger = logging.getLogger(__name__)

def get_model_path():
    """Get model path from environment variable or use default"""
    env_path = os.getenv('VOSK_MODEL_PATH')
    if env_path:
        return env_path
    
    # Default paths based on environment
    if os.name == 'nt':  # Windows
        return os.path.join(os.path.dirname(__file__), '..', 'models', 'vosk-model-small-en-us')
    else:  # Linux/Mac
        return os.path.join(os.path.dirname(__file__), '../models/vosk-model-small-en-us')

def recognize_speech(audio_file_path):
    start_time = time.time()
    
    model_path = get_model_path()
    logger.info(f"Loading model from: {model_path}")
    
    
    try:
        model = Model(model_path)
        
        wf = wave.open(audio_file_path, "rb")
        if wf.getnchannels() != 1 or wf.getsampwidth() != 2 or wf.getframerate() not in [8000, 16000]:
            raise ValueError("Audio file must be WAV format mono PCM.")
        
        rec = KaldiRecognizer(model, wf.getframerate())
        rec.SetWords(True)
        
        # Process audio in chunks
        while True:
            data = wf.readframes(4000)
            if len(data) == 0:
                break
            rec.AcceptWaveform(data)
        
        # Get final result
        result = json.loads(rec.FinalResult())
        text = result.get("text", "")
        processing_time = int((time.time() - start_time) * 1000)
        
        # Clean up
        wf.close()
        
        return {
            "text": text,
            "error": None,
            "processingTime": processing_time
        }
    except Exception as e:
        logger.error(f"Error during speech recognition: {str(e)}")
        processing_time = int((time.time() - start_time) * 1000)
        return {
            "text": "",
            "error": str(e),
            "processingTime": processing_time
        }

if __name__ == "__main__":
    if len(sys.argv) != 2:
        result = {
            "text": "",
            "error": "Invalid arguments. Usage: python voskService.py <audio_file_path>",
            "processingTime": 0
        }
    else:
        audio_file_path = sys.argv[1]
        result = recognize_speech(audio_file_path)
    
    # Only output the JSON result to stdout
    sys.stdout.write(json.dumps(result) + "\n")
    sys.stdout.flush()