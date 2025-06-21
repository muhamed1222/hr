"use strict";

/**
 * Система метрик и мониторинга
 * Отслеживает производительность, ошибки и использование ресурсов
 */

const { performance } = require("perf_hooks");
const _os = require("os");

// Константы
const LIMITS = {
  DEFAULT_PAGE_SIZE: LIMITS.DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE: LIMITS.MAX_PAGE_SIZE,
  MAX_PAGE_SIZE0: LIMITS.MAX_PAGE_SIZE0,
};

const HTTP_STATUS_CODES = {
  BAD_REQUEST: HTTP_STATUS_CODES.BAD_REQUEST,
  UNAUTHORIZED: HTTP_STATUS_CODES.UNAUTHORIZED,
  FORBIDDEN: HTTP_STATUS_CODES.FORBIDDEN,
  NOT_FOUND: HTTP_STATUS_CODES.NOT_FOUND,
  INTERNAL_SERVER_ERROR: HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
};

class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        byMethod: {},
        byEndpoint: {},
        responseTime: [],
        errors: 0,
      },
      auth: {
        logins: 0,
        failedLogins: 0,
        passwordChanges: 0,
      },
      database: {
        queries: 0,
        slowQueries: 0,
        errors: 0,
      },
      telegram: {
        messages: 0,
        errors: 0,
      },
      system: {
        memory: [],
        cpu: [],
        uptime: Date.now(),
      },
    };

    this.startTime = Date.now();
    this.startSystemMonitoring();
  }

  // Метрики запросов
  recordRequest(method, endpoint, statusCode, responseTime) {
    this.metrics.requests.total++;

    // По методу
    this.metrics.requests.byMethod[method] =
      (this.metrics.requests.byMethod[method] || 0) + 1;

    // По эндпоинту
    this.metrics.requests.byEndpoint[endpoint] =
      (this.metrics.requests.byEndpoint[endpoint] || 0) + 1;

    // Время ответа
    this.metrics.requests.responseTime.push(responseTime);

    // Ограничиваем массив времени ответа
    if (this.metrics.requests.responseTime.length > LIMITS.MAX_PAGE_SIZE0) {
      this.metrics.requests.responseTime =
        this.metrics.requests.responseTime.slice(-LIMITS.MAX_PAGE_SIZE0);
    }

    // Ошибки
    if (statusCode >= HTTP_STATUS_CODES.BAD_REQUEST) {
      this.metrics.requests.errors++;
    }
  }

  // Метрики аутентификации
  recordAuthEvent(event, success = true) {
    switch (event) {
      case "login":
        if (success) {
          this.metrics.auth.logins++;
        } else {
          this.metrics.auth.failedLogins++;
        }
        break;
      case "passwordChange":
        this.metrics.auth.passwordChanges++;
        break;
    }
  }

  // Метрики базы данных
  recordDatabaseQuery(responseTime, error = false) {
    this.metrics.database.queries++;

    if (responseTime > LIMITS.MAX_PAGE_SIZE0) {
      // медленные запросы > 1 сек
      this.metrics.database.slowQueries++;
    }

    if (error) {
      this.metrics.database.errors++;
    }
  }

  // Метрики Telegram
  recordTelegramEvent(event, success = true) {
    if (event === "message") {
      this.metrics.telegram.messages++;
    }

    if (!success) {
      this.metrics.telegram.errors++;
    }
  }

  // Мониторинг системы
  startSystemMonitoring() {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const cpuUsage = os.loadavg();

      this.metrics.system.memory.push({
        timestamp: Date.now(),
        rss: memUsage.rss,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
      });

      this.metrics.system.cpu.push({
        timestamp: Date.now(),
        load1: cpuUsage[0],
        load5: cpuUsage[1],
        load15: cpuUsage[2],
      });

      // Ограничиваем размер массивов
      if (this.metrics.system.memory.length > LIMITS.MAX_PAGE_SIZE) {
        this.metrics.system.memory = this.metrics.system.memory.slice(
          -LIMITS.MAX_PAGE_SIZE,
        );
      }
      if (this.metrics.system.cpu.length > LIMITS.MAX_PAGE_SIZE) {
        this.metrics.system.cpu = this.metrics.system.cpu.slice(
          -LIMITS.MAX_PAGE_SIZE,
        );
      }
    }, 30000); // каждые 30 секунд
  }

  // Получение статистики
  getStats() {
    const responseTimes = this.metrics.requests.responseTime;
    const avgResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

    const uptime = Date.now() - this.startTime;

    return {
      requests: {
        total: this.metrics.requests.total,
        errors: this.metrics.requests.errors,
        errorRate:
          this.metrics.requests.total > 0
            ? (
                (this.metrics.requests.errors / this.metrics.requests.total) *
                LIMITS.MAX_PAGE_SIZE
              ).toFixed(2) + "%"
            : "0%",
        avgResponseTime: avgResponseTime.toFixed(2) + "ms",
        byMethod: this.metrics.requests.byMethod,
        byEndpoint: this.metrics.requests.byEndpoint,
      },
      auth: this.metrics.auth,
      database: {
        ...this.metrics.database,
        slowQueryRate:
          this.metrics.database.queries > 0
            ? (
                (this.metrics.database.slowQueries /
                  this.metrics.database.queries) *
                LIMITS.MAX_PAGE_SIZE
              ).toFixed(2) + "%"
            : "0%",
      },
      telegram: this.metrics.telegram,
      system: {
        uptime: Math.floor(uptime / LIMITS.MAX_PAGE_SIZE0) + "s",
        memory:
          this.metrics.system.memory[this.metrics.system.memory.length - 1] ||
          {},
        cpu: this.metrics.system.cpu[this.metrics.system.cpu.length - 1] || {},
      },
    };
  }

  // Middleware для автоматического сбора метрик
  middleware() {
    return (req, res, next) => {
      const start = performance.now();

      // Перехватываем завершение ответа
      res.on("finish", () => {
        const responseTime = performance.now() - start;
        this.recordRequest(req.method, req.path, res.statusCode, responseTime);
      });

      next();
    };
  }
}

// Создаем глобальный экземпляр
const metrics = new MetricsCollector();

module.exports = {
  metrics,
  MetricsCollector,
};
