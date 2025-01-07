const { spawn } = require('child_process');
const path = require('path');

// Language mapping for Google Speech Recognition
const LANGUAGE_MAPPING = {
    'en': 'en-US',
    'si': 'si-LK',
    'ta': 'ta-IN'
};

async function recognizeSpeech(audioPath, language = 'en') {
    return new Promise((resolve, reject) => {
        const pythonScript = path.join(__dirname, '../python/recognize_speech.py');
        // Map the language code to the appropriate format
        const googleLanguage = LANGUAGE_MAPPING[language] || 'en-US';
        
        const pythonProcess = spawn('python', [pythonScript, audioPath, googleLanguage]);
        
        let outputData = '';
        let errorData = '';

        pythonProcess.stdout.on('data', (data) => {
            outputData += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            console.log('Python stderr:', data.toString());
            errorData += data.toString();
        });

        pythonProcess.on('close', (code) => {
            console.log('Python process exited with code:', code);
            
            try {
                const result = JSON.parse(outputData);
                resolve(result);
            } catch (error) {
                console.error('Failed to parse Python output:', outputData);
                console.error('Python errors:', errorData);
                reject(new Error('Failed to process speech recognition'));
            }
        });

        pythonProcess.on('error', (error) => {
            console.error('Failed to start Python process:', error);
            reject(error);
        });
    });
}

module.exports = {
    recognizeSpeech
};