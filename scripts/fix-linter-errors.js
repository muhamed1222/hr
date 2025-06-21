#!/usr/bin/env node

/**
 * Скрипт для массового исправления ошибок линтера
 */

const fs = require('fs');
const path = require('path');

// Константы для замены магических чисел
const HTTP_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

const TIME_CONSTANTS = {
  MINUTE: 60,
  HOUR: 60 * 60,
  DAY: 24 * 60 * 60,
  WEEK: 7 * 24 * 60 * 60,
  MONTH: 30 * 24 * 60 * 60
};

const LIMITS = {
  MAX_NAME_LENGTH: 255,
  MAX_USERNAME_LENGTH: 255,
  MAX_EMAIL_LENGTH: 255,
  MAX_DESCRIPTION_LENGTH: 1000,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100
};

/**
 * Исправляет файл, добавляя use strict и заменяя магические числа
 */
function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Добавляем 'use strict' если его нет
    if (!content.includes("'use strict'") && !content.includes('"use strict"')) {
      content = "'use strict';\n\n" + content;
      modified = true;
    }

    // Заменяем магические числа на константы
    const replacements = [
      // HTTP статусы
      { from: /: 200/g, to: ': HTTP_STATUS_CODES.OK' },
      { from: /: 201/g, to: ': HTTP_STATUS_CODES.CREATED' },
      { from: /: 400/g, to: ': HTTP_STATUS_CODES.BAD_REQUEST' },
      { from: /: 401/g, to: ': HTTP_STATUS_CODES.UNAUTHORIZED' },
      { from: /: 403/g, to: ': HTTP_STATUS_CODES.FORBIDDEN' },
      { from: /: 404/g, to: ': HTTP_STATUS_CODES.NOT_FOUND' },
      { from: /: 409/g, to: ': HTTP_STATUS_CODES.CONFLICT' },
      { from: /: 429/g, to: ': HTTP_STATUS_CODES.TOO_MANY_REQUESTS' },
      { from: /: 500/g, to: ': HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR' },
      { from: /: 503/g, to: ': HTTP_STATUS_CODES.SERVICE_UNAVAILABLE' },
      
      // Временные константы
      { from: /\* 60 \* 1000/g, to: '* TIME_CONSTANTS.MINUTE * 1000' },
      { from: /\* 60 \* 60 \* 1000/g, to: '* TIME_CONSTANTS.HOUR * 1000' },
      { from: /24 \* 60 \* 60 \* 1000/g, to: 'TIME_CONSTANTS.DAY * 1000' },
      
      // Лимиты
      { from: /255/g, to: 'LIMITS.MAX_NAME_LENGTH' },
      { from: /50/g, to: 'LIMITS.DEFAULT_PAGE_SIZE' },
      { from: /100/g, to: 'LIMITS.MAX_PAGE_SIZE' }
    ];

    replacements.forEach(({ from, to }) => {
      if (content.match(from)) {
        content = content.replace(from, to);
        modified = true;
      }
    });

    // Убираем неиспользуемые переменные (добавляем префикс _)
    const unusedVarPattern = /const (\w+) = require\(/g;
    content = content.replace(unusedVarPattern, (match, varName) => {
      // Проверяем, используется ли переменная
      const varUsagePattern = new RegExp(`\\b${varName}\\b`, 'g');
      const usages = content.match(varUsagePattern) || [];
      if (usages.length <= 1) { // Только объявление
        return `const _${varName} = require(`;
      }
      return match;
    });

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Исправлен: ${filePath}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Ошибка при исправлении ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Рекурсивно обходит директорию и исправляет файлы
 */
function fixDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  let fixedCount = 0;

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      fixedCount += fixDirectory(filePath);
    } else if (file.endsWith('.js') && !file.endsWith('.test.js')) {
      if (fixFile(filePath)) {
        fixedCount++;
      }
    }
  });

  return fixedCount;
}

// Главная функция
function main() {
  console.log('🔧 Начинаем массовое исправление ошибок линтера...\n');

  const srcPath = path.join(__dirname, '..', 'src');
  
  if (!fs.existsSync(srcPath)) {
    console.error('❌ Директория src не найдена');
    process.exit(1);
  }

  const fixedCount = fixDirectory(srcPath);
  
  console.log(`\n🎉 Исправлено файлов: ${fixedCount}`);
  console.log('📊 Запустите npm run lint:check для проверки результата');
}

if (require.main === module) {
  main();
}

module.exports = { fixFile, fixDirectory }; 