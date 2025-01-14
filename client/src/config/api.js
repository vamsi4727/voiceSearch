const API_URL = process.env.NODE_ENV.REACT_APP_API_URL || 'http://localhost:3141';

export const endpoints = {
  // Speech recognition endpoints
  speechRecognition: `${API_URL}/api/speechRecognition/recognize`,
  whisper: `${API_URL}/api/whisper/recognize`,
  vosk: `${API_URL}/api/vosk/recognize`,
  whisperSinhala: `${API_URL}/api/whisper-sinhala/recognize`,
  whisperTamil: `${API_URL}/api/whisper-tamil/recognize`,
  
  // Training endpoints
  whisperTraining: {
    save: `${API_URL}/api/whisper-training/save`,
    list: `${API_URL}/api/whisper-training/list`,
  },
  // Helper function for audio URLs
  getAudioUrl: (path) => `${API_URL}/${path}`
  
};