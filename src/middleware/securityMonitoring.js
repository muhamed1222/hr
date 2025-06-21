const SecurityMonitoringService = require('../services/SecurityMonitoringService');
const { error: _error } = require('../utils/logger');
const AppError = require('../services/errors/AppError');
const ErrorTypes = require('../services/errors/errorTypes');
const { LIMITS, SECURITY_EVENT_TYPES } = require('../constants');
const path = require('path');

// Получение IP адреса из запроса
const getClientIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
         req.headers['x-real-ip'] ||
         req.connection.remoteAddress;
};

// Middleware для мониторинга CSRF
const monitorCSRF = async (req, res, next) => {
  try {
    const ip = getClientIP(req);
    const isBlocked = await SecurityMonitoringService.trackCSRFAttempt(ip, req.path);
    
    if (isBlocked) {
      return next(new AppError('Too many CSRF violations', 403, ErrorTypes.SECURITY.CSRF_VIOLATION_LIMIT));
    }
    next();
  } catch (error) {
    _error('CSRF monitoring error:', error);
    next(error);
  }
};

// Middleware для мониторинга подозрительной активности
const monitorSuspiciousActivity = async (req, res, next) => {
  try {
    const ip = getClientIP(req);
    const userId = req.user?.id;
    
    // Проверяем подозрительные паттерны в запросе
    const suspiciousPatterns = await detectSuspiciousPatterns(req);
    if (suspiciousPatterns.length > 0) {
      await SecurityMonitoringService.trackSuspiciousIP(ip, suspiciousPatterns);
    }

    // Отслеживаем поведение пользователя
    if (userId) {
      const anomalies = await SecurityMonitoringService.trackUserBehavior(userId, req.method + ' ' + req.path, {
        ip,
        userAgent: req.headers['user-agent'],
        referer: req.headers.referer
      });

      // Если обнаружены серьезные аномалии, блокируем запрос
      if (anomalies.some(a => a.severity === 'HIGH' || a.severity === 'CRITICAL')) {
        return next(new AppError('Suspicious activity detected', 403, ErrorTypes.SECURITY.SUSPICIOUS_ACTIVITY));
      }
    }

    next();
  } catch (error) {
    _error('Security monitoring error:', error);
    next(error);
  }
};

// Функция для определения подозрительных паттернов
const detectSuspiciousPatterns = async (req) => {
  const patterns = [];

  // Проверка на SQL инъекции
  const sqlInjectionPattern = /(\b(select|insert|update|delete|drop|union|exec|declare)\b)|(['"];)/i;
  if (sqlInjectionPattern.test(JSON.stringify(req.body)) || 
      sqlInjectionPattern.test(JSON.stringify(req.query))) {
    patterns.push(SECURITY_EVENT_TYPES.SQL_INJECTION_ATTEMPT);
  }

  // Проверка на XSS
  const xssPattern = /(<script|javascript:|data:text\/html|vbscript:|onload=|onerror=)/i;
  if (xssPattern.test(JSON.stringify(req.body)) || 
      xssPattern.test(JSON.stringify(req.query))) {
    patterns.push(SECURITY_EVENT_TYPES.XSS_ATTEMPT);
  }

  // Проверка на подозрительные заголовки
  const suspiciousHeaders = [
    'x-forwarded-host',
    'x-remote-host',
    'x-originating-ip',
    'x-remote-addr'
  ];

  if (suspiciousHeaders.some(header => req.headers[header])) {
    patterns.push(SECURITY_EVENT_TYPES.SUSPICIOUS_HEADERS);
  }

  // Проверка на аномальный размер запроса
  if (req.headers['content-length'] > LIMITS.MAX_PAYLOAD_SIZE) {
    patterns.push(SECURITY_EVENT_TYPES.LARGE_PAYLOAD);
  }

  // Проверка на Path Traversal
  const pathTraversalPattern = /(?:\.{2}[/\\])+/;
  const urlPath = req.path || '';
  const queryString = JSON.stringify(req.query);
  const bodyString = JSON.stringify(req.body);

  if (pathTraversalPattern.test(urlPath) || 
      pathTraversalPattern.test(queryString) ||
      pathTraversalPattern.test(bodyString)) {
    patterns.push('PATH_TRAVERSAL_ATTEMPT');
  }

  // Проверка на NoSQL инъекции
  const noSqlPattern = /\$(?:ne|gt|lt|gte|lte|in|nin|not|or|and|regex|where|elemMatch|exists|type|mod|all|size|within|box|center|centerSphere)/i;
  if (noSqlPattern.test(JSON.stringify(req.body)) || 
      noSqlPattern.test(JSON.stringify(req.query))) {
    patterns.push('NOSQL_INJECTION_ATTEMPT');
  }

  // Проверка на подозрительные расширения файлов
  if (req.files || req.file) {
    const files = req.files || [req.file];
    const suspiciousExtensions = ['.php', '.asp', '.aspx', '.jsp', '.cgi', '.exe', '.bat', '.cmd', '.sh', '.dll'];
    
    for (const file of files) {
      const ext = path.extname(file.originalname).toLowerCase();
      if (suspiciousExtensions.includes(ext)) {
        patterns.push('SUSPICIOUS_FILE_UPLOAD');
        break;
      }
    }
  }

  // Проверка на подозрительные User-Agent
  const suspiciousUserAgents = [
    /curl/i,
    /wget/i,
    /postman/i,
    /insomnia/i,
    /python-requests/i,
    /go-http-client/i,
    /burp/i,
    /sqlmap/i
  ];

  const userAgent = req.headers['user-agent'] || '';
  if (suspiciousUserAgents.some(pattern => pattern.test(userAgent))) {
    patterns.push('SUSPICIOUS_USER_AGENT');
  }

  return patterns;
};

module.exports = {
  monitorCSRF,
  monitorSuspiciousActivity
}; 