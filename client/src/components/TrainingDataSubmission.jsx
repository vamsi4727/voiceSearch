import React, { useState } from 'react';
import { Play, Pause, Save } from 'lucide-react';
import { TrainingDataStorage } from '../utils/trainingDataStorage';
import './TrainingDataSubmission.css';
import AudioPlayer from './AudioPlayer';

const TrainingDataSubmission = ({ 
    recognitionResult, 
    audioBlob, 
    language, 
    onSave 
}) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [actualTextSinhala, setActualTextSinhala] = useState('');
    const [actualTextEnglish, setActualTextEnglish] = useState('');
    const [audioUrl, setAudioUrl] = useState(null);
    const [currentAudio, setCurrentAudio] = useState(null);

    // Create audio URL when component mounts or audioBlob changes
    React.useEffect(() => {
        if (audioBlob) {
            const url = URL.createObjectURL(audioBlob);
            setAudioUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [audioBlob]);

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
            audio.play().catch(console.error);
            setCurrentAudio(audio);
            setIsPlaying(true);
        }
    };

    const handleSubmit = async () => {
        try {
            const audioUrl = URL.createObjectURL(audioBlob);
            
            const success = TrainingDataStorage.add({
                audioUrl,
                actualTextSinhala,
                actualTextEnglish,
                whisperText: recognitionResult.text,
                romanized: recognitionResult.romanized,
                language,
                processingTime: recognitionResult.processingTime,
                blob: audioBlob
            });

            if (success) {
                onSave && onSave();
                setActualTextSinhala('');
                setActualTextEnglish('');
            } else {
                throw new Error('Failed to save training data');
            }
        } catch (error) {
            console.error('Error saving training data:', error);
            alert('Failed to save training data');
        }
    };

    if (!recognitionResult?.text) return null;

    return (
        <div className="training-data-submission">
            <h3>Add to Training Data</h3>
            
            {/* <div className="audio-player">
                <AudioPlayer audioUrl={audioUrl} className="play-button" />
            </div> */}

            <div className="text-fields">
                <div className="model-output">
                    <label>Model Output:</label>
                    <div className="output-fields">
                        <div className="field">
                            <label>Sinhala:</label>
                            <textarea 
                                value={recognitionResult.text} 
                                readOnly 
                                rows={3}
                                dir="auto"
                            />
                        </div>
                        <div className="field">
                            <label>Romanized:</label>
                            <textarea 
                                value={recognitionResult.romanized || ''} 
                                readOnly 
                                rows={3}
                            />
                        </div>
                    </div>
                </div>

                <div className="field">
                    <label>Expected Output (Sinhala):</label>
                    <textarea
                        value={actualTextSinhala}
                        onChange={(e) => setActualTextSinhala(e.target.value)}
                        placeholder="Enter the correct Sinhala transcription..."
                        rows={3}
                        dir="auto"
                    />
                </div>

                <div className="field">
                    <label>Expected Output (English):</label>
                    <textarea
                        value={actualTextEnglish}
                        onChange={(e) => setActualTextEnglish(e.target.value)}
                        placeholder="Enter the English transliteration..."
                        rows={3}
                    />
                </div>
            </div>

            <div className="metadata">
                <p>Language: {language.toUpperCase()}</p>
                <p>Processing Time: {recognitionResult.processingTime}ms</p>
            </div>

            <button 
                onClick={handleSubmit}
                className="save-button"
                disabled={!actualTextSinhala.trim() || !actualTextEnglish.trim()}
            >
                <Save className="w-5 h-5" />
                Save to Training Data
            </button>
        </div>
    );
};

export default TrainingDataSubmission; 