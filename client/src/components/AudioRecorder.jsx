import React, { useState, useRef } from 'react';
import { audioBufferToWav } from '../utils/audioUtils';
import './AudioRecorder.css';
import { endpoints } from '../config/api';

const AudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [recognitionResults, setRecognitionResults] = useState({
    speechRecognition: { text: 'Processing', error: null, status: 'processing' },
    whisper: { 
      text: 'Processing', 
      romanized: 'Processing',  // Added romanized text field
      error: null, 
      status: 'processing' 
    },
    vosk: { text: 'Processing', error: null, status: 'processing' }
  });
  const [status, setStatus] = useState('idle');
  const [actualText, setActualText] = useState('');
  const [showTraining, setShowTraining] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [lastRecordingBlob, setLastRecordingBlob] = useState(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        chunksRef.current = [];
        
        const audioContext = new AudioContext({ sampleRate: 16000 });
        const audioBuffer = await audioContext.decodeAudioData(await audioBlob.arrayBuffer());
        const wavBuffer = audioBufferToWav(audioBuffer);
        const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });
        
        setLastRecordingBlob(wavBlob);
        handleRecordingComplete(wavBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setStatus('recording');
      setShowTraining(false);
      setActualText('');
    } catch (error) {
      console.error('Error starting recording:', error);
      setStatus('error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setStatus('processing');
    }
  };

  const handleRecordingComplete = async (blob) => {
    try {
      setStatus('processing');
      const formData = new FormData();
      formData.append('audio', blob, 'recording.wav');
      formData.append('language', selectedLanguage);

      console.log('Audio blob:', {
        type: blob.type,
        size: blob.size,
        lastModified: blob.lastModified
      });
  

      // Process with all engines in parallel
      const [speechResult, whisperResult, voskResult] = await Promise.all([
        fetch(endpoints.speechRecognition, {
          method: 'POST',
          body: formData,
        }).then(res => res.json()),
        fetch(endpoints.whisper, {
          method: 'POST',
          body: formData,
        }).then(res => res.json()),
        fetch(endpoints.vosk, {
          method: 'POST',
          body: formData,
        }).then(res => res.json())
      ]);

      console.log('Speech result:', speechResult);
      console.log('Whisper result:', whisperResult);
      console.log('Vosk result:', voskResult);

      setRecognitionResults({
        speechRecognition: {
          text: speechResult.text || '',
          error: speechResult.error,
          status: 'done'
        },
        whisper: {
          text: whisperResult.text || '',
          romanized: whisperResult.romanized || whisperResult.text || '', // Get romanized version
          error: whisperResult.error,
          status: 'done'
        },
        vosk: {
          text: voskResult.text || '',
          error: voskResult.error,
          status: 'done'
        }
      });

      setShowTraining(true);
      setStatus('success');
    } catch (error) {
      console.error('Error processing recording:', error);
      setStatus('error');
    }
  };

  const handleSaveTrainingData = async () => {
    if (!actualText.trim() || !lastRecordingBlob) {
      alert('Please enter the actual text spoken');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('audio', lastRecordingBlob, 'recording.wav');
      formData.append('actualText', actualText);
      formData.append('whisperText', selectedLanguage === 'en' ? 
        recognitionResults.whisper.text : 
        recognitionResults.whisper.romanized);
      formData.append('googleText', recognitionResults.speechRecognition.text);
      formData.append('language', selectedLanguage);

      const response = await fetch(endpoints.whisperTraining.save, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to save training data');
      }

      alert('Training data saved successfully!');
      setActualText('');
      setShowTraining(false);
    } catch (error) {
      console.error('Error saving training data:', error);
      alert('Failed to save training data: ' + error.message);
    }
  };

  const copyGoogleText = () => {
    setActualText(recognitionResults.speechRecognition.text);
  };

  return (
    <div className="audio-recorder">
      <h2>Speech Recognition</h2>
      
      <div className="language-selector">
        <label htmlFor="language">Select Language: </label>
        <select
          id="language"
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
          disabled={isRecording}
        >
          <option value="en">English</option>
          <option value="si">Sinhala</option>
          <option value="ta">Tamil</option>
        </select>
      </div>

      <div className="record-controls">
        <button 
          onClick={isRecording ? stopRecording : startRecording}
          className={`record-button ${isRecording ? 'recording' : ''}`}
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
        <div className="status">{status}</div>
      </div>

      {status === 'success' && (
        <div className="results">
          <h3>Recognition Results:</h3>
          
          <div className="engine-result">
            <h4>Google Speech Recognition:</h4>
            {recognitionResults.speechRecognition.status === 'processing' ? (
              <p>Processing...</p>
            ) : recognitionResults.speechRecognition.error ? (
              <p className="error">{recognitionResults.speechRecognition.error}</p>
            ) : (
              <p>{recognitionResults.speechRecognition.text}</p>
            )}
          </div>

          <div className="engine-result">
            <h4>Whisper:</h4>
            {recognitionResults.whisper.status === 'processing' ? (
              <p>Processing...</p>
            ) : recognitionResults.whisper.error ? (
              <p className="error">{recognitionResults.whisper.error}</p>
            ) : (
              <p>
                {selectedLanguage === 'en' ? 
                  recognitionResults.whisper.text : 
                  recognitionResults.whisper.romanized}
              </p>
            )}
          </div>

          <div className="engine-result">
            <h4>Vosk:</h4>
            {recognitionResults.vosk.status === 'processing' ? (
              <p>Processing...</p>
            ) : recognitionResults.vosk.error ? (
              <p className="error">{recognitionResults.vosk.error}</p>
            ) : (
              <p>{recognitionResults.vosk.text}</p>
            )}
          </div>

          {showTraining && (
            <div className="training-section">
              <h4>Verify Actual Text:</h4>
              <button onClick={copyGoogleText} className="copy-button">
                Copy Google's Text
              </button>
              <textarea
                value={actualText}
                onChange={(e) => setActualText(e.target.value)}
                placeholder="Enter or verify the actual text spoken..."
                className="actual-text"
                rows={4}
              />
              <button 
                onClick={handleSaveTrainingData}
                disabled={!actualText.trim()}
                className="save-button"
              >
                Save Training Data
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;