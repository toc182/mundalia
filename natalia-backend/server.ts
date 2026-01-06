import dotenv from 'dotenv';
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`[FATAL] Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

import express, { Request, Response, NextFunction, Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import db, { pool } from './config/db';

// Import routes
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import teamsRoutes from './routes/teams';
import matchesRoutes from './routes/matches';
import predictionsRoutes from './routes/predictions';
import predictionSetsRoutes from './routes/predictionSets';
import groupsRoutes from './routes/groups';
import leaderboardRoutes from './routes/leaderboard';
import adminRoutes from './routes/admin';
import settingsRoutes from './routes/settings';
import statsRoutes from './routes/stats';

const app: Application = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// Security middleware - Helmet adds various HTTP headers for security
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow images from external sources
}));

// Auto-run database migrations on startup
const runMigrations = async (): Promise<void> => {
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
        match_number INTEGER NOT NULL,
        score_a INTEGER,
        score_b INTEGER,
        UNIQUE(prediction_set_id, group_letter, match_number)
      )
    `);
    // Migration 003-fix: Rename column if table exists with old schema
    await db.query(`
      ALTER TABLE score_predictions
      RENAME COLUMN match_index TO match_number
    `).catch(() => {});
    console.log('[MIGRATIONS] ✓ score_predictions table');

    // Migration 003b: Create tiebreaker_decisions table
    await db.query(`
      CREATE TABLE IF NOT EXISTS tiebreaker_decisions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        prediction_set_id INTEGER REFERENCES prediction_sets(id) ON DELETE CASCADE,
        group_letter VARCHAR(1) NOT NULL,
        tied_team_ids INTEGER[] NOT NULL,
        resolved_order INTEGER[] NOT NULL,
        UNIQUE(prediction_set_id, group_letter)
      )
    `);
    // Migration 003b-fix: Add new columns if table exists with old schema
    await db.query(`
      ALTER TABLE tiebreaker_decisions
      ADD COLUMN IF NOT EXISTS tied_team_ids INTEGER[]
    `).catch(() => {});
    await db.query(`
      ALTER TABLE tiebreaker_decisions
      ADD COLUMN IF NOT EXISTS resolved_order INTEGER[]
    `).catch(() => {});
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
    const error = err as Error;
    console.error('[MIGRATIONS] Error running migrations:', error.message);
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
  origin: function(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Permitir requests sin origin (health checks, server-to-server, Postman)
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // En produccion, rechazar origins no permitidos
    if (isProduction) {
      return callback(new Error('CORS not allowed'), false);
    }
    // En desarrollo, permitir cualquier origin
    return callback(null, true);
  },
  credentials: true
}));

// Body parser con limite de tamaño (prevenir DoS con payloads grandes)
app.use(express.json({ limit: '10kb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/matches', matchesRoutes);
app.use('/api/predictions', predictionsRoutes);
app.use('/api/prediction-sets', predictionSetsRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/stats', statsRoutes);

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler - no exponer detalles en produccion
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  // Log completo solo en desarrollo
  if (!isProduction) {
    console.error(err.stack);
  } else {
    // En produccion, log minimo sin stack trace
    console.error(`[ERROR] ${err.message}`);
  }
  res.status(500).json({ error: 'Something went wrong!' });
});

// Server instance for graceful shutdown
let server: http.Server | null = null;

// Graceful shutdown handler
const gracefulShutdown = async (signal: string): Promise<void> => {
  console.log(`\n[SHUTDOWN] ${signal} received, shutting down gracefully...`);

  // Stop accepting new connections
  if (server) {
    server.close(() => {
      console.log('[SHUTDOWN] HTTP server closed');
    });
  }

  // Close database pool
  try {
    await pool.end();
    console.log('[SHUTDOWN] Database pool closed');
  } catch (err) {
    console.error('[SHUTDOWN] Error closing database pool:', (err as Error).message);
  }

  console.log('[SHUTDOWN] Graceful shutdown complete');
  process.exit(0);
};

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Only start listening if not in test mode
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export app for testing
export default app;
