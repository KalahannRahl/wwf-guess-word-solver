const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = 5000;

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

// Auth middleware for protected routes
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  const session = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);
  if (!session) return res.status(401).json({ error: 'Invalid or expired session' });

  req.userId = session.user_id;
  next();
}

app.use('/api/auth', require('./routes/auth'));
app.use('/api/entries', requireAuth, require('./routes/entries'));
app.use('/api/photos', requireAuth, require('./routes/photos'));

app.listen(PORT, () => {
  console.log(`Body tracker API running on http://localhost:${PORT}`);
});
