"use strict";

const { info: _info, error: _error, warn: _warn, debug: _debug } = require("./logger");

/**
 * Система алертов и уведомлений
 * Отслеживает критические события и отправляет уведомления
 */

const { metrics } = require("./metrics");
const { sendTelegramMessage: _sendTelegramMessage } = require("./sendTelegramMessage");
const { HTTP_STATUS_CODES, LIMITS } = require("../constants");

// Константы для алертов
const ALERT_THRESHOLDS = {
  HIGH_ERROR_RATE: 10, // 10% ошибок
  SLOW_RESPONSE: HTTP_STATUS_CODES.OK0, // 2 секунды
  HIGH_MEMORY_USAGE: 85, // 85% памяти
  HIGH_CPU_USAGE: 80, // 80% CPU
  FAILED_LOGINS: 5, // 5 неудачных попыток подряд
  DATABASE_ERRORS: 3, // 3 ошибки БД подряд
};

class AlertSystem {
  constructor() {
    this.alerts = {
      highErrorRate: {
        threshold: ALERT_THRESHOLDS.HIGH_ERROR_RATE,
        triggered: false,
      },
      slowResponse: {
        threshold: ALERT_THRESHOLDS.SLOW_RESPONSE,
        triggered: false,
      },
      highMemoryUsage: {
        threshold: ALERT_THRESHOLDS.HIGH_MEMORY_USAGE,
        triggered: false,
      },
      highCPUUsage: {
        threshold: ALERT_THRESHOLDS.HIGH_CPU_USAGE,
        triggered: false,
      },
      failedLogins: {
        threshold: ALERT_THRESHOLDS.FAILED_LOGINS,
        triggered: false,
      },
      databaseErrors: {
        threshold: ALERT_THRESHOLDS.DATABASE_ERRORS,
        triggered: false,
      },
    };

    this.alertHistory = [];
    this.startMonitoring();
  }

  // Проверка метрик и генерация алертов
  checkMetrics() {
    const stats = metrics.getStats();

    // Проверка высокого процента ошибок
    const errorRate = parseFloat(stats.requests.errorRate);
    if (
      errorRate > this.alerts.highErrorRate.threshold &&
      !this.alerts.highErrorRate.triggered
    ) {
      this.triggerAlert("highErrorRate", {
        current: errorRate + "%",
        threshold: this.alerts.highErrorRate.threshold + "%",
        totalRequests: stats.requests.total,
        errors: stats.requests.errors,
      });
    } else if (
      errorRate <= this.alerts.highErrorRate.threshold &&
      this.alerts.highErrorRate.triggered
    ) {
      this.resolveAlert("highErrorRate", { current: errorRate + "%" });
    }

    // Проверка медленных ответов
    const avgResponseTime = parseFloat(stats.requests.avgResponseTime);
    if (
      avgResponseTime > this.alerts.slowResponse.threshold &&
      !this.alerts.slowResponse.triggered
    ) {
      this.triggerAlert("slowResponse", {
        current: avgResponseTime + "ms",
        threshold: this.alerts.slowResponse.threshold + "ms",
      });
    } else if (
      avgResponseTime <= this.alerts.slowResponse.threshold &&
      this.alerts.slowResponse.triggered
    ) {
      this.resolveAlert("slowResponse", { current: avgResponseTime + "ms" });
    }

    // Проверка использования памяти
    if (
      stats.system.memory &&
      stats.system.memory.rss &&
      typeof stats.system.memory.rss === "string"
    ) {
      const memUsage = this.parseMemoryUsage(stats.system.memory.rss);
      const memPercent = (memUsage / this.getTotalMemory()) * LIMITS.MAX_PAGE_SIZE;

      if (
        memPercent > this.alerts.highMemoryUsage.threshold &&
        !this.alerts.highMemoryUsage.triggered
      ) {
        this.triggerAlert("highMemoryUsage", {
          current: memPercent.toFixed(1) + "%",
          threshold: this.alerts.highMemoryUsage.threshold + "%",
          used: stats.system.memory.rss,
          heapUsed: stats.system.memory.heapUsed,
        });
      } else if (
        memPercent <= this.alerts.highMemoryUsage.threshold &&
        this.alerts.highMemoryUsage.triggered
      ) {
        this.resolveAlert("highMemoryUsage", {
          current: memPercent.toFixed(1) + "%",
        });
      }
    }

    // Проверка неудачных попыток входа
    if (
      stats.auth.failedLogins >= this.alerts.failedLogins.threshold &&
      !this.alerts.failedLogins.triggered
    ) {
      this.triggerAlert("failedLogins", {
        failedAttempts: stats.auth.failedLogins,
        threshold: this.alerts.failedLogins.threshold,
        successRate:
          stats.auth.logins + stats.auth.failedLogins > 0
            ? (
                (stats.auth.logins /
                  (stats.auth.logins + stats.auth.failedLogins)) *
                LIMITS.MAX_PAGE_SIZE
              ).toFixed(1) + "%"
            : "0%",
      });
    } else if (
      stats.auth.failedLogins < this.alerts.failedLogins.threshold &&
      this.alerts.failedLogins.triggered
    ) {
      this.resolveAlert("failedLogins", {
        failedAttempts: stats.auth.failedLogins,
      });
    }
  }

  // Срабатывание алерта
  triggerAlert(type, data) {
    this.alerts[type].triggered = true;

    const alert = {
      type,
      severity: this.getAlertSeverity(type),
      message: this.getAlertMessage(type, data),
      data,
      timestamp: new Date().toISOString(),
      resolved: false,
    };

    this.alertHistory.push(alert);

    // Логирование
    _warn(`🚨 АЛЕРТ: ${alert.message}`, { alert });

    // Отправка уведомления
    this.sendAlertNotification(alert);
  }

  // Разрешение алерта
  resolveAlert(type, data) {
    this.alerts[type].triggered = false;

    const alert = {
      type,
      severity: "info",
      message: `Алерт "${this.getAlertTitle(type)}" разрешен`,
      data,
      timestamp: new Date().toISOString(),
      resolved: true,
    };

    this.alertHistory.push(alert);

    // Логирование
    _info(`✅ Алерт разрешен: ${alert.message}`, { alert });

    // Отправка уведомления о разрешении
    this.sendAlertNotification(alert);
  }

  // Получение серьезности алерта
  getAlertSeverity(type) {
    const severities = {
      highErrorRate: "critical",
      slowResponse: "warning",
      highMemoryUsage: "critical",
      highCPUUsage: "warning",
      failedLogins: "critical",
      databaseErrors: "critical",
    };
    return severities[type] || "info";
  }

  // Получение заголовка алерта
  getAlertTitle(type) {
    const titles = {
      highErrorRate: "Высокий процент ошибок",
      slowResponse: "Медленные ответы",
      highMemoryUsage: "Высокое использование памяти",
      highCPUUsage: "Высокая загрузка CPU",
      failedLogins: "Множественные неудачные попытки входа",
      databaseErrors: "Ошибки базы данных",
    };
    return titles[type] || "Неизвестный алерт";
  }

  // Получение сообщения алерта
  getAlertMessage(type, data) {
    const title = this.getAlertTitle(type);

    switch (type) {
      case "highErrorRate":
        return `${title}: ${data.current} (порог: ${data.threshold})`;
      case "slowResponse":
        return `${title}: ${data.current} (порог: ${data.threshold})`;
      case "highMemoryUsage":
        return `${title}: ${data.current} (порог: ${data.threshold})`;
      case "failedLogins":
        return `${title}: ${data.failedAttempts} попыток (порог: ${data.threshold})`;
      default:
        return `${title}: ${JSON.stringify(data)}`;
    }
  }

  // Отправка уведомления об алерте
  async sendAlertNotification(alert) {
    try {
      const emoji = alert.severity === "critical" ? "🚨" : "⚠️";
      const message = `${emoji} ${alert.message}\n\nВремя: ${new Date(alert.timestamp).toLocaleString("ru-RU")}\nТип: ${this.getAlertTitle(alert.type)}`;

      // Отправка в Telegram (если настроен)
      if (process.env.TELEGRAM_ADMIN_CHAT_ID) {
        await _sendTelegramMessage(process.env.TELEGRAM_ADMIN_CHAT_ID, message);
      }

      // Здесь можно добавить другие каналы уведомлений
      // - Email
      // - Slack
      // - Discord
      // - SMS
    } catch (error) {
      _error("Ошибка отправки уведомления об алерте:", error);
    }
  }

  // Запуск мониторинга
  startMonitoring() {
    setInterval(() => {
      this.checkMetrics();
    }, 60000); // Проверка каждую минуту
  }

  // Получение истории алертов
  getAlertHistory(limit = LIMITS.DEFAULT_PAGE_SIZE) {
    return this.alertHistory.slice(-limit);
  }

  // Получение активных алертов
  getActiveAlerts() {
    return Object.entries(this.alerts)
      .filter(([_, alert]) => alert.triggered)
      .map(([type, alert]) => ({
        type,
        threshold: alert.threshold,
        triggered: alert.triggered,
      }));
  }

  // Парсинг использования памяти
  parseMemoryUsage(memoryString) {
    if (typeof memoryString === "string" && memoryString.includes("MB")) {
      const match = memoryString.match(/(\d+(?:\.\d+)?)/);
      return match ? parseFloat(match[1]) * 1024 * 1024 : 0;
    }
    return 0;
  }

  // Получение общего объема памяти
  getTotalMemory() {
    return 1024 * 1024 * 1024; // 1GB для примера
  }

  // Установка порога алерта
  setAlertThreshold(type, threshold) {
    if (this.alerts[type]) {
      this.alerts[type].threshold = threshold;
      return true;
    }
    return false;
  }

  // Инициализация системы алертов
  init() {
    _info("Система алертов запущена");
    this.startMonitoring();
  }
}

// Создаем единственный экземпляр
const alertSystem = new AlertSystem();

module.exports = { alertSystem };
