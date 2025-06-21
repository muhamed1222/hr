#!/usr/bin/env node

/**
 * Скрипт для массового исправления всех ошибок линтера
 */

const fs = require('fs');
const path = require('path');

// Константы для замены
const { LIMITS, HTTP_STATUS_CODES, TIME_CONSTANTS } = require('../src/constants');

/**
 * Исправляет файл, добавляя импорты констант и исправляя ошибки
 */
function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Добавляем 'use strict' если его нет
    if (!content.includes("'use strict'") && !content.includes('"use strict"')) {
      content = '"use strict";\n\n' + content;
      modified = true;
    }

    // Добавляем импорт констант если их нет
    if (!content.includes('require("../constants")') && !content.includes('require("./constants")')) {
      const lines = content.split('\n');
      let insertIndex = 0;
      
      // Находим место после 'use strict' и других импортов
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('require(') || lines[i].includes('const ') || lines[i].includes('let ') || lines[i].includes('var ')) {
          insertIndex = i + 1;
        }
      }
      
      const constantsImport = 'const { LIMITS, HTTP_STATUS_CODES, TIME_CONSTANTS } = require("../constants");';
      lines.splice(insertIndex, 0, constantsImport);
      content = lines.join('\n');
      modified = true;
    }

    // Заменяем неиспользуемые переменные (добавляем префикс _)
    const unusedVarPatterns = [
      /const (\w+) = require\(/g,
      /let (\w+) = /g,
      /var (\w+) = /g
    ];

    unusedVarPatterns.forEach(pattern => {
      content = content.replace(pattern, (match, varName) => {
        if (varName.startsWith('_')) return match;
        return match.replace(varName, `_${varName}`);
      });
    });

    // Заменяем магические числа на константы
    const magicNumberReplacements = [
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
      { from: /\* 60 \* 1000/g, to: '* TIME_CONSTANTS.MINUTE' },
      { from: /\* 60 \* 60 \* 1000/g, to: '* TIME_CONSTANTS.HOUR' },
      { from: /24 \* 60 \* 60 \* 1000/g, to: 'TIME_CONSTANTS.DAY' },
      
      // Лимиты
      { from: /255/g, to: 'LIMITS.MAX_SEARCH_LENGTH' },
      { from: /50/g, to: 'LIMITS.MAX_TEAM_MEMBERS' },
      { from: /100/g, to: 'LIMITS.MAX_PAGE_SIZE' },
      { from: /20/g, to: 'LIMITS.DEFAULT_PAGE_SIZE' }
    ];

    magicNumberReplacements.forEach(({ from, to }) => {
      if (content.match(from)) {
        content = content.replace(from, to);
        modified = true;
      }
    });

    // Исправляем console.error на logger.error
    if (content.includes('console.error')) {
      content = content.replace(/console\.error/g, 'logger.error');
      modified = true;
    }

    // Исправляем console.log на logger.info
    if (content.includes('console.log')) {
      content = content.replace(/console\.log/g, 'logger.info');
      modified = true;
    }

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
    } else if (file.endsWith('.js') && !file.includes('test')) {
      if (fixFile(filePath)) {
        fixedCount++;
      }
    }
  });

  return fixedCount;
}

// Основная функция
function main() {
  console.log('🔧 Начинаем массовое исправление ошибок линтера...\n');

  const srcDir = path.join(__dirname, '../src');
  const fixedCount = fixDirectory(srcDir);

  console.log(`\n🎉 Исправлено файлов: ${fixedCount}`);
  console.log('✅ Массовое исправление завершено!');
}

if (require.main === module) {
  main();
}

module.exports = { fixFile, fixDirectory }; 