const express = require('express');
const multer = require('multer');
const sphinxService = require('../services/sphinxService'); // Corrected import path
const speechRecognitionService = require('../services/speechRecognition'); // Corrected import path

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/recognize', upload.single('audio'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
    }

    try {
        // Process with both engines in parallel
        const [sphinxResult, speechRecognitionResult] = await Promise.all([
            sphinxService.recognizeSpeech(req.file.path).catch(error => ({
                error: error.message || 'Sphinx processing failed'
            })),
            speechRecognitionService.recognize(req.file.path).catch(error => ({
                error: error.message || 'Speech Recognition processing failed'
            }))
        ]);

        res.json({
            sphinx: {
                text: sphinxResult.error ? undefined : sphinxResult.text,
                error: sphinxResult.error
            },
            speechRecognition: {
                text: speechRecognitionResult.error ? undefined : speechRecognitionResult.text,
                error: speechRecognitionResult.error
            },
            processingTime: {
                sphinx: sphinxResult.processingTime,
                speechRecognition: speechRecognitionResult.processingTime
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Recognition failed', message: error.message });
    }
});

module.exports = router;