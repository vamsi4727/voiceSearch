const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { recognizeSpeech } = require('../services/sphinxService');

const router = express.Router();

// Configure multer for training data
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const wavDir = path.join(__dirname, '../../../test_data/wav');
        
        // Create directories if they don't exist
        if (!fs.existsSync(wavDir)) {
            fs.mkdirSync(wavDir, { recursive: true });
        }
        
        cb(null, wavDir);
    },
    filename: (req, file, cb) => {
        // Get testId from the request body
        console.log('Request body in multer:', req.body);
        
        // Generate timestamp-based ID if testId is not available
        const timestamp = Date.now();
        const testId = req.body.testId || `test_${timestamp}`;
        
        // Ensure filename is unique
        const filename = `${testId}_${timestamp}.wav`;
        console.log('Generated filename:', filename);
        
        cb(null, filename);
    }
});

const upload = multer({ storage });

// Handle audio recording and transcription
router.post('/record', upload.single('audio'), async (req, res) => {
    try {
        console.log('Received training request:', {
            testId: req.body.testId,
            file: req.file
        });

        if (!req.file) {
            console.error('No audio file received');
            return res.status(400).json({ 
                error: 'No audio file provided'
            });
        }

        // Get transcription from PocketSphinx
        console.log('Processing training audio:', req.file.path);
        const transcribedText = await recognizeSpeech(req.file.path);
        console.log('PocketSphinx transcription:', transcribedText); // Debug log

        // Save metadata including transcribed text
        const metadataDir = path.join(__dirname, '../../../test_data/metadata');
        if (!fs.existsSync(metadataDir)) {
            fs.mkdirSync(metadataDir, { recursive: true });
        }

        const metadata = {
            testId: req.body.testId,
            timestamp: new Date().toISOString(),
            transcribedText: transcribedText, // Save the transcribed text
            audioPath: req.file.path,
            accuracy: 0
        };

        // Save metadata
        const metadataPath = path.join(metadataDir, `${req.body.testId}.json`);
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

        res.json({ 
            success: true,
            text: transcribedText,
            audioPath: req.file.path,
            testId: req.body.testId
        });
    } catch (error) {
        console.error('Training recording error:', error);
        res.status(500).json({ 
            error: 'Training recording failed',
            message: error.message
        });
    }
});

// Save training data
router.post('/save', async (req, res) => {
    try {
        const { testId, transcribedText, actualText } = req.body;

        if (!testId || !actualText) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Save transcription
        const transcriptionDir = path.join(__dirname, '../../../test_data/transcriptions');
        if (!fs.existsSync(transcriptionDir)) {
            fs.mkdirSync(transcriptionDir, { recursive: true });
        }

        const transcriptionPath = path.join(transcriptionDir, `${testId}.txt`);
        fs.writeFileSync(transcriptionPath, actualText.trim());

        // Save metadata
        const metadataDir = path.join(__dirname, '../../../test_data/metadata');
        if (!fs.existsSync(metadataDir)) {
            fs.mkdirSync(metadataDir, { recursive: true });
        }

        const metadata = {
            testId,
            timestamp: new Date().toISOString(),
            transcribedText,
            actualText,
            accuracy: calculateAccuracy(transcribedText, actualText)
        };

        const metadataPath = path.join(metadataDir, `${testId}.json`);
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

        res.json({ success: true, metadata });
    } catch (error) {
        console.error('Error saving training data:', error);
        res.status(500).json({ error: 'Failed to save training data' });
    }
});

// List all training samples
router.get('/list', async (req, res) => {
    try {
        const wavDir = path.join(__dirname, '../../../test_data/wav');
        const transcriptionDir = path.join(__dirname, '../../../test_data/transcriptions');
        const metadataDir = path.join(__dirname, '../../../test_data/metadata');

        // Ensure directories exist
        [wavDir, transcriptionDir, metadataDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });

        // Read metadata files
        const metadataFiles = fs.readdirSync(metadataDir).filter(file => file.endsWith('.json'));
        
        const samples = metadataFiles.map(file => {
            const metadata = JSON.parse(fs.readFileSync(path.join(metadataDir, file), 'utf8'));
            const wavFile = `${metadata.testId}.wav`;
            
            return {
                testId: metadata.testId,
                audioPath: `/test_data/wav/${wavFile}`,
                transcribedText: metadata.transcribedText || '',
                actualText: metadata.actualText || '',
                accuracy: metadata.accuracy || 0,
                timestamp: metadata.timestamp
            };
        });

        // Calculate statistics
        const totalSamples = samples.length;
        const validAccuracies = samples.filter(s => s.accuracy > 0);
        const averageAccuracy = validAccuracies.length > 0
            ? validAccuracies.reduce((sum, s) => sum + s.accuracy, 0) / validAccuracies.length
            : 0;

        console.log('Sending samples:', samples);

        res.json({
            samples,
            statistics: {
                totalSamples,
                averageAccuracy,
                languageBreakdown: { english: totalSamples }
            }
        });
    } catch (error) {
        console.error('Error listing training data:', error);
        res.status(500).json({ error: 'Failed to list training data' });
    }
});

// Update transcription
router.put('/update/:testId', async (req, res) => {
    try {
        const { testId } = req.params;
        const { transcribedText, actualText } = req.body;

        console.log('Updating sample with:', {
            testId,
            transcribedText,
            actualText
        });

        // Ensure directories exist
        const metadataDir = path.join(__dirname, '../../../test_data/metadata');
        const transcriptionDir = path.join(__dirname, '../../../test_data/transcriptions');
        
        [metadataDir, transcriptionDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });

        // Save actual text to transcription file
        const transcriptionPath = path.join(transcriptionDir, `${testId}.txt`);
        if (actualText) {
            fs.writeFileSync(transcriptionPath, actualText);
        }

        // Update metadata
        const metadataPath = path.join(metadataDir, `${testId}.json`);
        let metadata = {};
        
        if (fs.existsSync(metadataPath)) {
            metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        }

        // Update metadata with new values
        metadata = {
            ...metadata,
            testId,
            transcribedText: transcribedText || metadata.transcribedText || '',
            actualText: actualText || metadata.actualText || '',
            lastUpdated: new Date().toISOString()
        };

        // Calculate accuracy if both texts are available
        if (metadata.transcribedText && metadata.actualText) {
            const accuracy = calculateAccuracy(metadata.transcribedText, metadata.actualText);
            console.log('Calculated accuracy:', {
                transcribed: metadata.transcribedText,
                actual: metadata.actualText,
                accuracy
            });
            metadata.accuracy = accuracy;
        }

        // Save updated metadata
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

        // Return updated data
        res.json({
            success: true,
            metadata,
            message: 'Sample updated successfully'
        });
    } catch (error) {
        console.error('Error updating sample:', error);
        res.status(500).json({
            error: 'Failed to update sample',
            message: error.message
        });
    }
});

// Helper function to calculate statistics
async function calculateStatistics() {
    try {
        const metadataDir = path.join(__dirname, '../../../test_data/metadata');
        if (!fs.existsSync(metadataDir)) {
            return {
                totalSamples: 0,
                averageAccuracy: 0,
                languageBreakdown: {}
            };
        }

        const files = fs.readdirSync(metadataDir);
        let totalAccuracy = 0;
        let validSamples = 0;

        files.forEach(file => {
            if (file.endsWith('.json')) {
                const metadata = JSON.parse(
                    fs.readFileSync(path.join(metadataDir, file), 'utf8')
                );
                if (metadata.accuracy !== undefined) {
                    totalAccuracy += metadata.accuracy;
                    validSamples++;
                }
            }
        });

        return {
            totalSamples: files.length,
            averageAccuracy: validSamples > 0 ? totalAccuracy / validSamples : 0,
            languageBreakdown: { english: files.length } // You can expand this later
        };
    } catch (error) {
        console.error('Error calculating statistics:', error);
        return {
            totalSamples: 0,
            averageAccuracy: 0,
            languageBreakdown: {}
        };
    }
}

// Update accuracy calculation
function calculateAccuracy(transcribed, actual) {
    if (!transcribed || !actual) {
        console.log('Missing text for accuracy calculation');
        return 0;
    }
    
    // Clean and normalize the texts
    const cleanText = (text) => text.toLowerCase()
        .trim()
        .replace(/[.,!?]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 0);

    const transcribedWords = cleanText(transcribed);
    const actualWords = cleanText(actual);

    console.log('Processing words:', {
        transcribedWords,
        actualWords
    });

    if (actualWords.length === 0) {
        console.log('No words to compare');
        return 0;
    }

    // Count matching words
    let matches = 0;
    actualWords.forEach(actualWord => {
        if (transcribedWords.includes(actualWord)) {
            matches++;
            console.log('Found match:', actualWord);
        }
    });

    const accuracy = (matches / actualWords.length) * 100;
    
    console.log('Accuracy calculation result:', {
        matches,
        totalWords: actualWords.length,
        accuracy
    });

    return accuracy;
}

module.exports = router; 