const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const whisperTrainingService = require('../services/whisperTrainingService');

const router = express.Router();

// Configure multer for training data
const storage = multer.diskStorage({
    destination: async function(req, file, cb) {
        // Store uploads in server/training_data/uploads
        const uploadDir = path.join(__dirname, '../../../training_data/uploads');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: function(req, file, cb) {
        const timestamp = Date.now();
        cb(null, `train_${timestamp}.wav`);
    }
});

const upload = multer({ storage });

// Save training data endpoint
router.post('/save', upload.single('audio'), async (req, res) => {
    try {
        console.log('Received training request:', {
            body: req.body,
            file: req.file
        });

        if (!req.file || !req.body.actualText) {
            return res.status(400).json({ 
                error: 'Both audio file and actual text are required' 
            });
        }

        // Add training example using the service
        const result = await whisperTrainingService.addTrainingExample(
            req.file.path,
            req.body.actualText,
            req.body.whisperText || '',
            req.body.googleText || '',
            req.body.language || 'en'
        );

        res.json({
            success: true,
            result
        });
    } catch (error) {
        console.error('Error saving training data:', error);
        res.status(500).json({
            error: 'Failed to save training data',
            message: error.message
        });
    }
});

// List all training samples
router.get('/list', async (req, res) => {
    try {
        const samples = await whisperTrainingService.listTrainingExamples();
        
        res.json({
            samples,
            statistics: {
                totalSamples: samples.length,
                averageAccuracy: samples.length > 0 
                    ? samples.reduce((acc, s) => acc + (s.accuracy || 0), 0) / samples.length 
                    : 0
            }
        });
    } catch (error) {
        console.error('Error listing training data:', error);
        res.status(500).json({ error: 'Failed to list training data' });
    }
});

module.exports = router;