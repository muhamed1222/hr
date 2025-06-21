const { error: _error, warn: _warn, info: _info } = require('../utils/logger');
const { LIMITS, TIME_CONSTANTS } = require('../constants');
const { createClient } = require('redis');
const AuditLog = require('../models/AuditLog');
const geoip = require('geoip-lite');
const logger = require('../config/logging');
const { AppError } = require('./errors/AppError');

class SecurityMonitoringService {
  constructor() {
    this.redisClient = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000; // 5 секунд
    this.suspiciousActivities = new Map();
    this.ipBlocklist = new Set();
    this.userBlocklist = new Set();
    this.initRedis();
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
  getKey(type, identifier) {
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

  // Отслеживание попыток CSRF атак
  async trackCSRFAttempt(ip, path) {
    const key = this.getKey('csrf', ip);
    try {
      const attempts = await this.redisClient.incr(key);
      await this.redisClient.expire(key, 3600); // TTL 1 час

      if (attempts >= LIMITS.CSRF_MAX_ATTEMPTS) {
        await this.logSecurityEvent('CSRF_ATTACK_SUSPECTED', {
          ip,
          path,
          attempts,
          status: 'ALERT'
        });
        return true; // Требуется блокировка
      }

      if (attempts >= LIMITS.CSRF_WARNING_THRESHOLD) {
        await this.logSecurityEvent('CSRF_ATTEMPTS_WARNING', {
          ip,
          path,
          attempts,
          status: 'WARNING'
        });
      }

      return false;
    } catch (error) {
      _error('Failed to track CSRF attempt:', error);
      return false;
    }
  }

  // Отслеживание подозрительных IP
  async trackSuspiciousIP(ip, reason) {
    const key = this.getKey('suspicious_ip', ip);
    try {
      const data = await this.redisClient.get(key);
      const suspiciousActivity = data ? JSON.parse(data) : { count: 0, reasons: [] };
      
      suspiciousActivity.count++;
      if (!suspiciousActivity.reasons.includes(reason)) {
        suspiciousActivity.reasons.push(reason);
      }

      await this.redisClient.set(key, JSON.stringify(suspiciousActivity));
      await this.redisClient.expire(key, 86400); // TTL 24 часа

      if (suspiciousActivity.count >= LIMITS.SUSPICIOUS_IP_THRESHOLD) {
        await this.logSecurityEvent('SUSPICIOUS_IP_DETECTED', {
          ip,
          activity: suspiciousActivity,
          status: 'ALERT'
        });
        return true; // IP требует особого внимания
      }

      return false;
    } catch (error) {
      _error('Failed to track suspicious IP:', error);
      return false;
    }
  }

  // Мониторинг аномального поведения пользователя
  async trackUserBehavior(userId, action, data = {}) {
    const key = this.getKey('user_behavior', userId);
    try {
      const userActivity = await this.redisClient.get(key);
      const activities = userActivity ? JSON.parse(userActivity) : [];
      
      activities.push({
        timestamp: Date.now(),
        action,
        ...data
      });

      // Оставляем только последние 100 действий
      if (activities.length > 100) {
        activities.shift();
      }

      await this.redisClient.set(key, JSON.stringify(activities));
      await this.redisClient.expire(key, 86400); // TTL 24 часа

      // Анализ аномалий
      const anomalies = this.detectAnomalies(activities);
      if (anomalies.length > 0) {
        await this.logSecurityEvent('USER_BEHAVIOR_ANOMALY', {
          userId,
          anomalies,
          status: 'WARNING'
        });
        return anomalies;
      }

      return [];
    } catch (error) {
      _error('Failed to track user behavior:', error);
      return [];
    }
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

  // Очистка данных мониторинга
  async clearMonitoringData(type, identifier) {
    const key = this.getKey(type, identifier);
    try {
      await this.redisClient.del(key);
      _info(`Cleared monitoring data for ${type}:${identifier}`);
    } catch (error) {
      _error('Failed to clear monitoring data:', error);
    }
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
}

module.exports = new SecurityMonitoringService(); 