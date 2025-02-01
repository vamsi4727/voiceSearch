from whisperSinhalaService import WhisperSinhalaModel
import sys

def initialize_models():
    try:
        print("Pre-loading Sinhala model...", file=sys.stderr)
        WhisperSinhalaModel.get_instance()
        print("Model pre-loading complete!", file=sys.stderr)
    except Exception as e:
        print(f"Error pre-loading models: {e}", file=sys.stderr)
        raise

if __name__ == "__main__":
    initialize_models() 