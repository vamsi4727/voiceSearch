import sys
import json
import speech_recognition as sr
import time

def recognize_audio(audio_path, language='en-US'):
    start_time = time.time()
    recognizer = sr.Recognizer()
    
    try:
        with sr.AudioFile(audio_path) as source:
            print(f"Reading audio file: {audio_path}", file=sys.stderr)
            audio = recognizer.record(source)
            
        print(f"Recognizing speech in language: {language}...", file=sys.stderr)
        text = recognizer.recognize_google(audio, language=language)
        
        result = {
            "text": text,
            "error": None,
            "processingTime": int((time.time() - start_time) * 1000)
        }
        
        # Output JSON to stdout
        print(json.dumps(result))
        return 0
        
    except sr.UnknownValueError:
        result = {
            "text": "",
            "error": "Speech Recognition could not understand audio",
            "processingTime": int((time.time() - start_time) * 1000)
        }
        print(json.dumps(result))
        return 1
        
    except sr.RequestError as e:
        result = {
            "text": "",
            "error": f"Could not request results from Speech Recognition service; {str(e)}",
            "processingTime": int((time.time() - start_time) * 1000)
        }
        print(json.dumps(result))
        return 1
        
    except Exception as e:
        result = {
            "text": "",
            "error": f"Error processing audio: {str(e)}",
            "processingTime": int((time.time() - start_time) * 1000)
        }
        print(json.dumps(result))
        return 1

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({
            "text": "",
            "error": "Invalid arguments. Usage: python recognize_speech.py <audio_file_path> [language]",
            "processingTime": 0
        }))
        sys.exit(1)
    
    audio_file_path = sys.argv[1]
    language = sys.argv[2] if len(sys.argv) > 2 else 'en-US'
    
    sys.exit(recognize_audio(audio_file_path, language))