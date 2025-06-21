#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔄 Безопасное обновление зависимостей...\n');

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
    console.log(`❌ ${description} завершено с ошибками`);
    if (error.stdout) {
      console.log(error.stdout);
    }
    if (error.stderr) {
      console.log(error.stderr);
    }
    return null;
  }
}

// Функция для проверки совместимости
function checkCompatibility() {
  console.log('\n🔍 Проверка совместимости...');
  
  // Проверяем Node.js версию
  const nodeVersion = process.version;
  console.log(`📦 Node.js версия: ${nodeVersion}`);
  
  // Проверяем package.json
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const engines = packageJson.engines || {};
  
  if (engines.node) {
    console.log(`📋 Требуемая версия Node.js: ${engines.node}`);
  }
  
  return true;
}

// Функция для создания резервной копии
function createBackup() {
  console.log('\n💾 Создание резервной копии...');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = `backup-${timestamp}`;
  
  try {
    execSync(`mkdir -p ${backupDir}`);
    execSync(`cp package.json ${backupDir}/`);
    execSync(`cp package-lock.json ${backupDir}/ 2>/dev/null || true`);
    console.log(`✅ Резервная копия создана в ${backupDir}`);
    return backupDir;
  } catch (error) {
    console.log('⚠️ Не удалось создать резервную копию');
    return null;
  }
}

// Основная функция
async function main() {
  try {
    // 1. Проверка совместимости
    checkCompatibility();
    
    // 2. Создание резервной копии
    const backupDir = createBackup();
    
    // 3. Проверка текущих уязвимостей
    console.log('\n🔍 Проверка текущих уязвимостей...');
    runCommand('npm audit', 'Аудит безопасности');
    
    // 4. Обновление зависимостей
    console.log('\n🔄 Обновление зависимостей...');
    
    // Обновление до последних совместимых версий
    runCommand('npm update', 'Обновление до последних совместимых версий');
    
    // Обновление конкретных проблемных пакетов
    const packagesToUpdate = [
      'node-telegram-bot-api',
      'tough-cookie',
      'express-rate-limit',
      'helmet'
    ];
    
    packagesToUpdate.forEach(pkg => {
      console.log(`\n📦 Обновление ${pkg}...`);
      try {
        execSync(`npm install ${pkg}@latest`, { 
          encoding: 'utf8', 
          stdio: 'pipe' 
        });
        console.log(`✅ ${pkg} обновлен`);
      } catch (error) {
        console.log(`⚠️ Не удалось обновить ${pkg}: ${error.message}`);
      }
    });
    
    // 5. Исправление уязвимостей
    console.log('\n🔧 Исправление уязвимостей...');
    runCommand('npm audit fix --force', 'Принудительное исправление уязвимостей');
    
    // 6. Финальная проверка
    console.log('\n🔍 Финальная проверка...');
    runCommand('npm audit', 'Финальный аудит безопасности');
    
    // 7. Запуск тестов
    console.log('\n🧪 Запуск тестов...');
    const testResult = runCommand('npm test', 'Проверка работоспособности');
    
    if (testResult) {
      console.log('\n🎉 Обновление завершено успешно!');
      console.log('\n📋 Рекомендации:');
      console.log('1. Проверьте работу приложения вручную');
      console.log('2. Обновите документацию при необходимости');
      console.log('3. Сообщите команде об изменениях');
      
      if (backupDir) {
        console.log(`4. Резервная копия сохранена в ${backupDir}`);
      }
    } else {
      console.log('\n❌ Обновление завершено с ошибками');
      console.log('Проверьте логи выше и исправьте проблемы');
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка при обновлении:', error.message);
    process.exit(1);
  }
}

// Запуск скрипта
if (require.main === module) {
  main();
}

module.exports = { main, checkCompatibility, createBackup }; 