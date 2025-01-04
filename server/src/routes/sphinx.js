const express = require('express');
const multer = require('multer');
const path = require('path');
const sphinxService = require('../services/sphinxService');

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, path.join(__dirname, '../../uploads/'));
    },
    filename: function(req, file, cb) {
        cb(null, 'audio-' + Date.now() + '.wav');
    }
});

const upload = multer({ 
    storage,
    fileFilter: (req, file, cb) => {
        console.log('Received file:', file);
        cb(null, true);
    }
});

const router = express.Router();

router.post('/recognize', upload.single('audio'), async (req, res) => {
    console.log('Received recognition request');
    
    if (!req.file) {
        console.log('No file received');
        return res.status(400).json({ error: 'No audio file provided' });
    }

    try {
        console.log('Processing file:', req.file.path);
        const result = await sphinxService.recognizeSpeech(req.file.path);
        console.log('Recognition result:', result);

        return res.json({
            text: result.text,
            processingTime: result.processingTime,
            error: null
        });
    } catch (error) {
        console.error('Recognition failed:', error);
        return res.status(500).json({
            error: 'Recognition failed',
            message: error.message
        });
    }
});

module.exports = router;