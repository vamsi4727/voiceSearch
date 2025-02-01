import React, { useState } from 'react';
import { Play, Pause } from 'lucide-react';

const AudioPlayer = ({ audioUrl, className }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentAudio, setCurrentAudio] = useState(null);

    const handlePlayPause = () => {
        if (currentAudio) {
            currentAudio.pause();
            setCurrentAudio(null);
            setIsPlaying(false);
            return;
        }

        if (audioUrl) {
            const audio = new Audio(audioUrl);
            audio.onended = () => {
                setIsPlaying(false);
                setCurrentAudio(null);
            };
            audio.play().catch(error => {
                console.error('Failed to play audio:', error);
                alert('Failed to play audio: ' + error.message);
            });
            setCurrentAudio(audio);
            setIsPlaying(true);
        }
    };

    return (
        <button 
            onClick={handlePlayPause}
            className={`p-2 hover:bg-gray-100 rounded flex items-center gap-2 ${className}`}
        >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            <span className="text-sm text-gray-500">
                {isPlaying ? 'Stop' : 'Play Recording'}
            </span>
        </button>
    );
};

export default AudioPlayer; 