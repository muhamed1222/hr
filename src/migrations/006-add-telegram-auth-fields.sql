-- Добавляем поля для Telegram аутентификации
ALTER TABLE users ADD COLUMN telegram_username VARCHAR(255);
ALTER TABLE users ADD COLUMN telegram_first_name VARCHAR(255);
ALTER TABLE users ADD COLUMN telegram_last_name VARCHAR(255);
ALTER TABLE users ADD COLUMN created_via_telegram BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN last_login DATETIME;

-- Создаем индекс для быстрого поиска по telegram_id (если еще не создан)
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);

-- Создаем индекс для поиска по telegram_username
CREATE INDEX IF NOT EXISTS idx_users_telegram_username ON users(telegram_username);

-- Обновляем ограничение на telegram_id - делаем его необязательным для обычных пользователей
-- (это позволит создавать пользователей как через Telegram, так и обычным способом) 