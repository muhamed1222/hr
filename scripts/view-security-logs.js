#!/usr/bin/env node

const { createClient } = require('redis');
const AuditLog = require('../src/models/AuditLog');
const { error: _error, info: _info } = require('../src/utils/logger');
const moment = require('moment');
const fs = require('fs').promises;
const path = require('path');
const { SECURITY_SEVERITY, SECURITY_EVENT_TYPES } = require('../src/constants');

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Форматирование вывода
const formatLog = (log) => {
  const timestamp = moment(log.createdAt).format('YYYY-MM-DD HH:mm:ss');
  const status = log.status === 'ALERT' ? colors.red + log.status + colors.reset :
                 log.status === 'WARNING' ? colors.yellow + log.status + colors.reset :
                 colors.green + log.status + colors.reset;

  const severity = log.details?.severity ? 
    (log.details.severity === SECURITY_SEVERITY.CRITICAL ? colors.red :
     log.details.severity === SECURITY_SEVERITY.HIGH ? colors.magenta :
     log.details.severity === SECURITY_SEVERITY.MEDIUM ? colors.yellow :
     colors.green) + log.details.severity + colors.reset
    : '';

  return `
${colors.blue}[${timestamp}]${colors.reset} ${status} ${severity}
Type: ${log.type}
Action: ${log.action}
IP: ${log.ip || 'N/A'}
User ID: ${log.userId || 'N/A'}
Details: ${JSON.stringify(log.details, null, 2)}
`;
};

// Получение статистики по типам событий
const getEventStats = (logs) => {
  const stats = {
    byAction: {},
    bySeverity: {},
    byIP: {},
    byHour: {},
    byStatus: {}
  };

  logs.forEach(log => {
    // По типу события
    stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
    
    // По уровню серьезности
    if (log.details?.severity) {
      stats.bySeverity[log.details.severity] = (stats.bySeverity[log.details.severity] || 0) + 1;
    }
    
    // По IP
    if (log.ip) {
      stats.byIP[log.ip] = (stats.byIP[log.ip] || 0) + 1;
    }
    
    // По часу
    const hour = moment(log.createdAt).format('HH:00');
    stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;
    
    // По статусу
    stats.byStatus[log.status] = (stats.byStatus[log.status] || 0) + 1;
  });

  return stats;
};

// Экспорт логов в файл
const exportLogs = async (logs, format, outputPath) => {
  const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
  const filename = path.join(outputPath, `security_logs_${timestamp}.${format}`);

  let content;
  if (format === 'json') {
    content = JSON.stringify(logs, null, 2);
  } else if (format === 'csv') {
    const headers = ['timestamp', 'type', 'action', 'status', 'severity', 'ip', 'userId', 'details'];
    const rows = logs.map(log => [
      moment(log.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      log.type,
      log.action,
      log.status,
      log.details?.severity || '',
      log.ip || '',
      log.userId || '',
      JSON.stringify(log.details)
    ]);
    content = [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  await fs.writeFile(filename, content, 'utf8');
  _info(`Logs exported to ${filename}`);
  return filename;
};

// Анализ временных паттернов
const analyzeTimePatterns = (logs) => {
  const patterns = {
    unusualHours: [], // Активность в необычное время
    burstActivity: [], // Всплески активности
    periodicPatterns: [] // Периодические паттерны
  };

  // Группировка по часам
  const hourlyActivity = {};
  logs.forEach(log => {
    const hour = moment(log.createdAt).format('HH');
    hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
  });

  // Определение необычных часов (ночное время)
  for (let hour = 0; hour < 24; hour++) {
    const hourStr = hour.toString().padStart(2, '0');
    if ((hour >= 23 || hour <= 4) && hourlyActivity[hourStr] > 10) {
      patterns.unusualHours.push({
        hour: hourStr,
        count: hourlyActivity[hourStr]
      });
    }
  }

  // Определение всплесков активности
  const avgActivity = Object.values(hourlyActivity).reduce((a, b) => a + b, 0) / 24;
  for (const [hour, count] of Object.entries(hourlyActivity)) {
    if (count > avgActivity * 3) { // Активность в 3 раза выше средней
      patterns.burstActivity.push({
        hour,
        count,
        avgRatio: (count / avgActivity).toFixed(2)
      });
    }
  }

  return patterns;
};

// Основная функция просмотра логов
async function viewSecurityLogs(options = {}) {
  try {
    const { hours = 24, type, status, export: exportFormat, outputPath = './exports' } = options;
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Построение запроса
    const where = {
      type: 'SECURITY',
      createdAt: {
        $gte: startDate
      }
    };

    if (type) where.action = type;
    if (status) where.status = status;

    // Получение логов
    const logs = await AuditLog.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    if (logs.length === 0) {
      console.log(colors.yellow + '\nНет логов безопасности за указанный период' + colors.reset);
      return;
    }

    // Экспорт логов если требуется
    if (exportFormat) {
      await fs.mkdir(outputPath, { recursive: true });
      const exportedFile = await exportLogs(logs, exportFormat, outputPath);
      console.log(colors.green + `\nЛоги экспортированы в ${exportedFile}` + colors.reset);
    }

    // Вывод статистики
    const stats = getEventStats(logs);
    console.log(colors.blue + '\nСтатистика событий:' + colors.reset);
    
    console.log(colors.cyan + '\nПо типу события:' + colors.reset);
    Object.entries(stats.byAction).forEach(([action, count]) => {
      console.log(`${action}: ${count}`);
    });

    console.log(colors.cyan + '\nПо уровню серьезности:' + colors.reset);
    Object.entries(stats.bySeverity).forEach(([severity, count]) => {
      console.log(`${severity}: ${count}`);
    });

    console.log(colors.cyan + '\nTop 5 IP-адресов:' + colors.reset);
    Object.entries(stats.byIP)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([ip, count]) => {
        console.log(`${ip}: ${count}`);
      });

    // Анализ временных паттернов
    const timePatterns = analyzeTimePatterns(logs);
    if (timePatterns.unusualHours.length > 0) {
      console.log(colors.magenta + '\nПодозрительная активность в ночное время:' + colors.reset);
      timePatterns.unusualHours.forEach(({hour, count}) => {
        console.log(`${hour}:00 - ${count} событий`);
      });
    }

    if (timePatterns.burstActivity.length > 0) {
      console.log(colors.magenta + '\nВсплески активности:' + colors.reset);
      timePatterns.burstActivity.forEach(({hour, count, avgRatio}) => {
        console.log(`${hour}:00 - ${count} событий (в ${avgRatio} раз выше среднего)`);
      });
    }

    // Проверка Redis
    const redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    await redisClient.connect();

    // Получение активных блокировок
    const blockedIPs = await redisClient.keys('security:csrf:*');
    if (blockedIPs.length > 0) {
      console.log(colors.blue + '\nАктивные блокировки CSRF:' + colors.reset);
      for (const key of blockedIPs) {
        const attempts = await redisClient.get(key);
        const ip = key.split(':')[2];
        console.log(`IP: ${ip}, Попыток: ${attempts}`);
      }
    }

    // Получение подозрительных IP
    const suspiciousIPs = await redisClient.keys('security:suspicious_ip:*');
    if (suspiciousIPs.length > 0) {
      console.log(colors.blue + '\nПодозрительные IP:' + colors.reset);
      for (const key of suspiciousIPs) {
        const data = await redisClient.get(key);
        const ip = key.split(':')[2];
        const activity = JSON.parse(data);
        console.log(`IP: ${ip}`);
        console.log(`Количество инцидентов: ${activity.count}`);
        console.log(`Типы нарушений: ${activity.reasons.join(', ')}`);
      }
    }

    await redisClient.quit();

    // Вывод детальных логов
    console.log(colors.blue + '\nДетальные логи:' + colors.reset);
    logs.forEach(log => {
      console.log(formatLog(log));
    });

  } catch (error) {
    _error('Error viewing security logs:', error);
    process.exit(1);
  }
}

// Парсинг аргументов командной строки
const args = process.argv.slice(2);
const options = {
  hours: 24,
  type: null,
  status: null,
  export: null,
  outputPath: './exports'
};

args.forEach((arg, index) => {
  if (arg === '--hours' && args[index + 1]) {
    options.hours = parseInt(args[index + 1]);
  }
  if (arg === '--type' && args[index + 1]) {
    options.type = args[index + 1];
  }
  if (arg === '--status' && args[index + 1]) {
    options.status = args[index + 1];
  }
  if (arg === '--export' && args[index + 1]) {
    options.export = args[index + 1];
  }
  if (arg === '--output' && args[index + 1]) {
    options.outputPath = args[index + 1];
  }
});

// Запуск скрипта
viewSecurityLogs(options).catch(error => {
  console.error(colors.red + 'Failed to view security logs:', error + colors.reset);
  process.exit(1);
}); 