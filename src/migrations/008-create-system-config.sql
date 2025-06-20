-- Создание таблицы system_config для централизованных настроек
CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT,
    type TEXT NOT NULL DEFAULT 'string' CHECK(type IN ('string', 'number', 'boolean', 'json', 'time', 'date')),
    category TEXT NOT NULL DEFAULT 'general',
    title TEXT NOT NULL,
    description TEXT,
    isEditable BOOLEAN NOT NULL DEFAULT 1,
    isSystem BOOLEAN NOT NULL DEFAULT 0,
    validation TEXT,
    defaultValue TEXT,
    updatedBy INTEGER,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (updatedBy) REFERENCES users(id) ON DELETE SET NULL
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_system_config_category ON system_config(category);
CREATE INDEX IF NOT EXISTS idx_system_config_editable ON system_config(isEditable);
CREATE INDEX IF NOT EXISTS idx_system_config_system ON system_config(isSystem);

-- Заполнение базовых настроек

-- === РАБОЧЕЕ ВРЕМЯ ===
INSERT OR REPLACE INTO system_config (key, value, type, category, title, description, isEditable, isSystem, validation) VALUES
('work.start_time', '09:00', 'time', 'work_schedule', 'Начало рабочего дня', 'Время начала рабочего дня по умолчанию', 1, 0, '{"pattern": "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"}'),
('work.end_time', '18:00', 'time', 'work_schedule', 'Конец рабочего дня', 'Время окончания рабочего дня по умолчанию', 1, 0, '{"pattern": "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"}'),
('work.lunch_start', '13:00', 'time', 'work_schedule', 'Начало обеда', 'Время начала обеденного перерыва', 1, 0, '{"pattern": "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"}'),
('work.lunch_end', '14:00', 'time', 'work_schedule', 'Конец обеда', 'Время окончания обеденного перерыва', 1, 0, '{"pattern": "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"}'),
('work.late_threshold', '15', 'number', 'work_schedule', 'Лимит опозданий (минуты)', 'Количество минут опоздания, после которого считается нарушением', 1, 0, '{"min": 0, "max": 120}');

-- === УВЕДОМЛЕНИЯ ===
INSERT OR REPLACE INTO system_config (key, value, type, category, title, description, isEditable, isSystem) VALUES
('notifications.enabled', 'true', 'boolean', 'notifications', 'Включить уведомления', 'Глобальное включение/отключение системы уведомлений', 1, 0),
('notifications.reminder_enabled', 'true', 'boolean', 'notifications', 'Автонапоминания', 'Включить автоматические напоминания о заполнении логов', 1, 0),
('notifications.reminder_time', '17:30', 'time', 'notifications', 'Время напоминаний', 'Время отправки ежедневных напоминаний', 1, 0),
('notifications.late_warning_enabled', 'true', 'boolean', 'notifications', 'Уведомления об опозданиях', 'Отправлять уведомления при опозданиях', 1, 0),
('notifications.absence_approval_enabled', 'true', 'boolean', 'notifications', 'Уведомления о заявках', 'Уведомлять менеджеров о новых заявках на отсутствие', 1, 0);

-- === ШАБЛОНЫ СООБЩЕНИЙ ===
INSERT OR REPLACE INTO system_config (key, value, type, category, title, description, isEditable, isSystem) VALUES
('templates.reminder_message', 'Привет! 👋\n\nНе забудь заполнить рабочий лог на сегодня ({date}).\n\n⏰ Рабочий день: {start_time} - {end_time}\n📝 Заполни через /start', 'string', 'message_templates', 'Шаблон напоминания', 'Текст автоматического напоминания о заполнении лога', 1, 0),
('templates.late_warning', '⚠️ Опоздание зафиксировано\n\nПришёл: {actual_time}\nДолжен был: {expected_time}\nОпоздание: {late_minutes} мин.', 'string', 'message_templates', 'Уведомление об опоздании', 'Текст уведомления при опоздании', 1, 0),
('templates.absence_created', '📝 Новая заявка на отсутствие\n\nСотрудник: {employee_name}\nТип: {absence_type}\nПериод: {start_date} - {end_date}\nПричина: {reason}', 'string', 'message_templates', 'Новая заявка на отсутствие', 'Уведомление менеджерам о новой заявке', 1, 0),
('templates.absence_approved', '✅ Заявка одобрена\n\nТип: {absence_type}\nПериод: {start_date} - {end_date}\nОдобрил: {approver_name}', 'string', 'message_templates', 'Заявка одобрена', 'Уведомление сотруднику об одобрении заявки', 1, 0),
('templates.absence_rejected', '❌ Заявка отклонена\n\nТип: {absence_type}\nПериод: {start_date} - {end_date}\nПричина отказа: {rejection_reason}', 'string', 'message_templates', 'Заявка отклонена', 'Уведомление сотруднику об отклонении заявки', 1, 0);

-- === СИСТЕМНЫЕ НАСТРОЙКИ ===
INSERT OR REPLACE INTO system_config (key, value, type, category, title, description, isEditable, isSystem) VALUES
('system.timezone', 'Europe/Moscow', 'string', 'system', 'Часовой пояс', 'Часовой пояс системы по умолчанию', 1, 1),
('system.date_format', 'DD.MM.YYYY', 'string', 'system', 'Формат даты', 'Формат отображения дат в интерфейсе', 1, 0),
('system.time_format', 'HH:mm', 'string', 'system', 'Формат времени', 'Формат отображения времени в интерфейсе', 1, 0),
('system.week_start', '1', 'number', 'system', 'Начало недели', 'День начала недели (1=Понедельник, 0=Воскресенье)', 1, 0),
('system.max_upload_size', '10', 'number', 'system', 'Макс. размер файла (МБ)', 'Максимальный размер загружаемых файлов в мегабайтах', 1, 1);

-- === ПРАВА ДОСТУПА ===
INSERT OR REPLACE INTO system_config (key, value, type, category, title, description, isEditable, isSystem, validation) VALUES
('access.allow_self_edit', 'true', 'boolean', 'access_control', 'Самостоятельное редактирование', 'Разрешить сотрудникам редактировать собственные логи', 1, 0, NULL),
('access.edit_deadline_hours', '24', 'number', 'access_control', 'Срок редактирования (часы)', 'Количество часов после создания записи, в течение которых можно редактировать', 1, 0, '{"min": 1, "max": 168}'),
('access.manager_override', 'true', 'boolean', 'access_control', 'Переопределение менеджером', 'Разрешить менеджерам редактировать любые записи своей команды', 1, 0, NULL),
('access.admin_full_access', 'true', 'boolean', 'access_control', 'Полный доступ админов', 'Предоставить администраторам полный доступ ко всем данным', 1, 1, NULL);

-- === ИНТЕГРАЦИИ ===
INSERT OR REPLACE INTO system_config (key, value, type, category, title, description, isEditable, isSystem) VALUES
('telegram.bot_enabled', 'true', 'boolean', 'integrations', 'Telegram бот', 'Включить Telegram бота для уведомлений', 1, 1),
('telegram.deep_links_enabled', 'true', 'boolean', 'integrations', 'Deep Links', 'Включить глубокие ссылки в Telegram уведомлениях', 1, 0),
('email.enabled', 'false', 'boolean', 'integrations', 'Email уведомления', 'Включить отправку уведомлений по email', 1, 1),
('slack.enabled', 'false', 'boolean', 'integrations', 'Slack интеграция', 'Включить интеграцию со Slack', 1, 1);

-- === АНАЛИТИКА И ОТЧЁТЫ ===
INSERT OR REPLACE INTO system_config (key, value, type, category, title, description, isEditable, isSystem) VALUES
('analytics.retention_days', '365', 'number', 'analytics', 'Хранение данных (дни)', 'Количество дней хранения аналитических данных', 1, 1),
('reports.auto_generate', 'true', 'boolean', 'analytics', 'Автоотчёты', 'Автоматическая генерация еженедельных отчётов', 1, 0),
('reports.send_to_managers', 'true', 'boolean', 'analytics', 'Отправка менеджерам', 'Автоматически отправлять отчёты менеджерам команд', 1, 0),
('performance.cache_duration', '300', 'number', 'analytics', 'Кэширование (секунды)', 'Время кэширования аналитических данных в секундах', 1, 1); 