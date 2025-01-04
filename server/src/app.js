const express = require('express');
const cors = require('cors');
const whisperRoutes = require('./routes/whisper');
const speechRecognitionRoutes = require('./routes/speechRecognition');
const voskRoutes = require('./routes/vosk');
// Remove sphinxRoutes import

const app = express();

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/whisper', whisperRoutes);
app.use('/api/speechRecognition', speechRecognitionRoutes);
app.use('/api/vosk', voskRoutes);
// Remove app.use for sphinx routes

// ...rest of existing code...
