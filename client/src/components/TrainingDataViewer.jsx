import React, { useState, useEffect } from 'react';
import { Play, Pause, RefreshCw } from 'lucide-react';
import { endpoints } from '../config/api';

const TrainingDataViewer = () => {
  const [trainingData, setTrainingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingId, setPlayingId] = useState(null);

  const fetchTrainingData = async () => {
    try {
      setLoading(true);
      const response = await fetch(endpoints.whisperTraining.list);
      const data = await response.json();
      console.log('Fetched training data:', data.samples);
      setTrainingData(data.samples || []);
    } catch (error) {
      console.error('Error fetching training data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainingData();
  }, []);

  const handlePlayPause = (audioPath, id) => {
    if (currentAudio) {
      currentAudio.pause();
      if (playingId === id) {
        setCurrentAudio(null);
        setIsPlaying(false);
        setPlayingId(null);
        return;
      }
    }

    // Clean up the audio path to match the server's static file serving
    const cleanPath = audioPath.startsWith('/') ? audioPath.slice(1) : audioPath;
    const audioUrl = endpoints.getAudioUrl(cleanPath);
    console.log('Playing audio from:', audioUrl);

    const audio = new Audio(audioUrl);
    
    audio.onended = () => {
      setIsPlaying(false);
      setPlayingId(null);
      setCurrentAudio(null);
    };

    audio.onerror = (e) => {
      console.error('Audio playback error:', e);
      alert('Failed to play audio. Check console for details.');
      setIsPlaying(false);
      setPlayingId(null);
      setCurrentAudio(null);
    };

    // Play the audio with error handling
    audio.play().then(() => {
      console.log('Audio playing successfully');
    }).catch(error => {
      console.error('Failed to play audio:', error);
      alert('Failed to play audio: ' + error.message);
    });

    setCurrentAudio(audio);
    setIsPlaying(true);
    setPlayingId(id);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Training Data</h2>
        <button 
          onClick={fetchTrainingData}
          className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
        >
          <RefreshCw className="h-5 w-5" />
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3 px-4 text-left border-b">Audio</th>
              <th className="py-3 px-4 text-left border-b">Timestamp</th>
              <th className="py-3 px-4 text-left border-b">Actual Text</th>
              <th className="py-3 px-4 text-left border-b">Whisper Text</th>
              <th className="py-3 px-4 text-left border-b">Google Text</th>
              <th className="py-3 px-4 text-left border-b">Language</th>
            </tr>
          </thead>
          <tbody>
            {trainingData.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="py-2 px-4 border-b">
                  <button 
                    onClick={() => handlePlayPause(item.audioPath, index)}
                    className="p-2 hover:bg-gray-100 rounded flex items-center gap-2"
                  >
                    {playingId === index && isPlaying ? 
                      <Pause className="h-5 w-5" /> : 
                      <Play className="h-5 w-5" />
                    }
                    <span className="text-sm text-gray-500">
                      {playingId === index && isPlaying ? 'Playing' : 'Play'}
                    </span>
                  </button>
                </td>
                <td className="py-2 px-4 border-b">
                  {new Date(item.timestamp).toLocaleString()}
                </td>
                <td className="py-2 px-4 border-b">{item.actualText}</td>
                <td className="py-2 px-4 border-b">{item.whisperText}</td>
                <td className="py-2 px-4 border-b">{item.googleText}</td>
                <td className="py-2 px-4 border-b">{item.language}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {trainingData.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No training data available
        </div>
      )}
    </div>
  );
};

export default TrainingDataViewer;