# Python Environment Setup Guide (Whisper Project)

Environment Setup:
1. Check Python versions: `py -0`
2. Create environment: `py -3.11 -m venv ./my_env`
3. Activate: `.\my_env\Scripts\Activate.ps1` (PowerShell) or `.\my_env\Scripts\activate.bat` (CMD)
4. Verify version: `python --version` (should show Python 3.11)
5. Deactivate when done: `deactivate`

Important Notes:
- Whisper doesn't support Python 3.13
- Project uses Python 3.11 for Sinhala voice-to-text
- If permission errors occur, run PowerShell as Administrator
- Environment folder name can be changed if needed (e.g., my_env, env)

Quick Start:
After setup, always activate environment before running project:
`.\my_env\Scripts\Activate.ps1`
You'll see `(my_env)` in terminal when activated

## Model Caching

The Whisper Sinhala model is cached locally for faster loading and offline usage. The cached model is stored in:
server/src/services/model_cache/sinhala/First-time setup will download and cache the model. Subsequent runs will use the cached version, significantly reducing loading time.To force a fresh download and cache of the model, delete the cache directory and run:bash
npm run setup-models


```

To use this:

1. First, run the setup to cache the model:

```bash
npm run setup-models
```

2. Then, run the server:

```bash
npm run start
```

    
