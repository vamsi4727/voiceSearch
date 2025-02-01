import React, { useState, useRef } from 'react';
import { Play, Pause, RefreshCw } from 'lucide-react';
import { audioBufferToWav } from '../utils/audioUtils';
import { endpoints } from '../config/api';
import './WhisperModels.css';
import TrainingDataSubmission from './TrainingDataSubmission';

const WhisperModels = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState({
    text: '',
    romanized: '',
    error: null,
    processingTime: 0,
    model: ''
  });
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [audioBlob, setAudioBlob] = useState(null);

  const getEndpointForLanguage = () => {
    switch(selectedLanguage) {
      case 'ta':
        return endpoints.whisperTamil;
      case 'si':
        return endpoints.whisperSinhala;
      default:
        return endpoints.whisper;
    }
  };

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
        
        handleRecordingComplete(wavBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setStatus('recording');
      setResult({
        text: '',
        romanized: '',
        error: null,
        processingTime: 0,
        model: ''
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      setStatus('error');
      setResult(prev => ({ ...prev, error: 'Failed to start recording' }));
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
    setAudioBlob(blob);
    try {
      setStatus('processing');
      const formData = new FormData();
      formData.append('audio', blob, 'recording.wav');
      formData.append('language', selectedLanguage);

      const endpoint = getEndpointForLanguage();
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to process audio');
      }

      const data = await response.json();
      setResult({
        text: data.text || '',
        romanized: data.romanized || '',
        error: data.error,
        processingTime: data.processingTime,
        model: data.model || getModelName()
      });
      setStatus('success');
    } catch (error) {
      console.error('Error processing recording:', error);
      setStatus('error');
      setResult(prev => ({ ...prev, error: error.message }));
    }
  };

  const getModelName = () => {
    switch(selectedLanguage) {
      case 'ta':
        return 'Whisper Tamil (Medium)';
      case 'si':
        return 'Whisper Sinhala (Tiny)';
      default:
        return 'Whisper Base Model';
    }
  };

  return (
    <div className="whisper-models">
      <h2>Whisper Models Speech Recognition</h2>
      
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
          className={isRecording ? 'recording' : ''}
        >
          {isRecording ? (
            <>
              <Pause className="w-5 h-5" />
              Stop Recording
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Start Recording
            </>
          )}
        </button>
        <span className="status">{status}</span>
        {status === 'processing' && (
          <RefreshCw className="w-5 h-5 loading-spinner" />
        )}
      </div>

      {result.error && (
        <div className="error">
          Error: {result.error}
        </div>
      )}

      {(status === 'success' || result.text) && (
        <div className="results">
          <h3>Recognition Results:</h3>
          <div className="result-content">
            <div className="result-section">
              <h4>{getModelName()}</h4>
              {result.text && (
                <div>
                  <strong>Transcription:</strong>
                  <p>{result.text}</p>
                </div>
              )}
              {result.romanized && selectedLanguage !== 'en' && (
                <div>
                  <strong>Romanized:</strong>
                  <p>{result.romanized}</p>
                </div>
              )}
              {result.processingTime > 0 && (
                <p className="processing-time">
                  Processing time: {result.processingTime}ms
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {result.text && (
        <TrainingDataSubmission
          recognitionResult={result}
          audioBlob={audioBlob}
          language={selectedLanguage}
          onSave={() => {
            alert('Training data saved successfully!');
          }}
        />
      )}
    </div>
  );
};

export default WhisperModels;