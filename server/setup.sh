#!/bin/bash

# Install requirements
echo "Installing Python requirements..."
pip install -r requirements.txt

# Create necessary directories
mkdir -p uploads
mkdir -p training_data
mkdir -p models

# Check if VOSK model exists
if [ ! -d "models/vosk-model-small-en-us" ]; then
    echo "NOTE: Please download the VOSK model and place it in the models/vosk-model-small-en-us directory"
fi

echo "Setup complete!"
