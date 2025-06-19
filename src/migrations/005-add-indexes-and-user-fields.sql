-- Создание индексов для таблицы absences
CREATE INDEX IF NOT EXISTS idx_absences_user_id ON absences(user_id);
CREATE INDEX IF NOT EXISTS idx_absences_status ON absences(status);
CREATE INDEX IF NOT EXISTS idx_absences_type ON absences(type);
CREATE INDEX IF NOT EXISTS idx_absences_dates ON absences(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_absences_approved_by ON absences(approved_by);

-- Добавление новых полей в таблицу users (проверяем существование столбцов)
-- Добавляем vacation_days если его нет
ALTER TABLE users ADD COLUMN vacation_days INTEGER DEFAULT 28;

-- Добавляем temporary_password если его нет  
ALTER TABLE users ADD COLUMN temporary_password TEXT;

-- Добавляем telegram_temp_id если его нет
ALTER TABLE users ADD COLUMN telegram_temp_id TEXT; 