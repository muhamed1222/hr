#!/usr/bin/env node

/**
 * Скрипт для исправления основных синтаксических ошибок
 */

const fs = require('fs');
const path = require('path');

/**
 * Исправляет основные синтаксические ошибки в файле
 */
function fixSyntaxErrors(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const modified = false;

    // Удаляем неправильные импорты констант в середине файла
    content = content.replace(/const \{ LIMITS, HTTP_STATUS_CODES, TIME_CONSTANTS \} = require\("\.\.\/constants"\);/g, '');
    
    // Исправляем циклические ссылки в константах
    content = content.replace(/const LIMITS = \{\s*DEFAULT_PAGE_SIZE: LIMITS\.DEFAULT_PAGE_SIZE,/g, '');
    content = content.replace(/const HTTP_STATUS_CODES = \{\s*BAD_REQUEST: HTTP_STATUS_CODES\.BAD_REQUEST,/g, '');
    
    // Удаляем неправильные объявления переменных
    content = content.replace(/const _(\w+) = require\(/g, 'const $1 = require(');
    
    // Исправляем неправильные объявления sequelize
    content = content.replace(/const _sequelize = require\(/g, 'const sequelize = require(');
    
    // Удаляем лишние const в середине функций
    content = content.replace(/\nconst \{ LIMITS, HTTP_STATUS_CODES, TIME_CONSTANTS \} = require\("\.\.\/constants"\);\s*\n/g, '\n');

    if (modified || content !== fs.readFileSync(filePath, 'utf8')) {
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
      if (fixSyntaxErrors(filePath)) {
        fixedCount++;
      }
    }
  });

  return fixedCount;
}

// Основная функция
function main() {
  console.log('🔧 Исправляем синтаксические ошибки...\n');

  const srcDir = path.join(__dirname, '../src');
  const fixedCount = fixDirectory(srcDir);

  console.log(`\n🎉 Исправлено файлов: ${fixedCount}`);
  console.log('✅ Исправление синтаксических ошибок завершено!');
}

if (require.main === module) {
  main();
}

module.exports = { fixSyntaxErrors, fixDirectory }; 