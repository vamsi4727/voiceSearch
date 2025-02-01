const STORAGE_KEY = 'whisper_training_data';

export const TrainingDataStorage = {
    getAll: () => {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            const items = data ? JSON.parse(data) : [];
            
            // Create URLs for stored blobs
            return items.map(item => ({
                ...item,
                audioUrl: URL.createObjectURL(new Blob([item.blob], { type: 'audio/wav' }))
            }));
        } catch (error) {
            console.error('Error reading training data:', error);
            return [];
        }
    },

    add: (newData) => {
        try {
            const existingData = TrainingDataStorage.getAll();
            const timestamp = new Date().toISOString();
            
            // Store the data with timestamp
            const dataToStore = {
                ...newData,
                timestamp,
                audioUrl: undefined  // Don't store the URL
            };
            
            existingData.unshift(dataToStore);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(existingData));
            
            return true;
        } catch (error) {
            console.error('Error saving training data:', error);
            return false;
        }
    },

    clear: () => {
        localStorage.removeItem(STORAGE_KEY);
    }
}; 