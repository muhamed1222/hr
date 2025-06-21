#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Автоматическое исправление ошибок линтера...\n');

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
  
  const filesToFix = [
    'src/app.js',
    'src/middleware/auth.js',
    'src/services/AuthService.js',
    'src/services/errors/index.js'
  ];
  
  filesToFix.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`📝 Проверка файла: ${file}`);
      
      let content = fs.readFileSync(file, 'utf8');
      
      // Исправление console.error на logger
      content = content.replace(
        /console\.error\(/g,
        'logger.error('
      );
      
      // Исправление console.log на logger
      content = content.replace(
        /console\.log\(/g,
        'logger.info('
      );
      
      // Исправление console.warn на logger
      content = content.replace(
        /console\.warn\(/g,
        'logger.warn('
      );
      
      // Добавление импорта logger если его нет
      if (content.includes('logger.') && !content.includes("require('./utils/logger')") && !content.includes("require('../utils/logger')")) {
        const loggerImport = "const { info, error, warn } = require('./utils/logger');\n";
        content = content.replace(/^/, loggerImport);
      }
      
      fs.writeFileSync(file, content);
      console.log(`✅ Файл ${file} обновлен`);
    }
  });
}

// Основная функция
async function main() {
  try {
    // 1. Запуск ESLint с автоматическим исправлением
    runCommand(
      'npx eslint src/ --fix',
      'Автоматическое исправление ошибок ESLint'
    );
    
    // 2. Запуск Prettier для форматирования
    runCommand(
      'npx prettier --write "src/**/*.{js,json}"',
      'Форматирование кода с Prettier'
    );
    
    // 3. Исправление конкретных проблем
    fixSpecificIssues();
    
    // 4. Финальная проверка
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

module.exports = { main, fixSpecificIssues }; 