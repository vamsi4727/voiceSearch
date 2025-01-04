// whisper.js (Express route)
const express = require('express');
const multer = require('multer');
const path = require('path');
const whisperService = require('../services/whisperService');

const router = express.Router();
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, path.join(__dirname, '../../uploads/'));
    },
    filename: function(req, file, cb) {
        cb(null, 'whisper-' + Date.now() + '.wav');
    }
});

const upload = multer({ storage });

router.post('/recognize', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }

        // Get language from form data, default to 'en' if not provided
        const language = req.body.language || 'en';
        
        console.log('Processing Whisper recognition for:', req.file.path, 'Language:', language);
        const result = await whisperService.recognizeSpeech(req.file.path, language);
        
        return res.json(result);
    } catch (error) {
        console.error('Whisper recognition failed:', error);
        return res.status(500).json({
            text: '',
            error: error.message,
            processingTime: 0
        });
    }
});

module.exports = router;