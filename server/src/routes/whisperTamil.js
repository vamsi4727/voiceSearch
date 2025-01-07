// whisperTamil.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const whisperTamilService = require('../services/whisperTamilService');

const router = express.Router();
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, path.join(__dirname, '../../uploads/'));
    },
    filename: function(req, file, cb) {
        cb(null, 'whisper-tamil-' + Date.now() + '.wav');
    }
});

const upload = multer({ storage });

router.post('/recognize', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }

        console.log('Processing Tamil Whisper recognition for:', req.file.path);
        const result = await whisperTamilService.recognizeSpeech(req.file.path);
        
        return res.json(result);
    } catch (error) {
        console.error('Tamil Whisper recognition failed:', error);
        return res.status(500).json({
            text: '',
            romanized: '',
            error: error.message,
            processingTime: 0,
            model: 'whisper-tamil-medium'
        });
    }
});

module.exports = router;