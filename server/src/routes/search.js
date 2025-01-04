const express = require('express');
const { db } = require('../database');

const router = express.Router();

router.get('/', (req, res) => {
  const { query } = req.query;
  
  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  const searchQuery = `
    SELECT * FROM search_content 
    WHERE title LIKE ? 
    OR artist LIKE ? 
    OR description LIKE ?
    LIMIT 20
  `;
  
  const searchTerm = `%${query}%`;
  
  db.all(searchQuery, [searchTerm, searchTerm, searchTerm], (err, rows) => {
    if (err) {
      console.error('Search error:', err);
      return res.status(500).json({ error: 'Search failed' });
    }
    res.json(rows);
  });
});

module.exports = router; 