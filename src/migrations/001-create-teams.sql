-- Migration: Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  manager_id INTEGER,
  status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  settings JSON DEFAULT '{"reminders_enabled": true, "work_hours": {"start": "09:00", "end": "18:00", "lunch_duration": 60}, "timezone": "Europe/Moscow"}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (manager_id) REFERENCES users(id)
); 