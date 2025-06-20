-- Создание таблицы организаций
CREATE TABLE IF NOT EXISTS organizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    settings TEXT DEFAULT '{}',
    contactInfo TEXT,
    telegramBotToken TEXT,
    telegramSettings TEXT DEFAULT '{}',
    isActive BOOLEAN NOT NULL DEFAULT 1,
    maxUsers INTEGER,
    subscriptionType TEXT NOT NULL DEFAULT 'free' CHECK(subscriptionType IN ('free', 'basic', 'premium', 'enterprise')),
    subscriptionExpiresAt DATETIME,
    timezone TEXT NOT NULL DEFAULT 'Europe/Moscow',
    locale TEXT NOT NULL DEFAULT 'ru',
    ownerId INTEGER,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (ownerId) REFERENCES users(id) ON DELETE SET NULL
);

-- Создание индексов для организаций
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_active ON organizations(isActive);
CREATE INDEX IF NOT EXISTS idx_organizations_subscription ON organizations(subscriptionType);
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(ownerId);

-- Добавление organizationId в существующие таблицы

-- Добавляем organizationId в users
ALTER TABLE users ADD COLUMN organizationId INTEGER;
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organizationId);

-- Добавляем organizationId в teams
ALTER TABLE teams ADD COLUMN organizationId INTEGER;
CREATE INDEX IF NOT EXISTS idx_teams_organization ON teams(organizationId);

-- Добавляем organizationId в work_logs
ALTER TABLE work_logs ADD COLUMN organizationId INTEGER;
CREATE INDEX IF NOT EXISTS idx_work_logs_organization ON work_logs(organizationId);

-- Добавляем organizationId в absences
ALTER TABLE absences ADD COLUMN organizationId INTEGER;
CREATE INDEX IF NOT EXISTS idx_absences_organization ON absences(organizationId);

-- Добавляем organizationId в audit_logs
ALTER TABLE audit_logs ADD COLUMN organizationId INTEGER;
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization ON audit_logs(organizationId);

-- Добавляем organizationId в system_config
ALTER TABLE system_config ADD COLUMN organizationId INTEGER;
CREATE INDEX IF NOT EXISTS idx_system_config_organization ON system_config(organizationId);

-- Создание дефолтной организации и обновление существующих данных
INSERT OR IGNORE INTO organizations (id, name, slug, description, settings, isActive, subscriptionType, timezone, locale) VALUES 
(1, 'Outcast Company', 'outcast-company', 'Демонстрационная организация TimeBot', 
 '{"logo": "/logo.png", "primaryColor": "#3B82F6", "secondaryColor": "#1F2937", "companyName": "Outcast Company"}', 
 1, 'enterprise', 'Europe/Moscow', 'ru');

-- Привязываем существующие данные к дефолтной организации
UPDATE users SET organizationId = 1 WHERE organizationId IS NULL;
UPDATE teams SET organizationId = 1 WHERE organizationId IS NULL;
UPDATE work_logs SET organizationId = 1 WHERE organizationId IS NULL;
UPDATE absences SET organizationId = 1 WHERE organizationId IS NULL;
UPDATE audit_logs SET organizationId = 1 WHERE organizationId IS NULL;
UPDATE system_config SET organizationId = 1 WHERE organizationId IS NULL;

-- Создание дополнительных демо-организаций
INSERT OR IGNORE INTO organizations (name, slug, description, settings, isActive, subscriptionType, maxUsers, timezone, locale) VALUES 
('Tech Startup', 'tech-startup', 'Технологический стартап', 
 '{"logo": "/demo-logos/tech.png", "primaryColor": "#10B981", "secondaryColor": "#065F46", "companyName": "Tech Startup"}',
 1, 'premium', 50, 'Europe/Moscow', 'ru'),

('Marketing Agency', 'marketing-agency', 'Маркетинговое агентство', 
 '{"logo": "/demo-logos/marketing.png", "primaryColor": "#8B5CF6", "secondaryColor": "#4C1D95", "companyName": "Marketing Agency"}',
 1, 'basic', 25, 'Europe/London', 'en'),

('Consulting Group', 'consulting-group', 'Консалтинговая группа',
 '{"logo": "/demo-logos/consulting.png", "primaryColor": "#F59E0B", "secondaryColor": "#92400E", "companyName": "Consulting Group"}',
 1, 'enterprise', 100, 'America/New_York', 'en');

-- Создание таблицы для загрузки файлов организации
CREATE TABLE IF NOT EXISTS organization_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organizationId INTEGER NOT NULL,
    fileName TEXT NOT NULL,
    filePath TEXT NOT NULL,
    fileType TEXT NOT NULL,
    fileSize INTEGER NOT NULL,
    uploadedBy INTEGER,
    isPublic BOOLEAN NOT NULL DEFAULT 0,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (uploadedBy) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_organization_files_org ON organization_files(organizationId);
CREATE INDEX IF NOT EXISTS idx_organization_files_type ON organization_files(fileType);
CREATE INDEX IF NOT EXISTS idx_organization_files_public ON organization_files(isPublic);

-- Создание таблицы для настроек Telegram ботов
CREATE TABLE IF NOT EXISTS telegram_bots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organizationId INTEGER NOT NULL,
    botToken TEXT NOT NULL,
    botUsername TEXT,
    botName TEXT,
    isActive BOOLEAN NOT NULL DEFAULT 1,
    webhookUrl TEXT,
    settings TEXT DEFAULT '{}',
    lastError TEXT,
    lastErrorAt DATETIME,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_telegram_bots_org ON telegram_bots(organizationId);
CREATE INDEX IF NOT EXISTS idx_telegram_bots_active ON telegram_bots(isActive);
CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_bots_token ON telegram_bots(botToken);

-- Добавление дефолтного бота для первой организации
INSERT OR IGNORE INTO telegram_bots (organizationId, botToken, botUsername, botName, isActive, settings) VALUES 
(1, COALESCE((SELECT value FROM system_config WHERE key = 'telegram.bot_token' LIMIT 1), 'demo-token'), 
 'timebot_demo', 'TimeBot Demo', 1, '{"allowDeepLinks": true, "sendNotifications": true}'); 