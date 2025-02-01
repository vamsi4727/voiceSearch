import React, { useState, useEffect } from 'react';
import { Play, Pause, RefreshCw } from 'lucide-react';
import { TrainingDataStorage } from '../utils/trainingDataStorage';
import AudioPlayer from './AudioPlayer';

const TrainingDataViewer = () => {
  const [trainingData, setTrainingData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTrainingData = () => {
    setLoading(true);
    try {
      const data = TrainingDataStorage.getAll();
      setTrainingData(data);
    } catch (error) {
      console.error('Error fetching training data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainingData();
  }, []);

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
        <div className="flex gap-2">
          <button 
            onClick={fetchTrainingData}
            className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <button 
            onClick={() => {
              if (window.confirm('Clear all training data?')) {
                TrainingDataStorage.clear();
                fetchTrainingData();
              }
            }}
            className="p-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {/* <th className="py-3 px-4 text-left border-b">Audio</th> */}
              <th className="py-3 px-4 text-left border-b">Timestamp</th>
              <th className="py-3 px-4 text-left border-b">Expected (Sinhala)</th>
              <th className="py-3 px-4 text-left border-b">Expected (English)</th>
              <th className="py-3 px-4 text-left border-b">Model Output (Sinhala)</th>
              <th className="py-3 px-4 text-left border-b">Model Output (Romanized)</th>
              <th className="py-3 px-4 text-left border-b">Language</th>
              <th className="py-3 px-4 text-left border-b">Processing Time</th>
            </tr>
          </thead>
          <tbody>
            {trainingData.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                {/* <td className="py-2 px-4 border-b">
                  <AudioPlayer audioUrl={item.audioUrl} />
                </td> */}
                <td className="py-2 px-4 border-b">
                  {new Date(item.timestamp).toLocaleString()}
                </td>
                <td className="py-2 px-4 border-b" dir="auto">{item.actualTextSinhala}</td>
                <td className="py-2 px-4 border-b">{item.actualTextEnglish}</td>
                <td className="py-2 px-4 border-b" dir="auto">{item.whisperText}</td>
                <td className="py-2 px-4 border-b">{item.romanized}</td>
                <td className="py-2 px-4 border-b">{item.language}</td>
                <td className="py-2 px-4 border-b">
                  {item.processingTime}ms
                </td>
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