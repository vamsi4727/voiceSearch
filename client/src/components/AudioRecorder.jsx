import React, { useState, useRef } from 'react';
import { audioBufferToWav } from '../utils/audioUtils';
import './AudioRecorder.css';
import { endpoints } from '../config/api';

const AudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [recognitionResults, setRecognitionResults] = useState({
    speechRecognition: { text: '', error: null, status: 'idle', processingTime: 0 },
    whisper: { 
      text: '', 
      romanized: '',
      error: null, 
      status: 'idle',
      processingTime: 0
    },
    vosk: { text: '', error: null, status: 'idle', processingTime: 0 }
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
      
      // Reset all results
      setRecognitionResults({
        speechRecognition: { text: '', error: null, status: 'idle', processingTime: 0 },
        whisper: { text: '', romanized: '', error: null, status: 'idle', processingTime: 0 },
        vosk: { text: '', error: null, status: 'idle', processingTime: 0 }
      });
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

      // Update status for all engines to 'processing'
      setRecognitionResults(prev => ({
        speechRecognition: { ...prev.speechRecognition, status: 'processing' },
        whisper: { ...prev.whisper, status: 'processing' },
        vosk: { ...prev.vosk, status: 'processing' }
      }));

      // Start processing with all engines independently
      const processEngine = async (engineName) => {
        try {
          const clientStartTime = Date.now();
          console.log(`[${engineName}] Started processing at:`, new Date(clientStartTime).toISOString());
          
          let endpoint;
          switch(engineName) {
            case 'speechRecognition':
              endpoint = endpoints.speechRecognition;
              break;
            case 'whisper':
              endpoint = endpoints.whisper;
              break;
            case 'vosk':
              endpoint = endpoints.vosk;
              break;
            default:
              throw new Error('Unknown engine name');
          }

          console.log(`[${engineName}] Sending request to:`, endpoint);
          const response = await fetch(endpoint, {
            method: 'POST',
            body: formData,
          });

          console.log(`[${engineName}] Received response at:`, new Date().toISOString());
          const result = await response.json();
          const clientEndTime = Date.now();
          
          // Log all timing information
          console.log(`[${engineName}] Timing details:`, {
            clientStartTime: new Date(clientStartTime).toISOString(),
            clientEndTime: new Date(clientEndTime).toISOString(),
            clientProcessingTime: clientEndTime - clientStartTime,
            serverProcessingTime: result.processingTime, // Time reported by server
            fullResponse: result // Log the complete response
          });

          // Use server's processing time if available, otherwise use client-side time
          const processingTime = result.processingTime || (clientEndTime - clientStartTime);

          setRecognitionResults(prev => ({
            ...prev,
            [engineName]: {
              text: result.text || '',
              romanized: result.romanized || result.text || '',
              error: result.error,
              status: 'done',
              processingTime,
              serverTime: result.processingTime, // Store server time separately
              clientTime: clientEndTime - clientStartTime // Store client time separately
            }
          }));

          setRecognitionResults(prev => ({
            ...prev,
            [engineName]: {
              text: result.text || '',
              romanized: result.romanized || result.text || '',
              error: result.error,
              status: 'done',
              processingTime
            }
          }));

          // If all engines are done, set overall status to success
          setRecognitionResults(prev => {
            const allDone = Object.values(prev).every(r => r.status === 'done');
            if (allDone) {
              setStatus('success');
              setShowTraining(true);
            }
            return prev;
          });
        } catch (error) {
          console.error(`Error processing ${engineName}:`, error);
          setRecognitionResults(prev => ({
            ...prev,
            [engineName]: {
              ...prev[engineName],
              error: error.message,
              status: 'error',
              processingTime: 0
            }
          }));
        }
      };

      // Launch all processes in parallel
      processEngine('speechRecognition');
      processEngine('whisper');
      processEngine('vosk');

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

      {status !== 'idle' && (
        <div className="results">
          <h3>Recognition Results:</h3>
          
          <div className="engine-result">
            <h4>Google Speech Recognition:</h4>
            {recognitionResults.speechRecognition.status === 'processing' ? (
              <p>Processing...</p>
            ) : recognitionResults.speechRecognition.error ? (
              <p className="error">{recognitionResults.speechRecognition.error}</p>
            ) : (
              <>
                <p>{recognitionResults.speechRecognition.text}</p>
                {recognitionResults.speechRecognition.processingTime > 0 && (
                  <small>Processing time: {recognitionResults.speechRecognition.processingTime}ms</small>
                )}
              </>
            )}
          </div>

          <div className="engine-result">
            <h4>Whisper:</h4>
            {recognitionResults.whisper.status === 'processing' ? (
              <p>Processing...</p>
            ) : recognitionResults.whisper.error ? (
              <p className="error">{recognitionResults.whisper.error}</p>
            ) : (
              <>
                <p>
                  {selectedLanguage === 'en' ? 
                    recognitionResults.whisper.text : 
                    recognitionResults.whisper.romanized}
                </p>
                {recognitionResults.whisper.processingTime > 0 && (
                  <div className="timing-info">
                    <small>Server processing time: {recognitionResults.whisper.serverTime}ms</small>
                    <small>Total time: {recognitionResults.whisper.processingTime}ms</small>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="engine-result">
            <h4>Vosk:</h4>
            {recognitionResults.vosk.status === 'processing' ? (
              <p>Processing...</p>
            ) : recognitionResults.vosk.error ? (
              <p className="error">{recognitionResults.vosk.error}</p>
            ) : (
              <>
                <p>{recognitionResults.vosk.text}</p>
                {recognitionResults.vosk.processingTime > 0 && (
                  <small>Processing time: {recognitionResults.vosk.processingTime}ms</small>
                )}
              </>
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