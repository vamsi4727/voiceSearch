import os
from pathlib import Path
from pocketsphinx import Decoder, get_model_path, Pocketsphinx
import wave
import json
import sys

class ModelTester:
    def __init__(self):
        self.base_dir = Path('../test_data')
        self.training_dir = self.base_dir / 'training'
        
        # Update paths to match the actual file locations
        model_base = Path(r"C:\Users\vamsikrishna.k\AppData\Local\Programs\Python\Python313\Lib\site-packages\pocketsphinx\model")
        self.config = {
            'hmm': str(model_base / 'en-us'),
            'lm': str(model_base / 'en-us.lm.bin'),
            'dict': str(model_base / 'cmudict-en-us.dict')  # Dictionary directly in model directory
        }
        self.test_results = []

    def setup_decoder(self):
        """Initialize PocketSphinx decoder with default model"""
        try:
            # Create decoder with all configuration parameters at once
            decoder = Decoder(
                hmm=self.config['hmm'],
                lm=self.config['lm'],
                dict=self.config['dict']
            )
            print("Decoder initialized successfully")
            return decoder
            
        except Exception as e:
            print(f"Error initializing decoder: {e}")
            print("Current configuration:")
            for key, value in self.config.items():
                print(f"{key}: {value}")
            raise

    def calculate_accuracy(self, recognized_text, expected_text):
        """Calculate accuracy with more flexible matching"""
        if not recognized_text or not expected_text:
            return 0.0
        
        # Normalize texts
        recognized = recognized_text.lower().strip()
        expected = expected_text.lower().strip()
        
        # Split into words
        recognized_words = set(recognized.split())
        expected_words = set(expected.split())
        
        # Calculate word matches
        matching_words = recognized_words.intersection(expected_words)
        
        # Calculate phonetic similarity for non-exact matches
        total_similarity = len(matching_words)
        
        # Calculate accuracy percentage
        max_words = max(len(recognized_words), len(expected_words))
        accuracy = (total_similarity / max_words) * 100 if max_words > 0 else 0
        
        # Debug information
        print("\nAccuracy Calculation:")
        print(f"Recognized words: {recognized_words}")
        print(f"Expected words: {expected_words}")
        print(f"Matching words: {matching_words}")
        print(f"Accuracy: {accuracy:.2f}%")
        
        return accuracy

    def test_wav_file(self, wav_path, expected_text=None):
        """Test a single WAV file"""
        print(f"\nProcessing: {wav_path}")
        
        try:
            decoder = self.setup_decoder()
            wav_file = wave.open(str(wav_path), 'rb')
            
            # Check WAV file properties
            print(f"WAV file properties:")
            print(f"Channels: {wav_file.getnchannels()}")
            print(f"Sample width: {wav_file.getsampwidth()}")
            print(f"Frame rate: {wav_file.getframerate()}")
            
            decoder.start_utt()
            
            while True:
                buf = wav_file.readframes(1024)
                if not buf:
                    break
                decoder.process_raw(buf, False, False)
                
            decoder.end_utt()
            hypothesis = decoder.hyp()
            
            if hypothesis:
                recognized_text = hypothesis.hypstr
                print(f"Recognition successful: {recognized_text}")
            else:
                recognized_text = ""
                print("No recognition result")

            # Calculate accuracy using new method
            accuracy = self.calculate_accuracy(recognized_text, expected_text) if expected_text else None

            return {
                'wav_file': wav_path.name,
                'recognized_text': recognized_text,
                'expected_text': expected_text,
                'accuracy': accuracy
            }
        except Exception as e:
            print(f"Error processing {wav_path}: {e}")
            return {
                'wav_file': wav_path.name,
                'error': str(e)
            }

    def run_tests(self):
        """Test all WAV files in the test directory"""
        print("Starting model testing...")
        
        wav_dir = self.base_dir / 'wav'
        metadata_dir = self.base_dir / 'metadata'
        
        if not wav_dir.exists():
            print(f"Error: WAV directory not found: {wav_dir}")
            return
            
        wav_files = list(wav_dir.glob('*.wav'))
        if not wav_files:
            print(f"No WAV files found in {wav_dir}")
            return
            
        print(f"Found {len(wav_files)} WAV files to test")
        
        for wav_file in wav_files:
            print(f"\nTesting {wav_file.name}...")
            
            metadata_path = metadata_dir / f"{wav_file.stem}.json"
            expected_text = None
            
            if metadata_path.exists():
                try:
                    with open(metadata_path) as f:
                        metadata = json.load(f)
                        expected_text = metadata.get('actualText')
                except Exception as e:
                    print(f"Error reading metadata for {wav_file.name}: {e}")

            result = self.test_wav_file(wav_file, expected_text)
            self.test_results.append(result)
            
            if 'error' in result:
                print(f"Error: {result['error']}")
            else:
                print(f"Recognized: {result['recognized_text']}")
                if expected_text:
                    print(f"Expected: {expected_text}")
                    print(f"Accuracy: {result['accuracy']:.2f}%")

    def save_results(self):
        """Save test results to a file"""
        if not self.test_results:
            print("No results to save")
            return
            
        results_dir = self.base_dir / 'results'
        results_dir.mkdir(exist_ok=True)
        results_file = results_dir / 'model_test_results.json'
        
        total_accuracy = 0
        tests_with_accuracy = 0
        
        for result in self.test_results:
            if result.get('accuracy') is not None:
                total_accuracy += result['accuracy']
                tests_with_accuracy += 1

        summary = {
            'total_tests': len(self.test_results),
            'average_accuracy': total_accuracy / tests_with_accuracy if tests_with_accuracy > 0 else 0,
            'results': self.test_results
        }

        with open(results_file, 'w') as f:
            json.dump(summary, f, indent=2)
            
        print(f"\nTest results saved to: {results_file}")
        print(f"Average accuracy: {summary['average_accuracy']:.2f}%")

if __name__ == "__main__":
    tester = ModelTester()
    tester.run_tests()
    tester.save_results() 