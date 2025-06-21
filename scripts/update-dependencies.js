#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

// Логирование с цветом
const log = {
  info: (msg) => console.log(colors.blue + msg + colors.reset),
  success: (msg) => console.log(colors.green + msg + colors.reset),
  warning: (msg) => console.log(colors.yellow + msg + colors.reset),
  error: (msg) => console.log(colors.red + msg + colors.reset)
};

// Выполнение команды с обработкой ошибок
function execCommand(command) {
  try {
    const output = execSync(command, { encoding: 'utf8' });
    return { success: true, output };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Основная функция обновления
async function updateDependencies() {
  log.info('🔍 Проверка уязвимостей...');
  const auditResult = execCommand('pnpm audit');
  
  if (!auditResult.success) {
    log.warning('⚠️ Найдены уязвимости:');
    console.log(auditResult.error);
  }

  log.info('\n📦 Проверка устаревших пакетов...');
  const outdatedResult = execCommand('pnpm outdated');
  
  if (!outdatedResult.success) {
    log.warning('⚠️ Найдены устаревшие пакеты:');
    console.log(outdatedResult.output);
  }

  log.info('\n🔄 Обновление зависимостей...');
  
  // Обновление основных зависимостей
  const updateResult = execCommand('pnpm update');
  if (updateResult.success) {
    log.success('✅ Основные зависимости обновлены');
  } else {
    log.error('❌ Ошибка при обновлении основных зависимостей');
    console.log(updateResult.error);
  }

  // Обновление dev-зависимостей
  const updateDevResult = execCommand('pnpm update -D');
  if (updateDevResult.success) {
    log.success('✅ Dev-зависимости обновлены');
  } else {
    log.error('❌ Ошибка при обновлении dev-зависимостей');
    console.log(updateDevResult.error);
  }

  // Повторная проверка уязвимостей
  log.info('\n🔍 Повторная проверка уязвимостей...');
  const finalAuditResult = execCommand('pnpm audit');
  
  if (finalAuditResult.success) {
    log.success('✅ Уязвимости не обнаружены');
  } else {
    log.warning('⚠️ Остались уязвимости:');
    console.log(finalAuditResult.error);
  }

  // Создание отчета
  const report = {
    date: new Date().toISOString(),
    initialAudit: auditResult,
    outdated: outdatedResult,
    updates: {
      dependencies: updateResult,
      devDependencies: updateDevResult
    },
    finalAudit: finalAuditResult
  };

  // Сохранение отчета
  const reportsDir = path.join(__dirname, '../reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const reportPath = path.join(reportsDir, `dependency-update-${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log.success(`\n📝 Отчет сохранен в ${reportPath}`);
}

// Запуск скрипта
updateDependencies().catch(error => {
  log.error('❌ Произошла ошибка:');
  console.error(error);
  process.exit(1);
}); 