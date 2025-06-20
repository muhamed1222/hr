const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { sequelize, User, Organization } = require('../models');

class MonitoringService {
  constructor() {
    this.metrics = {
      startTime: Date.now(),
      requests: 0,
      errors: 0,
      lastBackup: null,
      systemHealth: 'healthy'
    };
    
    this.healthChecks = new Map();
    this.initializeHealthChecks();
  }

  initializeHealthChecks() {
    // Проверка базы данных
    this.healthChecks.set('database', {
      name: 'База данных',
      check: async () => {
        try {
          await sequelize.authenticate();
          const userCount = await User.count();
          return {
            status: 'healthy',
            details: {
              connected: true,
              userCount,
              responseTime: Date.now()
            }
          };
        } catch (error) {
          return {
            status: 'unhealthy',
            error: error.message
          };
        }
      },
      critical: true
    });

    // Проверка файловой системы
    this.healthChecks.set('filesystem', {
      name: 'Файловая система',
      check: async () => {
        try {
          const uploadsDir = path.join(__dirname, '../uploads');
          const logsDir = path.join(__dirname, '../../logs');
          
          const checks = {
            uploadsWritable: this.checkDirectoryWritable(uploadsDir),
            logsWritable: this.checkDirectoryWritable(logsDir),
            diskSpace: this.getDiskUsage()
          };

          const allHealthy = Object.values(checks).every(check => 
            typeof check === 'boolean' ? check : check.available > 1000 // 1GB minimum
          );

          return {
            status: allHealthy ? 'healthy' : 'warning',
            details: checks
          };
        } catch (error) {
          return {
            status: 'unhealthy',
            error: error.message
          };
        }
      },
      critical: false
    });

    // Проверка памяти
    this.healthChecks.set('memory', {
      name: 'Память',
      check: async () => {
        try {
          const usage = process.memoryUsage();
          const totalMB = Math.round(usage.rss / 1024 / 1024);
          const heapMB = Math.round(usage.heapUsed / 1024 / 1024);
          
          return {
            status: totalMB > 500 ? 'warning' : 'healthy',
            details: {
              totalMB,
              heapMB,
              uptime: Math.round(process.uptime())
            }
          };
        } catch (error) {
          return {
            status: 'unhealthy',
            error: error.message
          };
        }
      },
      critical: false
    });

    // Проверка внешних сервисов
    this.healthChecks.set('external', {
      name: 'Внешние сервисы',
      check: async () => {
        try {
          const checks = {};
          
          // Проверка Telegram API (если настроен)
          if (process.env.TELEGRAM_BOT_TOKEN) {
            checks.telegram = await this.checkTelegramAPI();
          }

          return {
            status: 'healthy',
            details: checks
          };
        } catch (error) {
          return {
            status: 'warning',
            error: error.message
          };
        }
      },
      critical: false
    });
  }

  async runHealthChecks() {
    const results = {};
    let overallStatus = 'healthy';

    for (const [key, healthCheck] of this.healthChecks) {
      try {
        const result = await healthCheck.check();
        results[key] = {
          name: healthCheck.name,
          ...result,
          critical: healthCheck.critical,
          timestamp: new Date().toISOString()
        };

        // Определяем общий статус
        if (result.status === 'unhealthy' && healthCheck.critical) {
          overallStatus = 'unhealthy';
        } else if (result.status === 'warning' && overallStatus === 'healthy') {
          overallStatus = 'warning';
        }
      } catch (error) {
        results[key] = {
          name: healthCheck.name,
          status: 'error',
          error: error.message,
          critical: healthCheck.critical,
          timestamp: new Date().toISOString()
        };

        if (healthCheck.critical) {
          overallStatus = 'unhealthy';
        }
      }
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: results
    };
  }

  checkDirectoryWritable(dirPath) {
    try {
      // Создаём директорию если не существует
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      // Проверяем запись
      const testFile = path.join(dirPath, '.write-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      
      return true;
    } catch (error) {
      return false;
    }
  }

  getDiskUsage() {
    try {
      if (process.platform === 'win32') {
        // Windows
        const output = execSync('wmic logicaldisk get size,freespace,caption', { encoding: 'utf8' });
        // Упрощённая проверка для Windows
        return { available: 1000, total: 1000 }; // Заглушка
      } else {
        // Unix/Linux/macOS
        const output = execSync('df -h /', { encoding: 'utf8' });
        const lines = output.trim().split('\n');
        const diskInfo = lines[1].split(/\s+/);
        
        return {
          total: diskInfo[1],
          used: diskInfo[2],
          available: diskInfo[3],
          percentage: diskInfo[4]
        };
      }
    } catch (error) {
      return { error: error.message };
    }
  }

  async checkTelegramAPI() {
    try {
      const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`);
      const data = await response.json();
      
      return {
        status: data.ok ? 'healthy' : 'unhealthy',
        bot: data.result
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  // Система метрик
  incrementRequests() {
    this.metrics.requests++;
  }

  incrementErrors() {
    this.metrics.errors++;
  }

  getMetrics() {
    const uptime = Date.now() - this.metrics.startTime;
    
    return {
      ...this.metrics,
      uptime: Math.round(uptime / 1000),
      requestsPerMinute: this.metrics.requests / (uptime / 60000),
      errorRate: this.metrics.requests > 0 ? 
        Math.round((this.metrics.errors / this.metrics.requests) * 100) : 0
    };
  }

  // Backup система
  async createBackup(organizationId = null) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(__dirname, '../../backups');
      
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      let backupName = `backup-${timestamp}`;
      if (organizationId) {
        const org = await Organization.findByPk(organizationId);
        backupName = `backup-${org.slug}-${timestamp}`;
      }

      const backupPath = path.join(backupDir, `${backupName}.sql`);

      // Создаём SQL дамп
      let dumpCommand;
      if (process.env.DB_TYPE === 'postgres') {
        dumpCommand = `pg_dump ${process.env.DATABASE_URL} > "${backupPath}"`;
      } else {
        // SQLite
        const dbPath = path.join(__dirname, '../../hr_database.db');
        dumpCommand = `sqlite3 "${dbPath}" .dump > "${backupPath}"`;
      }

      execSync(dumpCommand);

      // Сжимаем backup
      const gzipPath = `${backupPath}.gz`;
      execSync(`gzip "${backupPath}"`);

      // Обновляем метрики
      this.metrics.lastBackup = new Date().toISOString();

      // Очищаем старые backup'ы (оставляем последние 7)
      this.cleanOldBackups(backupDir);

      return {
        success: true,
        backupPath: gzipPath,
        size: fs.statSync(gzipPath).size,
        timestamp: this.metrics.lastBackup
      };
    } catch (error) {
      console.error('Ошибка создания backup:', error);
      throw error;
    }
  }

  cleanOldBackups(backupDir, keepCount = 7) {
    try {
      const files = fs.readdirSync(backupDir)
        .filter(file => file.endsWith('.sql.gz'))
        .map(file => ({
          name: file,
          path: path.join(backupDir, file),
          mtime: fs.statSync(path.join(backupDir, file)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime);

      // Удаляем файлы свыше лимита
      if (files.length > keepCount) {
        files.slice(keepCount).forEach(file => {
          fs.unlinkSync(file.path);
        });
      }
    } catch (error) {
      console.error('Ошибка очистки старых backup\'ов:', error);
    }
  }

  // Автоматические backup'ы
  scheduleBackups() {
    // Ежедневный backup в 3:00
    const scheduleDaily = () => {
      const now = new Date();
      const next3AM = new Date();
      next3AM.setHours(3, 0, 0, 0);
      
      if (next3AM <= now) {
        next3AM.setDate(next3AM.getDate() + 1);
      }
      
      const timeout = next3AM.getTime() - now.getTime();
      
      setTimeout(() => {
        this.createBackup()
          .then(() => {/* backup ok */})
          .catch(error => console.error('Ошибка автоматического backup:', error));
        
        // Планируем следующий backup
        scheduleDaily();
      }, timeout);
    };

    scheduleDaily();
  }

  // Алерты и уведомления
  async checkAlertsConditions() {
    const health = await this.runHealthChecks();
    const metrics = this.getMetrics();
    const alerts = [];

    // Проверяем критические условия
    if (health.status === 'unhealthy') {
      alerts.push({
        level: 'critical',
        message: 'Система имеет критические проблемы',
        details: health.checks
      });
    }

    // Проверяем высокий error rate
    if (metrics.errorRate > 10) {
      alerts.push({
        level: 'warning',
        message: `Высокий уровень ошибок: ${metrics.errorRate}%`,
        details: { errorRate: metrics.errorRate, errors: metrics.errors }
      });
    }

    // Проверяем использование памяти
    const memoryCheck = health.checks.memory;
    if (memoryCheck && memoryCheck.details.totalMB > 400) {
      alerts.push({
        level: 'warning',
        message: `Высокое использование памяти: ${memoryCheck.details.totalMB}MB`,
        details: memoryCheck.details
      });
    }

    return alerts;
  }

  // Получение логов
  getLogs(level = 'all', limit = 100) {
    try {
      const logsDir = path.join(__dirname, '../../logs');
      const logFiles = {
        app: path.join(logsDir, 'app.log'),
        error: path.join(logsDir, 'exceptions.log')
      };

      const logs = [];

      Object.entries(logFiles).forEach(([type, filePath]) => {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          const lines = content.split('\n')
            .filter(line => line.trim())
            .slice(-limit)
            .map(line => ({
              type,
              timestamp: this.extractTimestamp(line),
              message: line
            }));
          
          logs.push(...lines);
        }
      });

      // Сортируем по времени
      logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return logs.slice(0, limit);
    } catch (error) {
      console.error('Ошибка получения логов:', error);
      return [];
    }
  }

  extractTimestamp(logLine) {
    // Пытаемся извлечь timestamp из строки лога
    const timestampMatch = logLine.match(/(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2})/);
    return timestampMatch ? timestampMatch[1] : new Date().toISOString();
  }
}

module.exports = MonitoringService; 