const express = require('express');
const multer = require('multer');
const path = require('path');
const speechRecognitionService = require('../services/speechRecognitionService');

const router = express.Router();
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, path.join(__dirname, '../../uploads/'));
    },
    filename: function(req, file, cb) {
        cb(null, 'speech-' + Date.now() + '.wav');
    }
});

const upload = multer({ storage });

// Define routes
router.post('/recognize', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }

        console.log('Processing speech recognition for:', req.file.path);
        const result = await speechRecognitionService.recognizeSpeech(req.file.path);
        
        return res.json(result);
    } catch (error) {
        console.error('Speech recognition failed:', error);
        return res.status(500).json({
            text: '',
            error: error.message,
            processingTime: 0
        });
    }
});

// Make sure to export the router
module.exports = router;
