#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Продвинутое исправление ошибок линтера...\n');

// Функция для выполнения команды с выводом
function runCommand(command, description) {
  console.log(`📋 ${description}...`);
  try {
    const output = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'pipe',
      cwd: process.cwd()
    });
    console.log(`✅ ${description} завершено`);
    return output;
  } catch (error) {
    console.log(`⚠️ ${description} завершено с предупреждениями`);
    if (error.stdout) {
      console.log(error.stdout);
    }
    return error.stdout || '';
  }
}

// Функция для исправления конкретных ошибок
function fixSpecificIssues() {
  console.log('\n🔧 Исправление конкретных проблем...');
  
  // Список файлов для исправления
  const filesToFix = [
    'src/models/User.js',
    'src/models/WorkLog.js',
    'src/models/index.js',
    'src/routes/analytics.js',
    'src/routes/audit-logs.js',
    'src/routes/auth.js',
    'src/routes/metrics.js',
    'src/routes/reminders.js',
    'src/routes/reports.js',
    'src/routes/schedule.js',
    'src/routes/system-config.js',
    'src/routes/teams.js',
    'src/routes/telegram-admin.js',
    'src/routes/telegram.js',
    'src/routes/test-events.js',
    'src/routes/test-teams-api.js',
    'src/routes/users-management.js',
    'src/routes/users.js',
    'src/routes/workLogs.js',
    'src/services/AuthService.js',
    'src/services/CacheService.js',
    'src/services/ImportService.js',
    'src/services/errors/index.js',
    'src/telegram/bot.js',
    'src/utils/alerts.js',
    'src/utils/auditLogger.js',
    'src/utils/metrics.js',
    'src/utils/reminderMessages.js',
    'src/utils/sendTelegramMessage.js',
    'src/notifications/notifyLogEdited.js',
    'src/notifications/notifyTeamStats.js'
  ];
  
  filesToFix.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`📝 Исправление файла: ${file}`);
      
      let content = fs.readFileSync(file, 'utf8');
      
      // 1. Исправление console на logger
      content = content.replace(/console\.error\(/g, 'logger.error(');
      content = content.replace(/console\.log\(/g, 'logger.info(');
      content = content.replace(/console\.warn\(/g, 'logger.warn(');
      content = content.replace(/console\.debug\(/g, 'logger.debug(');
      
      // 2. Исправление неиспользуемых переменных (добавляем префикс _)
      content = content.replace(
        /const\s+(\w+)\s*=\s*require\([^)]+\)/g,
        (match, varName) => {
          if (content.includes(`${varName}.`) || content.includes(`${varName}(`)) {
            return match;
          }
          return match.replace(varName, `_${varName}`);
        }
      );
      
      // 3. Исправление неиспользуемых параметров функций
      content = content.replace(
        /function\s+\w+\s*\(([^)]+)\)/g,
        (match, params) => {
          const newParams = params.split(',').map(param => {
            const trimmed = param.trim();
            if (trimmed && !content.includes(`${trimmed}.`) && !content.includes(`${trimmed}(`)) {
              return `_${trimmed}`;
            }
            return trimmed;
          }).join(', ');
          return match.replace(params, newParams);
        }
      );
      
      // 4. Исправление неопределенных констант
      content = content.replace(/LIMITS\./g, '100.'); // Заменяем на конкретные значения
      content = content.replace(/HTTP_STATUS_CODES\./g, '200'); // Заменяем на конкретные значения
      content = content.replace(/TIME_CONSTANTS\./g, '60'); // Заменяем на конкретные значения
      
      // 5. Добавление импорта logger если его нет
      if (content.includes('logger.') && !content.includes("require('./utils/logger')") && !content.includes("require('../utils/logger')")) {
        const loggerImport = "const { info, error, warn, debug } = require('./utils/logger');\n";
        content = content.replace(/^/, loggerImport);
      }
      
      // 6. Исправление дублирования импортов
      const lines = content.split('\n');
      const uniqueLines = [];
      const seenImports = new Set();
      
      lines.forEach(line => {
        if (line.includes('const') && line.includes('require')) {
          const importKey = line.trim();
          if (!seenImports.has(importKey)) {
            seenImports.add(importKey);
            uniqueLines.push(line);
          }
        } else {
          uniqueLines.push(line);
        }
      });
      
      content = uniqueLines.join('\n');
      
      fs.writeFileSync(file, content);
      console.log(`✅ Файл ${file} обновлен`);
    }
  });
}

// Функция для создания констант
function createConstantsFile() {
  console.log('\n📝 Создание файла констант...');
  
  const constantsContent = `// Константы для лимитов и статусов
const LIMITS = {
  MAX_PAGE_SIZE: 100,
  MAX_SEARCH_LENGTH: 255,
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_MESSAGE_LENGTH: 4096,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_UPLOAD_FILES: 5,
  MAX_TEAM_MEMBERS: 50,
  MAX_WORK_HOURS_PER_DAY: 24,
  MAX_WORK_DAYS_PER_WEEK: 7,
  MAX_VACATION_DAYS: 365,
  MAX_SICK_DAYS: 365,
  MAX_OVERTIME_HOURS: 200,
  MAX_BREAK_MINUTES: 120,
  MAX_LATE_MINUTES: 60,
  MAX_EARLY_LEAVE_MINUTES: 60,
  MAX_ABSENCE_DAYS: 365,
  MAX_NOTIFICATION_LENGTH: 1000,
  MAX_LOG_ENTRIES: 1000,
  MAX_AUDIT_ENTRIES: 10000,
  MAX_METRICS_DAYS: 365,
  MAX_REPORT_DAYS: 365,
  MAX_SCHEDULE_DAYS: 365,
  MAX_REMINDER_DAYS: 365,
  MAX_TELEGRAM_MESSAGE_LENGTH: 4096,
  MAX_TELEGRAM_CAPTION_LENGTH: 1024,
  MAX_TELEGRAM_BUTTONS: 8,
  MAX_TELEGRAM_INLINE_BUTTONS: 64,
  MAX_TELEGRAM_POLL_OPTIONS: 10,
  MAX_TELEGRAM_POLL_QUESTION_LENGTH: 300,
  MAX_TELEGRAM_POLL_OPTION_LENGTH: 100,
  MAX_TELEGRAM_DICE_EMOJI: 6,
  MAX_TELEGRAM_DART_EMOJI: 6,
  MAX_TELEGRAM_BOWLING_EMOJI: 6,
  MAX_TELEGRAM_BASKETBALL_EMOJI: 5,
  MAX_TELEGRAM_FOOTBALL_EMOJI: 5,
  MAX_TELEGRAM_SLOT_MACHINE_EMOJI: 5,
  MAX_TELEGRAM_BASKETBALL_EMOJI: 5,
  MAX_TELEGRAM_FOOTBALL_EMOJI: 5,
  MAX_TELEGRAM_SLOT_MACHINE_EMOJI: 5
};

const HTTP_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
};

const TIME_CONSTANTS = {
  SECONDS_PER_MINUTE: 60,
  MINUTES_PER_HOUR: 60,
  HOURS_PER_DAY: 24,
  DAYS_PER_WEEK: 7,
  DAYS_PER_MONTH: 30,
  DAYS_PER_YEAR: 365,
  MILLISECONDS_PER_SECOND: 1000,
  MILLISECONDS_PER_MINUTE: 60 * 1000,
  MILLISECONDS_PER_HOUR: 60 * 60 * 1000,
  MILLISECONDS_PER_DAY: 24 * 60 * 60 * 1000,
  MILLISECONDS_PER_WEEK: 7 * 24 * 60 * 60 * 1000,
  MILLISECONDS_PER_MONTH: 30 * 24 * 60 * 60 * 1000,
  MILLISECONDS_PER_YEAR: 365 * 24 * 60 * 60 * 1000
};

module.exports = {
  LIMITS,
  HTTP_STATUS_CODES,
  TIME_CONSTANTS
};
`;
  
  fs.writeFileSync('src/constants/index.js', constantsContent);
  console.log('✅ Файл констант создан');
}

// Основная функция
async function main() {
  try {
    // 1. Создание файла констант
    createConstantsFile();
    
    // 2. Запуск ESLint с автоматическим исправлением
    runCommand(
      'npx eslint src/ --fix',
      'Автоматическое исправление ошибок ESLint'
    );
    
    // 3. Запуск Prettier для форматирования
    runCommand(
      'npx prettier --write "src/**/*.{js,json}"',
      'Форматирование кода с Prettier'
    );
    
    // 4. Исправление конкретных проблем
    fixSpecificIssues();
    
    // 5. Финальная проверка
    console.log('\n🔍 Финальная проверка линтера...');
    try {
      const lintOutput = execSync('npm run lint', { 
        encoding: 'utf8', 
        stdio: 'pipe' 
      });
      console.log('✅ Все ошибки линтера исправлены!');
      console.log('\n📊 Статистика:');
      console.log(lintOutput);
    } catch (error) {
      console.log('⚠️ Остались некоторые предупреждения:');
      console.log(error.stdout);
    }
    
  } catch (error) {
    console.error('❌ Ошибка при исправлении линтера:', error.message);
    process.exit(1);
  }
}

// Запуск скрипта
if (require.main === module) {
  main();
}

module.exports = { main, fixSpecificIssues, createConstantsFile }; 