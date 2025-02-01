const { spawn } = require('child_process');
const path = require('path');

async function recognizeSpeech(audioPath) {
    return new Promise((resolve, reject) => {
        const pythonScript = path.join(__dirname, 'whisperSinhalaService.py');
        
        const pythonProcess = spawn('python', [pythonScript, audioPath], {
            env: {
                ...process.env,
                PYTHONIOENCODING: 'utf-8'
            }
        });
        
        let outputData = '';
        let errorData = '';

        pythonProcess.stdout.on('data', (data) => {
            outputData += data.toString('utf-8');
        });

        pythonProcess.stderr.on('data', (data) => {
            const errorMsg = data.toString('utf-8');
            console.log('Python stderr:', errorMsg);
            errorData += errorMsg;
        });

        pythonProcess.on('close', (code) => {
            console.log('Sinhala model process exited with code:', code);
            
            if (code !== 0) {
                console.error('Process exited with non-zero code:', code);
                console.error('Error output:', errorData);
                return reject(new Error(`Process exited with code ${code}: ${errorData}`));
            }
            
            try {
                const result = JSON.parse(outputData);
                if (result.error) {
                    return reject(new Error(result.error));
                }
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

        // Set a timeout of 30 seconds
        const timeout = setTimeout(() => {
            pythonProcess.kill();
            reject(new Error('Speech recognition timed out'));
        }, 30000);
        
        // Clear timeout when process ends
        pythonProcess.on('close', () => clearTimeout(timeout));
    });
}

module.exports = {
    recognizeSpeech
};
