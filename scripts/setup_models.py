import os
import urllib.request
from pathlib import Path
import shutil

def setup_models():
    # Get the pocketsphinx model directory
    base_model_path = Path(r"C:\Users\vamsikrishna.k\AppData\Local\Programs\Python\Python313\Lib\site-packages\pocketsphinx\model")
    
    # Create directories if they don't exist
    base_model_path.mkdir(parents=True, exist_ok=True)
    
    # Updated URLs for model files with correct dictionary URL
    model_urls = {
        'acoustic_model': 'https://raw.githubusercontent.com/cmusphinx/pocketsphinx/master/model/en-us/en-us-phone.lm.bin',
        'language_model': 'https://raw.githubusercontent.com/cmusphinx/pocketsphinx/master/model/en-us/en-us.lm.bin',
        'dictionary': 'https://raw.githubusercontent.com/cmusphinx/pocketsphinx/master/model/en-us/cmudict-en-us.dict'
    }
    
    print("Downloading and setting up model files...")
    
    try:
        # Create en-us directory
        en_us_dir = base_model_path
        en_us_dir.mkdir(exist_ok=True)
        
        # Download files
        for model_type, url in model_urls.items():
            print(f"\nDownloading {model_type}...")
            filename = url.split('/')[-1]
            
            # Special handling for dictionary file - place it directly in model directory
            if model_type == 'dictionary':
                file_path = base_model_path / filename
            else:
                file_path = en_us_dir / filename
            
            try:
                urllib.request.urlretrieve(url, file_path)
                print(f"Successfully downloaded: {filename} to {file_path}")
            except Exception as e:
                print(f"Error downloading {filename}: {e}")
                continue
        
        print("\nModel setup completed!")
        print(f"Models installed in: {base_model_path}")
        
        # List downloaded files
        print("\nDownloaded files:")
        for file in base_model_path.glob('*'):
            print(f"- {file.name}")
            
    except Exception as e:
        print(f"Error during setup: {e}")
        return False
    
    return True

if __name__ == "__main__":
    setup_models() 