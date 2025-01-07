const express = require('express');
const multer = require('multer');
const path = require('path');
const whisperSinhalaService = require('../services/whisperSinhalaService');

const router = express.Router();
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, path.join(__dirname, '../../uploads/'));
    },
    filename: function(req, file, cb) {
        cb(null, 'whisper-sinhala-' + Date.now() + '.wav');
    }
});

const upload = multer({ storage });

router.post('/recognize', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }

        console.log('Processing Sinhala Whisper recognition for:', req.file.path);
        const result = await whisperSinhalaService.recognizeSpeech(req.file.path);
        
        return res.json(result);
    } catch (error) {
        console.error('Sinhala Whisper recognition failed:', error);
        return res.status(500).json({
            text: '',
            romanized: '',
            error: error.message,
            processingTime: 0,
            model: 'whisper-tiny-sinhala'
        });
    }
});

module.exports = router;