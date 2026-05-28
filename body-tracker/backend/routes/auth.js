const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?')
    .get(username.toLowerCase(), password);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = uuidv4();
  db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, user.id);

  res.json({ token, username: user.username, userId: user.id });
});

router.post('/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }
  res.json({ ok: true });
});

module.exports = router;
