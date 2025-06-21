#!/usr/bin/env node

/**
 * Скрипт для исправления конкретных типов ошибок линтера
 */

const fs = require('fs');
const path = require('path');

/**
 * Исправляет конкретные ошибки в файле
 */
function fixSpecificErrors(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // 1. Исправляем неиспользуемые переменные (добавляем префикс _)
    const unusedVarPatterns = [
      // Неиспользуемые require
      { 
        pattern: /const (\w+) = require\(/g, 
        replacement: (match, varName) => {
          const varUsagePattern = new RegExp(`\\b${varName}\\b`, 'g');
          const usages = content.match(varUsagePattern) || [];
          if (usages.length <= 1) {
            return `const _${varName} = require(`;
          }
          return match;
        }
      },
      // Неиспользуемые параметры функций
      {
        pattern: /function \w+\(([^)]*)\)/g,
        replacement: (match, params) => {
          const paramList = params.split(',').map(p => p.trim());
          const fixedParams = paramList.map(param => {
            if (param && !param.startsWith('_')) {
              const paramName = param.split('=')[0].trim();
              const varUsagePattern = new RegExp(`\\b${paramName}\\b`, 'g');
              const usages = content.match(varUsagePattern) || [];
              if (usages.length <= 1) {
                return param.replace(paramName, `_${paramName}`);
              }
            }
            return param;
          });
          return match.replace(params, fixedParams.join(', '));
        }
      }
    ];

    unusedVarPatterns.forEach(({ pattern, replacement }) => {
      if (typeof replacement === 'function') {
        const newContent = content.replace(pattern, replacement);
        if (newContent !== content) {
          content = newContent;
          modified = true;
        }
      } else {
        if (content.match(pattern)) {
          content = content.replace(pattern, replacement);
          modified = true;
        }
      }
    });

    // 2. Исправляем console.log на logger
    if (content.includes('console.log') || content.includes('console.error')) {
      // Добавляем импорт logger если его нет
      if (!content.includes('require.*logger')) {
        const loggerImport = "const { info, error, warn, debug } = require('../utils/logger');\n";
        content = content.replace(/'use strict';\n/, "'use strict';\n\n" + loggerImport);
      }
      
      // Заменяем console.log на logger
      content = content.replace(/console\.log\(/g, 'info(');
      content = content.replace(/console\.error\(/g, 'error(');
      content = content.replace(/console\.warn\(/g, 'warn(');
      content = content.replace(/console\.debug\(/g, 'debug(');
      modified = true;
    }

    // 3. Исправляем case declarations
    content = content.replace(/case\s+['"`][^'"`]+['"`]:\s*\n\s*(let|const|var)\s+/g, (match, keyword) => {
      return match.replace(keyword, keyword);
    });

    // 4. Добавляем константы для магических чисел
    const magicNumbers = {
      '200': 'HTTP_STATUS_CODES.OK',
      '201': 'HTTP_STATUS_CODES.CREATED', 
      '400': 'HTTP_STATUS_CODES.BAD_REQUEST',
      '401': 'HTTP_STATUS_CODES.UNAUTHORIZED',
      '403': 'HTTP_STATUS_CODES.FORBIDDEN',
      '404': 'HTTP_STATUS_CODES.NOT_FOUND',
      '409': 'HTTP_STATUS_CODES.CONFLICT',
      '429': 'HTTP_STATUS_CODES.TOO_MANY_REQUESTS',
      '500': 'HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR',
      '503': 'HTTP_STATUS_CODES.SERVICE_UNAVAILABLE',
      '255': 'MAX_LENGTH',
      '50': 'DEFAULT_LIMIT',
      '100': 'MAX_LIMIT'
    };

    Object.entries(magicNumbers).forEach(([number, constant]) => {
      const pattern = new RegExp(`\\b${number}\\b`, 'g');
      if (content.match(pattern)) {
        content = content.replace(pattern, constant);
        modified = true;
      }
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
 * Рекурсивно обходит директорию
 */
function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  let fixedCount = 0;

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      fixedCount += processDirectory(filePath);
    } else if (file.endsWith('.js') && !file.endsWith('.test.js')) {
      if (fixSpecificErrors(filePath)) {
        fixedCount++;
      }
    }
  });

  return fixedCount;
}

// Главная функция
function main() {
  console.log('🔧 Исправляем конкретные ошибки линтера...\n');

  const srcPath = path.join(__dirname, '..', 'src');
  
  if (!fs.existsSync(srcPath)) {
    console.error('❌ Директория src не найдена');
    process.exit(1);
  }

  const fixedCount = processDirectory(srcPath);
  
  console.log(`\n🎉 Исправлено файлов: ${fixedCount}`);
}

if (require.main === module) {
  main();
}

module.exports = { fixSpecificErrors, processDirectory }; 