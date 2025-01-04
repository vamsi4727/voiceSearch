const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '../data/search.db'));

function setupDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create search content table
      db.run(`
        CREATE TABLE IF NOT EXISTS search_content (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          artist TEXT,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) reject(err);

        // Insert sample data if table is empty
        db.get('SELECT COUNT(*) as count FROM search_content', (err, row) => {
          if (err) reject(err);
          
          if (row.count === 0) {
            const sampleData = [
              ['Bohemian Rhapsody', 'Queen', 'Epic rock opera with multiple sections'],
              ['Imagine', 'John Lennon', 'Classic peace anthem'],
              ['Billie Jean', 'Michael Jackson', 'Iconic pop song with memorable bassline'],
              // Add more sample entries here
            ];

            const stmt = db.prepare('INSERT INTO search_content (title, artist, description) VALUES (?, ?, ?)');
            sampleData.forEach(([title, artist, description]) => {
              stmt.run(title, artist, description);
            });
            stmt.finalize();
          }
          resolve();
        });
      });
    });
  });
}

module.exports = {
  db,
  setupDatabase
}; 