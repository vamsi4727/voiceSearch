const express = require('express');
const multer = require('multer');
const speechRecognitionService = require('../services/speechRecognition');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/recognize', upload.single('audio'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
    }

    try {
        // Get language from form data, default to 'en'
        const language = req.body.language || 'en';
        
        const speechRecognitionResult = await speechRecognitionService
            .recognizeSpeech(req.file.path, language)
            .catch(error => ({
                error: error.message || 'Speech Recognition processing failed'
            }));

        res.json({
            text: speechRecognitionResult.error ? undefined : speechRecognitionResult.text,
            error: speechRecognitionResult.error,
            processingTime: speechRecognitionResult.processingTime
        });
    } catch (error) {
        res.status(500).json({ error: 'Recognition failed', message: error.message });
    }
});

module.exports = router;