-- Migration: Create user_teams table
CREATE TABLE IF NOT EXISTS user_teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  team_id INTEGER NOT NULL,
  role TEXT CHECK (role IN ('member', 'lead', 'manager')) DEFAULT 'member',
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  left_at DATETIME,
  status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (team_id) REFERENCES teams(id),
  UNIQUE(user_id, team_id)
); 