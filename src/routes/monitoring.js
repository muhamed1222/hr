const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const MonitoringService = require('../services/MonitoringService');

// Создаём единственный экземпляр сервиса мониторинга
const monitoringService = new MonitoringService();

// Middleware для супер админа
const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Требуются права супер администратора' });
  }
  next();
};

// Health check endpoint (публичный для внешних мониторингов)
router.get('/health', async (req, res) => {
  try {
    const health = await monitoringService.runHealthChecks();
    
    // Возвращаем соответствующий HTTP статус
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'warning' ? 200 : 503;
    
    res.status(statusCode).json({
      status: health.status,
      timestamp: health.timestamp,
      uptime: health.uptime,
      version: process.env.APP_VERSION || '1.0.0'
    });
  } catch (error) {
    console.error('Ошибка health check:', error);
    res.status(500).json({
      status: 'error',
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Детальная информация о состоянии системы
router.get('/health/detailed', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const health = await monitoringService.runHealthChecks();
    const metrics = monitoringService.getMetrics();
    const alerts = await monitoringService.checkAlertsConditions();

    res.json({
      success: true,
      data: {
        health,
        metrics,
        alerts,
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          pid: process.pid
        }
      }
    });
  } catch (error) {
    console.error('Ошибка получения детального health check:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Метрики системы
router.get('/metrics', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const metrics = monitoringService.getMetrics();
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Ошибка получения метрик:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Создать backup
router.post('/backup', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { organizationId } = req.body;
    
    const result = await monitoringService.createBackup(organizationId);
    
    res.json({
      success: true,
      data: result,
      message: 'Backup создан успешно'
    });
  } catch (error) {
    console.error('Ошибка создания backup:', error);
    res.status(500).json({ error: 'Ошибка создания backup: ' + error.message });
  }
});

// Получить логи системы
router.get('/logs', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { level = 'all', limit = 100 } = req.query;
    
    const logs = monitoringService.getLogs(level, parseInt(limit));
    
    res.json({
      success: true,
      data: {
        logs,
        count: logs.length
      }
    });
  } catch (error) {
    console.error('Ошибка получения логов:', error);
    res.status(500).json({ error: 'Ошибка получения логов' });
  }
});

// Получить алерты
router.get('/alerts', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const alerts = await monitoringService.checkAlertsConditions();
    
    res.json({
      success: true,
      data: {
        alerts,
        count: alerts.length,
        critical: alerts.filter(a => a.level === 'critical').length,
        warnings: alerts.filter(a => a.level === 'warning').length
      }
    });
  } catch (error) {
    console.error('Ошибка получения алертов:', error);
    res.status(500).json({ error: 'Ошибка получения алертов' });
  }
});

// Системная информация
router.get('/system-info', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const systemInfo = {
      process: {
        pid: process.pid,
        version: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        argv: process.argv
      },
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024)
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };
    
    res.json({
      success: true,
      data: systemInfo
    });
  } catch (error) {
    console.error('Ошибка получения системной информации:', error);
    res.status(500).json({ error: 'Ошибка получения системной информации' });
  }
});

// Middleware для подсчёта запросов
router.use((req, res, next) => {
  monitoringService.incrementRequests();
  
  // Перехватываем ошибки
  const originalSend = res.send;
  res.send = function(data) {
    if (res.statusCode >= 400) {
      monitoringService.incrementErrors();
    }
    originalSend.call(this, data);
  };
  
  next();
});

// Экспортируем сервис для использования в других местах
router.monitoringService = monitoringService;

module.exports = router; 