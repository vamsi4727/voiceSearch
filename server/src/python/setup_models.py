import os
import sys
import whisper
from transformers import WhisperForConditionalGeneration, WhisperProcessor
from services.whisperSinhalaService import WhisperSinhalaModel

# Add the parent directory to Python path so we can import from services
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

def setup_models():
    print("Setting up speech recognition models...")
    
    try:
        # Create cache directory
        cache_dir = os.path.join(os.path.dirname(__file__), 'model_cache')
        os.makedirs(cache_dir, exist_ok=True)
        
        # Download and cache the base multilingual model
        print("\nDownloading base multilingual Whisper model...")
        whisper.load_model("base")
        
        # Download and cache the English-specific tiny model
        print("\nDownloading English-specific Whisper model...")
        whisper.load_model("tiny.en")
        
        # Initialize and cache Sinhala model
        print("\nInitializing Sinhala model...")
        sinhala_model = WhisperSinhalaModel.get_instance()
        
        # Download and cache Tamil-specific model
        print("\nDownloading Tamil-specific model...")
        tamil_cache_dir = os.path.join(cache_dir, 'tamil')
        os.makedirs(tamil_cache_dir, exist_ok=True)
        WhisperProcessor.from_pretrained(
            "vasista22/whisper-tamil-medium",
            cache_dir=tamil_cache_dir
        )
        WhisperForConditionalGeneration.from_pretrained(
            "vasista22/whisper-tamil-medium",
            cache_dir=tamil_cache_dir
        )
        
        print("\nAll models downloaded and cached successfully!")
        return True
        
    except Exception as e:
        print(f"\nError setting up models: {str(e)}", file=sys.stderr)
        return False

if __name__ == "__main__":
    success = setup_models()
    sys.exit(0 if success else 1)