import os
import json
import shutil
from pathlib import Path
import re

class TrainingDataPreparator:
    def __init__(self):
        self.base_dir = Path('../test_data')
        self.training_dir = self.base_dir / 'training'
        self.wav_dir = self.base_dir / 'wav'
        self.metadata_dir = self.base_dir / 'metadata'
        self.transcription_dir = self.base_dir / 'transcriptions'
        
        # Create training directory structure
        self.etc_dir = self.training_dir / 'etc'
        self.wav_train_dir = self.training_dir / 'wav'
        self.dict_dir = self.training_dir / 'dict'
        
        self.create_directories()

    def create_directories(self):
        """Create necessary directories for training"""
        dirs = [
            self.training_dir,
            self.etc_dir,
            self.wav_train_dir,
            self.dict_dir
        ]
        for dir_path in dirs:
            dir_path.mkdir(parents=True, exist_ok=True)

    def collect_transcriptions(self):
        """Collect all transcriptions and create corpus"""
        transcriptions = []
        vocabulary = set()

        # Read all metadata files
        for metadata_file in self.metadata_dir.glob('*.json'):
            try:
                with open(metadata_file) as f:
                    data = json.load(f)
                    if data.get('actualText'):
                        # Clean and normalize text
                        text = data['actualText'].strip().upper()
                        transcriptions.append(f"<s> {text} </s>")
                        # Add words to vocabulary
                        words = re.findall(r'\w+', text.upper())
                        vocabulary.update(words)
            except Exception as e:
                print(f"Error processing {metadata_file}: {e}")

        return transcriptions, vocabulary

    def create_dictionary(self, vocabulary):
        """Create pronunciation dictionary"""
        dict_file = self.dict_dir / 'dictionary.dict'
        filler_file = self.dict_dir / 'fillerdict'
        phones_file = self.dict_dir / 'phones.txt'

        # Get pronunciations (you might want to use a proper pronunciation dictionary)
        pronunciations = {}
        for word in vocabulary:
            # This is a simplified example - you should use a proper pronunciation dictionary
            phones = ' '.join(self.guess_pronunciation(word))
            pronunciations[word] = phones

        # Write dictionary
        with open(dict_file, 'w') as f:
            for word, phones in pronunciations.items():
                f.write(f"{word}\t{phones}\n")

        # Write filler dictionary
        with open(filler_file, 'w') as f:
            f.write("<s>\tSIL\n</s>\tSIL\n<sil>\tSIL\n")

        # Write phones
        phones = set()
        for pron in pronunciations.values():
            phones.update(pron.split())
        phones.add('SIL')
        
        with open(phones_file, 'w') as f:
            for phone in sorted(phones):
                f.write(f"{phone}\n")

    def guess_pronunciation(self, word):
        """Simple pronunciation guesser - replace with proper dictionary lookup"""
        # This is a very basic example - you should use a proper pronunciation dictionary
        phones = []
        for char in word.lower():
            if char in 'aeiou':
                phones.append(char.upper())
            else:
                phones.append(char.upper() + 'H')
        return phones

    def prepare_audio_files(self):
        """Copy and prepare audio files"""
        fileids = []
        
        for wav_file in self.wav_dir.glob('*.wav'):
            # Copy wav file to training directory
            shutil.copy2(wav_file, self.wav_train_dir)
            fileids.append(wav_file.stem)

        # Write fileids file
        with open(self.etc_dir / 'training.fileids', 'w') as f:
            for fileid in fileids:
                f.write(f"{fileid}\n")

    def create_transcription_file(self, transcriptions):
        """Create transcription file"""
        with open(self.etc_dir / 'training.transcription', 'w') as f:
            for transcription in transcriptions:
                f.write(f"{transcription}\n")

    def prepare(self):
        """Run the full preparation process"""
        print("Starting training data preparation...")
        
        print("1. Collecting transcriptions and vocabulary...")
        transcriptions, vocabulary = self.collect_transcriptions()
        
        print("2. Creating pronunciation dictionary...")
        self.create_dictionary(vocabulary)
        
        print("3. Preparing audio files...")
        self.prepare_audio_files()
        
        print("4. Creating transcription file...")
        self.create_transcription_file(transcriptions)
        
        print("\nTraining data preparation completed!")
        print(f"Total transcriptions: {len(transcriptions)}")
        print(f"Vocabulary size: {len(vocabulary)}")
        print(f"\nTraining data is ready in: {self.training_dir}")

if __name__ == "__main__":
    preparator = TrainingDataPreparator()
    preparator.prepare() 