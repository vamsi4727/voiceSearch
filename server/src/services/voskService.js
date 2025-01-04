const { spawn } = require('child_process');
const path = require('path');

const recognizeSpeech = (filePath) => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'voskService.py');
    const process = spawn('python', [scriptPath, filePath]);

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      console.log('Vosk debug output:', data.toString());
      stderr += data.toString();
    });

    process.on('close', (code) => {
      console.log('Python process exited with code:', code);
      
      try {
        // Try to parse the last line of stdout as JSON
        const lines = stdout.trim().split('\n');
        const lastLine = lines[lines.length - 1];
        const result = JSON.parse(lastLine);
        resolve(result);
      } catch (error) {
        console.error('Failed to parse Python output:', error);
        console.error('stdout:', stdout);
        console.error('stderr:', stderr);
        reject(new Error('Failed to process speech recognition'));
      }
    });

    process.on('error', (error) => {
      console.error('Failed to start Python process:', error);
      reject(error);
    });
  });
};

module.exports = { recognizeSpeech };