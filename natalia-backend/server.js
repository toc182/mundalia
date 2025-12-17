require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Auto-run database migrations on startup
const runMigrations = async () => {
  console.log('[MIGRATIONS] Running database migrations...');
  try {
    // Migration 002: Add mode column to prediction_sets
    await db.query(`
      ALTER TABLE prediction_sets
      ADD COLUMN IF NOT EXISTS mode VARCHAR(20) DEFAULT 'positions'
    `);
    console.log('[MIGRATIONS] ✓ prediction_sets.mode');

    // Migration 003: Create score_predictions table
    await db.query(`
      CREATE TABLE IF NOT EXISTS score_predictions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        prediction_set_id INTEGER REFERENCES prediction_sets(id) ON DELETE CASCADE,
        group_letter VARCHAR(1) NOT NULL,
        match_index INTEGER NOT NULL,
        score_a INTEGER,
        score_b INTEGER,
        UNIQUE(prediction_set_id, group_letter, match_index)
      )
    `);
    console.log('[MIGRATIONS] ✓ score_predictions table');

    // Migration 003b: Create tiebreaker_decisions table
    await db.query(`
      CREATE TABLE IF NOT EXISTS tiebreaker_decisions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        prediction_set_id INTEGER REFERENCES prediction_sets(id) ON DELETE CASCADE,
        group_letter VARCHAR(1) NOT NULL,
        team_order TEXT NOT NULL,
        UNIQUE(prediction_set_id, group_letter)
      )
    `);
    console.log('[MIGRATIONS] ✓ tiebreaker_decisions table');

    // Migration 004: Add score columns to knockout_predictions
    await db.query(`
      ALTER TABLE knockout_predictions
      ADD COLUMN IF NOT EXISTS score_a INTEGER DEFAULT NULL
    `);
    await db.query(`
      ALTER TABLE knockout_predictions
      ADD COLUMN IF NOT EXISTS score_b INTEGER DEFAULT NULL
    `);
    console.log('[MIGRATIONS] ✓ knockout_predictions.score_a, score_b');

    // Migration 005: Add google_id column to users for Google OAuth
    await db.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) DEFAULT NULL
    `);
    await db.query(`
      ALTER TABLE users
      ALTER COLUMN password DROP NOT NULL
    `).catch(() => {
      // Ignore error if column is already nullable
    });
    console.log('[MIGRATIONS] ✓ users.google_id');

    // Migration 006: Add country and birth_date to users
    await db.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT NULL
    `);
    await db.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS birth_date DATE DEFAULT NULL
    `);
    console.log('[MIGRATIONS] ✓ users.country, birth_date');

    // Migration 007: Add unique username to users
    await db.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS username VARCHAR(30) DEFAULT NULL
    `);
    // Create unique index (allows multiple NULLs but no duplicate values)
    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique
      ON users(username) WHERE username IS NOT NULL
    `);
    console.log('[MIGRATIONS] ✓ users.username');

    // Migration 008: Create real_playoff_results table
    await db.query(`
      CREATE TABLE IF NOT EXISTS real_playoff_results (
        id SERIAL PRIMARY KEY,
        playoff_id VARCHAR(20) NOT NULL UNIQUE,
        winner_team_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[MIGRATIONS] ✓ real_playoff_results table');

    // Migration 009: Create real_group_standings table
    await db.query(`
      CREATE TABLE IF NOT EXISTS real_group_standings (
        id SERIAL PRIMARY KEY,
        group_letter VARCHAR(1) NOT NULL,
        team_id INTEGER NOT NULL,
        final_position INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(group_letter, team_id),
        UNIQUE(group_letter, final_position)
      )
    `);
    console.log('[MIGRATIONS] ✓ real_group_standings table');

    // Migration 010: Create real_knockout_results table
    await db.query(`
      CREATE TABLE IF NOT EXISTS real_knockout_results (
        id SERIAL PRIMARY KEY,
        match_key VARCHAR(20) NOT NULL UNIQUE,
        winner_team_id INTEGER NOT NULL,
        score_a INTEGER,
        score_b INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[MIGRATIONS] ✓ real_knockout_results table');

    // Migration 011: Create real_group_matches table (actual match scores)
    await db.query(`
      CREATE TABLE IF NOT EXISTS real_group_matches (
        id SERIAL PRIMARY KEY,
        group_letter VARCHAR(1) NOT NULL,
        match_index INTEGER NOT NULL,
        team_a_id INTEGER NOT NULL,
        team_b_id INTEGER NOT NULL,
        score_a INTEGER,
        score_b INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(group_letter, match_index)
      )
    `);
    console.log('[MIGRATIONS] ✓ real_group_matches table');

    console.log('[MIGRATIONS] All migrations completed successfully!');
  } catch (err) {
    console.error('[MIGRATIONS] Error running migrations:', err.message);
    // Don't crash the server, just log the error
  }
};

// Run migrations before starting server
runMigrations();

// Middleware - CORS para desarrollo y produccion
const allowedOrigins = [
  'http://localhost:5174',
  'https://mundalia.vercel.app'
];
app.use(cors({
  origin: function(origin, callback) {
    // Permitir requests sin origin (como curl o Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS not allowed'), false);
  },
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/teams', require('./routes/teams'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/predictions', require('./routes/predictions'));
app.use('/api/prediction-sets', require('./routes/predictionSets'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/admin', require('./routes/admin'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
