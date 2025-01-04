const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

class WhisperTrainingService {
    constructor() {
        this.pythonScript = path.join(__dirname, 'whisperTrainingService.py');
        this.trainingDir = path.join(__dirname, '../../../training_data');
        
        // Add path to Python executable in virtual environment
        // Adjust this path according to your venv location
        this.pythonPath = process.platform === 'win32'
            ? path.join(__dirname, '../../../venv/Scripts/python.exe')  // Windows
            : path.join(__dirname, '../../../venv/bin/python');        // Unix/Linux
    }

    async init() {
        try {
            await fs.mkdir(path.join(this.trainingDir, 'uploads'), { recursive: true });
            await fs.mkdir(path.join(this.trainingDir, 'metadata'), { recursive: true });
            
            // Verify Python script exists
            try {
                await fs.access(this.pythonScript);
                console.log('Found Python script at:', this.pythonScript);
                
                // Verify Python executable exists
                await fs.access(this.pythonPath);
                console.log('Found Python executable at:', this.pythonPath);
            } catch (error) {
                console.error('Path verification failed:', error);
                throw error;
            }
        } catch (error) {
            console.error('Error initializing training service:', error);
            throw error;
        }
    }

    async addTrainingExample(audioPath, actualText, whisperText, googleText, language = 'en') {
        try {
            await this.init();

            const metadata = {
                timestamp: new Date().toISOString(),
                audioPath: `/training_data/uploads/${path.basename(audioPath)}`,
                actualText,
                whisperText,
                googleText,
                language
            };

            const metadataDir = path.join(this.trainingDir, 'metadata');
            const metadataFile = path.join(metadataDir, `${path.basename(audioPath, '.wav')}.json`);
            await fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2));

            console.log('Saved metadata:', {
                metadataFile,
                metadata
            });

            return new Promise((resolve, reject) => {
                console.log('Spawning Python process with:', {
                    pythonPath: this.pythonPath,
                    script: this.pythonScript,
                    args: ['add_example', audioPath, actualText, whisperText || '', googleText || '', language]
                });

                // Use the virtual environment's Python
                const process = spawn(this.pythonPath, [
                    this.pythonScript,
                    'add_example',
                    audioPath,
                    actualText,
                    whisperText || '',
                    googleText || '',
                    language
                ]);

                let outputData = '';
                let errorData = '';

                process.stdout.on('data', (data) => {
                    console.log('Python output:', data.toString());
                    outputData += data.toString();
                });

                process.stderr.on('data', (data) => {
                    console.error('Python error:', data.toString());
                    errorData += data.toString();
                });

                process.on('close', (code) => {
                    console.log('Python process exited with code:', code);
                    if (code !== 0) {
                        console.error('Python process error:', errorData);
                    }
                    // Always resolve with metadata
                    resolve(metadata);
                });

                process.on('error', (error) => {
                    console.error('Failed to start Python process:', error);
                    resolve(metadata);
                });
            });
        } catch (error) {
            console.error('Error in addTrainingExample:', error);
            throw error;
        }
    }

    async listTrainingExamples() {
        try {
            await this.init();
            const metadataDir = path.join(this.trainingDir, 'metadata');
            const files = await fs.readdir(metadataDir);
            
            const examples = await Promise.all(
                files
                    .filter(file => file.endsWith('.json'))
                    .map(async file => {
                        const content = await fs.readFile(
                            path.join(metadataDir, file),
                            'utf8'
                        );
                        return JSON.parse(content);
                    })
            );
            
            return examples;
        } catch (error) {
            console.error('Error listing training examples:', error);
            return [];
        }
    }
}

// Create and initialize the service
const service = new WhisperTrainingService();

// Export the initialized service
module.exports = service;