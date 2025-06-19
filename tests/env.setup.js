// Настройка переменных окружения для тестов
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-only';
process.env.JWT_EXPIRES_IN = '1h';
process.env.DB_TYPE = 'sqlite';
process.env.DB_STORAGE = ':memory:'; // используем in-memory базу для тестов
process.env.ADMIN_USERNAME = 'testadmin';
process.env.ADMIN_PASSWORD = 'TestPass123!';
process.env.TZ = 'UTC';
process.env.DEMO_MODE = 'false';
process.env.REMINDERS_ENABLED = 'false'; 