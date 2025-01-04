const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const config = require('./config');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



// Ensure directories exist
const uploadsDir = path.join(__dirname, config.dirs.upload);
const trainingDataDir = path.join(__dirname, config.dirs.training);

[uploadsDir, trainingDataDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Debug logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Serve training data files - note the path should match what's in metadata
app.use('/training_data/uploads', express.static(path.join(__dirname, config.dirs.upload)));
app.use('/training_data', express.static(path.join(__dirname, config.dirs.training)));

// Import and mount routes

const speechRecognitionRouter = require('./routes/speechRecognition');
const whisperRouter = require('./routes/whisper');
const voskRouter = require('./routes/vosk');
const whisperTrainingRouter = require('./routes/whisperTraining');

// Mount route handlers

app.use('/api/speechRecognition', speechRecognitionRouter);
app.use('/api/whisper', whisperRouter);
app.use('/api/vosk', voskRouter);
app.use('/api/whisper-training', whisperTrainingRouter);

// Error handling middleware must be after route handlers
app.use((req, res, next) => {
    res.status(404).json({ error: 'Not Found' });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});