-- TeamForge Basketball Manager Database Schema
-- SQLite database structure for the basketball management app

-- Users table (handles both players and coaches/managers)
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('player', 'coach', 'manager', 'admin')),
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    avatar VARCHAR(255) DEFAULT '👤',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_active BOOLEAN DEFAULT 1
);

-- Teams table
CREATE TABLE teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    logo VARCHAR(255) DEFAULT '🏀',
    color VARCHAR(20) DEFAULT '#3182ce',
    league VARCHAR(100),
    season VARCHAR(20),
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Team memberships (links users to teams)
CREATE TABLE team_memberships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('player', 'coach', 'manager', 'assistant_coach')),
    jersey_number INTEGER,
    position VARCHAR(10),
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (team_id) REFERENCES teams(id),
    UNIQUE(team_id, jersey_number)
);

-- Player profiles (extended info for players)
CREATE TABLE player_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    height_cm INTEGER,
    weight_kg INTEGER,
    wingspan_cm INTEGER,
    vertical_cm INTEGER,
    hometown VARCHAR(100),
    experience_years INTEGER DEFAULT 0,
    preferred_position VARCHAR(10),
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    medical_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Games table
CREATE TABLE games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    home_team_id INTEGER NOT NULL,
    away_team_id INTEGER NOT NULL,
    game_date DATETIME NOT NULL,
    venue VARCHAR(200),
    home_score INTEGER DEFAULT 0,
    away_score INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    quarter INTEGER DEFAULT 1,
    time_remaining VARCHAR(10),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (home_team_id) REFERENCES teams(id),
    FOREIGN KEY (away_team_id) REFERENCES teams(id)
);

-- Player statistics
CREATE TABLE player_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    game_id INTEGER,
    season VARCHAR(20),
    games_played INTEGER DEFAULT 0,
    minutes_played INTEGER DEFAULT 0,
    points INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    rebounds INTEGER DEFAULT 0,
    steals INTEGER DEFAULT 0,
    blocks INTEGER DEFAULT 0,
    turnovers INTEGER DEFAULT 0,
    field_goals_made INTEGER DEFAULT 0,
    field_goals_attempted INTEGER DEFAULT 0,
    three_pointers_made INTEGER DEFAULT 0,
    three_pointers_attempted INTEGER DEFAULT 0,
    free_throws_made INTEGER DEFAULT 0,
    free_throws_attempted INTEGER DEFAULT 0,
    fouls INTEGER DEFAULT 0,
    stat_date DATE DEFAULT CURRENT_DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (team_id) REFERENCES teams(id),
    FOREIGN KEY (game_id) REFERENCES games(id)
);

-- Notes and communication
CREATE TABLE notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author_id INTEGER NOT NULL,
    recipient_id INTEGER,
    team_id INTEGER,
    title VARCHAR(200),
    content TEXT NOT NULL,
    note_type VARCHAR(20) DEFAULT 'general' CHECK (note_type IN ('personal', 'coach', 'training', 'game', 'medical', 'general')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    is_private BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id),
    FOREIGN KEY (recipient_id) REFERENCES users(id),
    FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- Lineups
CREATE TABLE lineups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    game_id INTEGER,
    name VARCHAR(100) NOT NULL,
    lineup_type VARCHAR(20) DEFAULT 'starting' CHECK (lineup_type IN ('starting', 'bench', 'custom')),
    created_by INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id),
    FOREIGN KEY (game_id) REFERENCES games(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Lineup players (who's in each lineup)
CREATE TABLE lineup_players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lineup_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    position VARCHAR(10),
    order_index INTEGER,
    FOREIGN KEY (lineup_id) REFERENCES lineups(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Events/Calendar
CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_date DATETIME NOT NULL,
    end_date DATETIME,
    event_type VARCHAR(20) DEFAULT 'practice' CHECK (event_type IN ('game', 'practice', 'meeting', 'other')),
    location VARCHAR(200),
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_team_memberships_user_team ON team_memberships(user_id, team_id);
CREATE INDEX idx_player_stats_user_season ON player_stats(user_id, season);
CREATE INDEX idx_notes_recipient_type ON notes(recipient_id, note_type);
CREATE INDEX idx_events_team_date ON events(team_id, event_date);
CREATE INDEX idx_games_date ON games(game_date);

