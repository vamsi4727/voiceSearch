const path = require('path');
require('dotenv').config({
  path: path.join(__dirname, `../.env.${process.env.NODE_ENV || 'development'}`)
});

const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3141,
  
  // Directory settings
  dirs: {
    upload: process.env.UPLOAD_DIR || 'uploads',
    training: process.env.TRAINING_DIR || 'training_data'
  },

  // Upload settings
  upload: {
    maxSize: process.env.MAX_UPLOAD_SIZE || '50mb'
  },

  // CORS settings
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3344', 'http://accessibility.dg-tele.com:3344'],
    methods: ['GET', 'POST'],
    credentials: true
  },

  // Speech recognition settings
  vosk: {
    modelPath: process.env.VOSK_MODEL_PATH
  },

  // Logging settings
  logging: {
    level: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
    filename: process.env.NODE_ENV === 'production' ? 'production.log' : 'development.log'
  }
};

module.exports = config;