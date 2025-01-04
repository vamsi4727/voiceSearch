import speech_recognition as sr
import time

def recognize_speech(audio_file_path):
    start_time = time.time()
    recognizer = sr.Recognizer()
    
    try:
        with sr.AudioFile(audio_file_path) as source:
            audio = recognizer.record(source)
            text = recognizer.recognize_google(audio)  # Using Google's speech recognition
            
        processing_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        return {
            "text": text,
            "error": None,
            "processingTime": processing_time
        }
    except Exception as e:
        processing_time = (time.time() - start_time) * 1000
        return {
            "text": "",
            "error": str(e),
            "processingTime": processing_time
        }
