-- Добавление поля status в таблицу users
ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';

-- Создание индекса для поля status
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status); 