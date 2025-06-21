"use strict";

const { _info, _warn, _error } = require('../config/logging');
const { LIMITS, TIME_CONSTANTS, MAX_REDIS_RECONNECT_ATTEMPTS, REDIS_RECONNECT_DELAY } = require('../constants');
const { createClient } = require('redis');
const AuditLog = require('../models/AuditLog');
const geoip = require('geoip-lite');
const logger = require('../config/logging');
const { AppError } = require('./errors/AppError');

/**
 * Сервис мониторинга безопасности
 * Временно работает в режиме заглушки
 */
class SecurityMonitoringService {
  constructor() {
    this.memoryStore = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = MAX_REDIS_RECONNECT_ATTEMPTS;
    this.reconnectDelay = REDIS_RECONNECT_DELAY;
    this.suspiciousActivities = new Map();
    this.ipBlocklist = new Set();
    this.userBlocklist = new Set();
  }

  async initRedis() {
    try {
      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });

      this.redisClient.on('error', (error) => {
        _error('Redis error:', error);
        this.handleRedisError();
      });

      await this.redisClient.connect();
      this.reconnectAttempts = 0;
      _info('Redis connected for security monitoring');
    } catch (error) {
      _error('Redis connection failed:', error);
      this.handleRedisError();
    }
  }

  async handleRedisError() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      _warn(`Attempting to reconnect to Redis (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      setTimeout(() => this.initRedis(), this.reconnectDelay);
    } else {
      _error('Max Redis reconnection attempts reached');
    }
  }

  // Генерация ключа для Redis
  generateKey(type, identifier) {
    return `security:${type}:${identifier}`;
  }

  // Логирование события безопасности
  async logSecurityEvent(eventType, data) {
    try {
      await AuditLog.create({
        type: 'SECURITY',
        action: eventType,
        details: data,
        ip: data.ip,
        userId: data.userId,
        status: data.status || 'WARNING'
      });

      _warn('Security event detected:', { eventType, ...data });
    } catch (error) {
      _error('Failed to log security event:', error);
    }
  }

  /**
   * Отслеживание попыток CSRF атак
   * @param {string} ip - IP адрес
   * @param {string} path - Путь запроса
   * @returns {Promise<boolean>} Заблокирован ли IP
   */
  async trackCSRFAttempt(ip, path) {
    return false; // Временно отключено
  }

  /**
   * Отслеживание подозрительных IP
   * @param {string} ip - IP адрес
   * @param {Array<string>} patterns - Подозрительные паттерны
   * @returns {Promise<boolean>} Найдены ли подозрительные паттерны
   */
  async trackSuspiciousIP(ip, patterns) {
    return false; // Временно отключено
  }

  /**
   * Отслеживание попыток брутфорса
   * @param {string} ip - IP адрес
   * @param {string} username - Имя пользователя
   * @returns {Promise<boolean>} Заблокирован ли IP
   */
  async trackBruteforce(ip, username) {
    return false; // Временно отключено
  }

  /**
   * Отслеживание подозрительных запросов
   * @param {string} ip - IP адрес
   * @param {string} method - HTTP метод
   * @param {string} path - Путь запроса
   * @param {Object} headers - Заголовки запроса
   * @returns {Promise<boolean>} Найдены ли подозрительные паттерны
   */
  async trackSuspiciousRequest(ip, method, path, headers) {
    return false; // Временно отключено
  }

  /**
   * Получение статистики безопасности
   * @returns {Promise<Object>} Статистика безопасности
   */
  async getSecurityStats() {
    return {
      blockedIPs: [],
      suspiciousIPs: [],
      bruteforceAttempts: 0,
      csrfAttempts: 0,
      suspiciousRequests: 0,
      activeMonitoring: false
    };
  }

  /**
   * Отслеживание поведения пользователя
   * @param {string} userId - ID пользователя
   * @param {string} action - Действие
   * @param {object} metadata - Метаданные
   * @returns {Promise<Array>} Список аномалий
   */
  async trackUserBehavior(userId, action, metadata = {}) {
    return []; // Временно отключено
  }

  // Расширенный анализ аномалий
  async detectAnomalies(activities) {
    const anomalies = [];
    const last5Minutes = Date.now() - 5 * 60 * 1000;
    const lastHour = Date.now() - TIME_CONSTANTS.HOUR;
    
    // Подсчет действий за последние 5 минут
    const recentActivities = activities.filter(a => a.timestamp >= last5Minutes);
    const hourActivities = activities.filter(a => a.timestamp >= lastHour);
    
    // Проверка на частоту действий
    if (recentActivities.length >= LIMITS.USER_ACTIONS_PER_5_MIN) {
      anomalies.push({
        type: 'HIGH_FREQUENCY',
        count: recentActivities.length,
        timeframe: '5min',
        severity: 'HIGH'
      });
    }

    // Проверка на повторяющиеся действия
    const actionCounts = {};
    recentActivities.forEach(a => {
      actionCounts[a.action] = (actionCounts[a.action] || 0) + 1;
    });

    Object.entries(actionCounts).forEach(([action, count]) => {
      if (count >= LIMITS.REPEATED_ACTION_THRESHOLD) {
        anomalies.push({
          type: 'REPEATED_ACTION',
          action,
          count,
          severity: 'MEDIUM'
        });
      }
    });

    // Проверка географических аномалий
    const locations = new Set();
    const ips = new Set();
    
    hourActivities.forEach(activity => {
      if (activity.ip) {
        ips.add(activity.ip);
        const geo = geoip.lookup(activity.ip);
        if (geo) {
          locations.add(geo.country);
        }
      }
    });

    // Если пользователь использует более 3 разных стран за час
    if (locations.size > 3) {
      anomalies.push({
        type: 'GEOGRAPHIC_ANOMALY',
        locations: Array.from(locations),
        ips: Array.from(ips),
        timeframe: '1hour',
        severity: 'HIGH'
      });
    }

    // Проверка временных паттернов
    const unusualTimes = hourActivities.filter(activity => {
      const hour = new Date(activity.timestamp).getHours();
      return hour >= 23 || hour <= 4; // Активность поздно ночью
    });

    if (unusualTimes.length >= 10) {
      anomalies.push({
        type: 'UNUSUAL_TIME_PATTERN',
        count: unusualTimes.length,
        timeframe: '1hour',
        severity: 'MEDIUM'
      });
    }

    return anomalies;
  }

  /**
   * Очистка данных мониторинга
   */
  async clearMonitoringData() {
    this.memoryStore.clear();
  }

  // Экспорт данных мониторинга
  async exportMonitoringData(startDate, endDate) {
    try {
      const logs = await AuditLog.findAll({
        where: {
          type: 'SECURITY',
          createdAt: {
            $gte: startDate,
            $lte: endDate
          }
        },
        order: [['createdAt', 'DESC']]
      });

      const redisKeys = await this.redisClient.keys('security:*');
      const redisData = {};
      
      for (const key of redisKeys) {
        redisData[key] = await this.redisClient.get(key);
      }

      return {
        timestamp: new Date(),
        period: { startDate, endDate },
        auditLogs: logs,
        redisData,
        summary: {
          totalEvents: logs.length,
          byStatus: logs.reduce((acc, log) => {
            acc[log.status] = (acc[log.status] || 0) + 1;
            return acc;
          }, {}),
          activeMonitoring: redisKeys.length
        }
      };
    } catch (error) {
      _error('Failed to export monitoring data:', error);
      throw error;
    }
  }

  logSecurityEvent(type, data) {
    logger.security.info(`Security Event: ${type}`, data);
  }

  logSecurityWarning(type, data) {
    logger.security.warn(`Security Warning: ${type}`, data);
  }

  logSecurityError(type, data) {
    logger.security.error(`Security Error: ${type}`, data);
  }

  logAuditEvent(type, data) {
    logger.security.audit(`Audit Event: ${type}`, data);
  }

  // Анализ геолокации
  analyzeLocation(ip) {
    const geo = geoip.lookup(ip);
    if (!geo) return null;

    this.logSecurityEvent('location_check', {
      ip,
      country: geo.country,
      region: geo.region,
      city: geo.city
    });

    return geo;
  }

  // Анализ временных паттернов
  analyzeTimePattern(userId, timestamp) {
    const userActivity = this.suspiciousActivities.get(userId) || [];
    const now = timestamp || Date.now();

    // Добавляем новую активность
    userActivity.push(now);

    // Оставляем только активности за последние 24 часа
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const recentActivity = userActivity.filter(time => time > dayAgo);

    this.suspiciousActivities.set(userId, recentActivity);

    // Анализируем частоту
    if (recentActivity.length > 1000) {
      this.logSecurityWarning('high_frequency_activity', {
        userId,
        activityCount: recentActivity.length,
        timespan: '24h'
      });
      return false;
    }

    return true;
  }

  // Обнаружение аномального поведения
  detectAnomalies(req) {
    const { ip, method, path, user } = req;
    const userId = user?.id;

    // Проверка блоклистов
    if (this.ipBlocklist.has(ip)) {
      this.logSecurityError('blocked_ip_attempt', { ip, path });
      throw new AppError('Access denied', 403);
    }

    if (userId && this.userBlocklist.has(userId)) {
      this.logSecurityError('blocked_user_attempt', { userId, ip, path });
      throw new AppError('Access denied', 403);
    }

    // Анализ геолокации
    const geo = this.analyzeLocation(ip);
    
    // Анализ временных паттернов
    const timePatternOk = this.analyzeTimePattern(userId || ip);
    
    if (!timePatternOk) {
      this.logSecurityWarning('suspicious_activity', {
        userId,
        ip,
        geo,
        method,
        path
      });
    }

    // Логируем для аудита
    this.logAuditEvent('request', {
      userId,
      ip,
      method,
      path,
      geo,
      timestamp: new Date().toISOString()
    });
  }

  // Блокировка IP
  blockIp(ip, reason) {
    this.ipBlocklist.add(ip);
    this.logSecurityWarning('ip_blocked', { ip, reason });
  }

  // Блокировка пользователя
  blockUser(userId, reason) {
    this.userBlocklist.add(userId);
    this.logSecurityWarning('user_blocked', { userId, reason });
  }

  async monitorLoginAttempts(ip) {
    // Временно отключаем мониторинг
    return false;
  }

  async recordSuspiciousActivity(ip, type, details) {
    // Временно отключаем запись
    return;
  }

  async getSuspiciousActivity(ip) {
    // Временно возвращаем пустой объект
    return {};
  }
}

module.exports = new SecurityMonitoringService(); 