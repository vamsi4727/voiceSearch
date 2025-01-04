import whisper
import numpy as np
import json
import time
import sys
import os
from pathlib import Path

class WhisperCPUTrainer:
    def __init__(self, model_size="base.en", training_dir="training_data"):
        """Initialize with a smaller model for CPU usage"""
        self.model = whisper.load_model(model_size)
        self.training_data = []
        self.audio_features_cache = {}
        self.training_dir = Path(training_dir)
        self.training_dir.mkdir(exist_ok=True)
        
    def add_training_example(self, audio_path: str, actual_text: str):
        """Add a new training example to the system"""
        try:
            # Load and process audio
            audio = whisper.load_audio(audio_path)
            mel = whisper.pad_or_trim(whisper.log_mel_spectrogram(audio))
            
            # Store the example
            self.training_data.append({
                'audio_path': audio_path,
                'mel_features': mel,
                'actual_text': actual_text
            })
            
            # Save features to avoid recomputation
            self.audio_features_cache[audio_path] = mel
            
            return {
                "success": True,
                "error": None
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    def find_similar_examples(self, mel_features, n=3):
        """Find the most similar training examples based on audio features"""
        if not self.training_data:
            return []
            
        similarities = []
        for example in self.training_data:
            similarity = np.sum(mel_features * example['mel_features']) / (
                np.sqrt(np.sum(mel_features**2)) * np.sqrt(np.sum(example['mel_features']**2))
            )
            similarities.append((similarity, example))
            
        return [ex for _, ex in sorted(similarities, reverse=True)[:n]]

    def transcribe_with_examples(self, audio_path: str):
        """Transcribe audio using both the base model and similar examples"""
        start_time = time.time()
        
        try:
            # Load and process audio
            audio = whisper.load_audio(audio_path)
            mel = whisper.pad_or_trim(whisper.log_mel_spectrogram(audio))
            
            # Get base model transcription
            base_result = self.model.transcribe(audio_path, fp16=False)
            base_text = base_result["text"].strip()
            
            # Find similar examples
            similar_examples = self.find_similar_examples(mel)
            
            # If we have similar examples, use them to improve the transcription
            if similar_examples:
                transcriptions = [base_text] + [ex['actual_text'] for ex in similar_examples]
                from collections import Counter
                counts = Counter(transcriptions)
                improved_text = counts.most_common(1)[0][0]
            else:
                improved_text = base_text
            
            return {
                "text": improved_text,
                "base_text": base_text,
                "similar_examples_count": len(similar_examples),
                "error": None,
                "processingTime": int((time.time() - start_time) * 1000)
            }
            
        except Exception as e:
            return {
                "text": "",
                "error": str(e),
                "processingTime": int((time.time() - start_time) * 1000)
            }

    def save_training_data(self):
        """Save the training data for future use"""
        save_path = self.training_dir / "training_data.json"
        save_data = []
        for example in self.training_data:
            save_data.append({
                'audio_path': example['audio_path'],
                'actual_text': example['actual_text']
            })
            
        with open(save_path, 'w', encoding='utf-8') as f:
            json.dump(save_data, f, ensure_ascii=False, indent=2)

    def load_training_data(self):
        """Load previously saved training data"""
        try:
            save_path = self.training_dir / "training_data.json"
            if not save_path.exists():
                return False
                
            with open(save_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
            self.training_data = []
            for example in data:
                self.add_training_example(example['audio_path'], example['actual_text'])
                
            return True
        except Exception as e:
            print(f"Error loading training data: {str(e)}", file=sys.stderr)
            return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No command provided"}))
        sys.exit(1)

    command = sys.argv[1]
    trainer = WhisperCPUTrainer()
    
    try:
        if command == "add_example":
            if len(sys.argv) != 4:
                print(json.dumps({"error": "Invalid arguments for add_example"}))
                sys.exit(1)
                
            result = trainer.add_training_example(sys.argv[2], sys.argv[3])
            print(json.dumps(result))
            
        elif command == "transcribe":
            if len(sys.argv) != 3:
                print(json.dumps({"error": "Invalid arguments for transcribe"}))
                sys.exit(1)
                
            result = trainer.transcribe_with_examples(sys.argv[2])
            print(json.dumps(result))
            
        else:
            print(json.dumps({"error": f"Unknown command: {command}"}))
            sys.exit(1)
            
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)