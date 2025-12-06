-- Natalia - World Cup 2026 Predictions
-- Database Schema

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user', -- 'user' or 'admin'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teams table (48 teams for World Cup 2026)
CREATE TABLE teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(3) NOT NULL, -- ISO country code
    flag_url VARCHAR(500),
    group_letter CHAR(1) NOT NULL -- A-L (12 groups of 4)
);

-- Matches table
CREATE TABLE matches (
    id SERIAL PRIMARY KEY,
    phase VARCHAR(50) NOT NULL, -- 'group', 'round_of_32', 'round_of_16', 'quarter', 'semi', 'third_place', 'final'
    group_letter CHAR(1), -- Only for group stage
    team_a_id INTEGER REFERENCES teams(id),
    team_b_id INTEGER REFERENCES teams(id),
    result_a INTEGER, -- Goals team A (NULL until played)
    result_b INTEGER, -- Goals team B (NULL until played)
    winner_id INTEGER REFERENCES teams(id), -- For knockout rounds
    match_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Group predictions (user predicts order of finish in each group)
CREATE TABLE group_predictions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    group_letter CHAR(1) NOT NULL,
    team_id INTEGER REFERENCES teams(id),
    predicted_position INTEGER NOT NULL, -- 1-4
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, group_letter, team_id),
    UNIQUE(user_id, group_letter, predicted_position)
);

-- Match predictions (knockout rounds)
CREATE TABLE match_predictions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
    predicted_winner_id INTEGER REFERENCES teams(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, match_id)
);

-- User scores (calculated)
CREATE TABLE user_scores (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    total_points INTEGER DEFAULT 0,
    correct_group_positions INTEGER DEFAULT 0,
    correct_qualifiers INTEGER DEFAULT 0,
    correct_knockout_winners INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Private groups (for friends/family competitions)
CREATE TABLE private_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL, -- Join code
    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Private group members
CREATE TABLE private_group_members (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES private_groups(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, user_id)
);

-- Settings (deadlines, etc.)
CREATE TABLE settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT NOT NULL
);

-- Actual group standings (filled by admin after group stage)
CREATE TABLE group_standings (
    id SERIAL PRIMARY KEY,
    group_letter CHAR(1) NOT NULL,
    team_id INTEGER REFERENCES teams(id),
    final_position INTEGER NOT NULL, -- 1-4
    UNIQUE(group_letter, team_id),
    UNIQUE(group_letter, final_position)
);

-- Insert initial settings
INSERT INTO settings (key, value) VALUES
('group_predictions_deadline', '2026-06-11T00:00:00Z'),
('points_exact_position', '3'),
('points_qualifier', '1'),
('points_round_of_32', '2'),
('points_round_of_16', '2'),
('points_quarter', '4'),
('points_semi', '6'),
('points_finalist', '8'),
('points_champion', '15');

-- Create indexes for performance
CREATE INDEX idx_group_predictions_user ON group_predictions(user_id);
CREATE INDEX idx_match_predictions_user ON match_predictions(user_id);
CREATE INDEX idx_matches_phase ON matches(phase);
CREATE INDEX idx_teams_group ON teams(group_letter);
CREATE INDEX idx_private_group_members_user ON private_group_members(user_id);
