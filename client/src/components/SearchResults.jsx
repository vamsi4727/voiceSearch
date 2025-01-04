import React, { useRef, useState, useEffect } from 'react';
import './SearchResults.css';

const SearchResults = ({ audioBlob, searchQuery, isPlaying, onPlayPause }) => {
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const audioRef = useRef(null);
  const [audioUrl, setAudioUrl] = useState(null);

  useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [audioBlob]);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isAudioPlaying) {
        audioRef.current.pause();
      } else {
        // Reset to start if ended
        if (audioRef.current.ended) {
          audioRef.current.currentTime = 0;
        }
        audioRef.current.play().catch(e => console.error('Playback failed:', e));
      }
      setIsAudioPlaying(!isAudioPlaying);
    }
  };

  const handleAudioEnded = () => {
    setIsAudioPlaying(false);
  };

  return (
    <div className="search-results">
      {audioBlob && (
        <div className="audio-section">
          <div className="audio-controls">
            <button 
              className="play-button" 
              onClick={handlePlayPause}
              aria-label={isAudioPlaying ? 'Pause' : 'Play'}
            >
              {isAudioPlaying ? (
                <span className="material-icons">pause_circle</span>
              ) : (
                <span className="material-icons">play_circle</span>
              )}
            </button>
            <span className="audio-status">
              {isAudioPlaying ? 'Playing recorded audio' : 'Recorded audio available'}
            </span>
          </div>
        </div>
      )}

      {searchQuery && (
        <div className="transcription">
          <div className="transcription-header">
            <span className="material-icons">record_voice_over</span>
            <h3>Transcribed Text</h3>
          </div>
          <p className="transcription-text">{searchQuery}</p>
        </div>
      )}

      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={handleAudioEnded}
          onError={(e) => console.error('Audio error:', e)}
        />
      )}
    </div>
  );
};

export default SearchResults;