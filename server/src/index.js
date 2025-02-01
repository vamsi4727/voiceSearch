const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const { spawn } = require('child_process');

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
const whisperSinhalaRouter = require('./routes/whisperSinhala');  // New
const whisperTamilRouter = require('./routes/whisperTamil');      // New

// Mount route handlers

app.use('/api/speechRecognition', speechRecognitionRouter);
app.use('/api/whisper', whisperRouter);
app.use('/api/vosk', voskRouter);
app.use('/api/whisper-training', whisperTrainingRouter);
app.use('/api/whisper-sinhala', whisperSinhalaRouter);  // New
app.use('/api/whisper-tamil', whisperTamilRouter);      // New

// Error handling middleware must be after route handlers
app.use((req, res, next) => {
    res.status(404).json({ error: 'Not Found' });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

function preloadModels() {
    return new Promise((resolve, reject) => {
        const modelLoader = spawn('python', [
            path.join(__dirname, 'services/model_loader.py')
        ]);

        modelLoader.stderr.on('data', (data) => {
            console.log('Model loading:', data.toString());
        });

        modelLoader.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Model loading failed with code ${code}`));
            }
        });
    });
}

async function startServer() {
    try {
        // Pre-load models before starting server
        await preloadModels();
        
        // Start your Express server
        const PORT = process.env.PORT || 3141;
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server is running on port ${PORT}`);
            // Log the actual addresses being used
            const addresses = server.address();
            console.log('Server listening on:', addresses);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
