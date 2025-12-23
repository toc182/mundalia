-- ============================================
-- MUNDALIA - Migraciones de Base de Datos
-- ============================================
-- Este archivo contiene todos los cambios de esquema de BD.
-- IMPORTANTE: Ejecutar nuevas migraciones en produccion (Railway)
-- despues de cada deploy que incluya cambios de BD.
-- ============================================

-- ============================================
-- MIGRACION 001: Esquema inicial
-- Fecha: 2025-12-01
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255),
  role VARCHAR(20) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(10) NOT NULL,
  group_letter VARCHAR(1),
  flag_url VARCHAR(255),
  is_playoff BOOLEAN DEFAULT FALSE,
  playoff_id VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS prediction_sets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS group_predictions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  prediction_set_id INTEGER REFERENCES prediction_sets(id) ON DELETE CASCADE,
  group_letter VARCHAR(1) NOT NULL,
  team_id INTEGER NOT NULL,
  predicted_position INTEGER NOT NULL,
  UNIQUE(user_id, prediction_set_id, group_letter, predicted_position)
);

CREATE TABLE IF NOT EXISTS playoff_predictions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  prediction_set_id INTEGER REFERENCES prediction_sets(id) ON DELETE CASCADE,
  playoff_id VARCHAR(20) NOT NULL,
  semifinal_winner_1 INTEGER,
  semifinal_winner_2 INTEGER,
  final_winner INTEGER
);

CREATE TABLE IF NOT EXISTS third_place_predictions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  prediction_set_id INTEGER REFERENCES prediction_sets(id) ON DELETE CASCADE,
  selected_groups VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS knockout_predictions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  prediction_set_id INTEGER REFERENCES prediction_sets(id) ON DELETE CASCADE,
  match_key VARCHAR(10) NOT NULL,
  winner_team_id INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  phase VARCHAR(20) NOT NULL,
  group_letter VARCHAR(1),
  team_a_id INTEGER REFERENCES teams(id),
  team_b_id INTEGER REFERENCES teams(id),
  match_date TIMESTAMP,
  result_a INTEGER,
  result_b INTEGER,
  winner_id INTEGER REFERENCES teams(id)
);

CREATE TABLE IF NOT EXISTS match_predictions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
  predicted_winner_id INTEGER REFERENCES teams(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, match_id)
);

CREATE TABLE IF NOT EXISTS private_groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(10) UNIQUE NOT NULL,
  owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS private_group_members (
  id SERIAL PRIMARY KEY,
  group_id INTEGER REFERENCES private_groups(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(group_id, user_id)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_prediction_sets_user ON prediction_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_group_predictions_set ON group_predictions(prediction_set_id);
CREATE INDEX IF NOT EXISTS idx_playoff_predictions_set ON playoff_predictions(prediction_set_id);
CREATE INDEX IF NOT EXISTS idx_knockout_predictions_set ON knockout_predictions(prediction_set_id);

-- ============================================
-- MIGRACION 002: Modo de prediccion (positions/scores)
-- Fecha: 2025-12-15
-- ============================================

ALTER TABLE prediction_sets
ADD COLUMN IF NOT EXISTS mode VARCHAR(20) DEFAULT 'positions';

-- ============================================
-- MIGRACION 003: Tablas para modo Marcadores Exactos
-- Fecha: 2025-12-15
-- ============================================

CREATE TABLE IF NOT EXISTS score_predictions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  prediction_set_id INTEGER REFERENCES prediction_sets(id) ON DELETE CASCADE,
  group_letter VARCHAR(1) NOT NULL,
  match_number INTEGER NOT NULL,
  score_a INTEGER,
  score_b INTEGER,
  UNIQUE(prediction_set_id, group_letter, match_number)
);

CREATE TABLE IF NOT EXISTS tiebreaker_decisions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  prediction_set_id INTEGER REFERENCES prediction_sets(id) ON DELETE CASCADE,
  group_letter VARCHAR(1) NOT NULL,
  tied_team_ids INTEGER[] NOT NULL,
  resolved_order INTEGER[] NOT NULL,
  UNIQUE(prediction_set_id, group_letter)
);

-- ============================================
-- MIGRACION 004: Scores en knockout (para modo Marcadores)
-- Fecha: 2025-12-16
-- ============================================

ALTER TABLE knockout_predictions
ADD COLUMN IF NOT EXISTS score_a INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS score_b INTEGER DEFAULT NULL;

-- ============================================
-- MIGRACION 005: Tablas de resultados reales (admin)
-- Fecha: 2025-12-18
-- ============================================

CREATE TABLE IF NOT EXISTS real_playoff_results (
  id SERIAL PRIMARY KEY,
  playoff_id VARCHAR(20) NOT NULL UNIQUE,
  winner_team_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS real_group_standings (
  id SERIAL PRIMARY KEY,
  group_letter VARCHAR(1) NOT NULL,
  team_id INTEGER NOT NULL,
  final_position INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(group_letter, team_id),
  UNIQUE(group_letter, final_position)
);

CREATE TABLE IF NOT EXISTS real_knockout_results (
  id SERIAL PRIMARY KEY,
  match_key VARCHAR(20) NOT NULL UNIQUE,
  winner_team_id INTEGER NOT NULL,
  score_a INTEGER,
  score_b INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
);

-- ============================================
-- MIGRACION 006: Indices optimizados para performance
-- Fecha: 2025-12-18
-- ============================================

-- Indices compuestos para queries de leaderboard (evitar N+1)
CREATE INDEX IF NOT EXISTS idx_group_predictions_set_group
  ON group_predictions(prediction_set_id, group_letter);

CREATE INDEX IF NOT EXISTS idx_knockout_predictions_set_match
  ON knockout_predictions(prediction_set_id, match_key);

-- Indices para tablas de resultados reales (admin scoring)
CREATE INDEX IF NOT EXISTS idx_real_group_standings_group
  ON real_group_standings(group_letter);

CREATE INDEX IF NOT EXISTS idx_real_knockout_results_match
  ON real_knockout_results(match_key);

-- Indice para busqueda de prediction_sets por usuario
CREATE INDEX IF NOT EXISTS idx_prediction_sets_user_created
  ON prediction_sets(user_id, created_at DESC);

-- ============================================
-- NUEVA MIGRACION: Agregar aqui abajo
-- Fecha: YYYY-MM-DD
-- ============================================

