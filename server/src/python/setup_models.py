import os
import sys
from transformers import WhisperForConditionalGeneration, WhisperProcessor

def setup_model(model_id, cache_dir):
    """Download and cache a specific model"""
    print(f"\nSetting up model: {model_id}")
    print(f"Cache directory: {cache_dir}")
    
    try:
        # Create cache directory if it doesn't exist
        os.makedirs(cache_dir, exist_ok=True)
        
        print("Downloading and caching processor...")
        WhisperProcessor.from_pretrained(model_id, cache_dir=cache_dir)
        
        print("Downloading and caching model...")
        WhisperForConditionalGeneration.from_pretrained(model_id, cache_dir=cache_dir)
        
        print(f"Successfully setup model: {model_id}")
        return True
    except Exception as e:
        print(f"Error setting up model {model_id}: {str(e)}", file=sys.stderr)
        return False

def main():
    # Get the absolute path to the services directory
    services_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'services')
    
    # Define cache directory within the services directory
    cache_base = os.path.join(services_dir, 'model_cache')
    
    # Model configurations
    models = [
        {
            'id': 'Ransaka/whisper-tiny-sinhala-20k',
            'cache_dir': os.path.join(cache_base, 'sinhala')
        },
        {
            'id': 'vasista22/whisper-tamil-medium',
            'cache_dir': os.path.join(cache_base, 'tamil')
        }
    ]
    
    print("Starting model setup process...")
    print(f"Models will be cached in: {cache_base}")
    
    success = True
    for model in models:
        if not setup_model(model['id'], model['cache_dir']):
            success = False
    
    if success:
        print("\nAll models have been successfully downloaded and cached!")
        print("Cache location:", cache_base)
        print("\nYou can now start your application.")
        sys.exit(0)
    else:
        print("\nSome models failed to setup properly. Check the errors above.", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()