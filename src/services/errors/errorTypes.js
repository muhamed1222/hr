const ErrorTypes = {
  // Ошибки аутентификации
  AUTH: {
    INVALID_CREDENTIALS: 'ERR_AUTH_001',
    TOKEN_EXPIRED: 'ERR_AUTH_002',
    TOKEN_INVALID: 'ERR_AUTH_003',
    USER_NOT_FOUND: 'ERR_AUTH_004',
    INSUFFICIENT_PERMISSIONS: 'ERR_AUTH_005'
  },

  // Ошибки валидации
  VALIDATION: {
    INVALID_INPUT: 'ERR_VAL_001',
    MISSING_FIELD: 'ERR_VAL_002',
    INVALID_FORMAT: 'ERR_VAL_003'
  },

  // Ошибки базы данных
  DATABASE: {
    CONNECTION_ERROR: 'ERR_DB_001',
    QUERY_FAILED: 'ERR_DB_002',
    RECORD_NOT_FOUND: 'ERR_DB_003',
    DUPLICATE_ENTRY: 'ERR_DB_004'
  },

  // Ошибки Telegram
  TELEGRAM: {
    BOT_ERROR: 'ERR_TG_001',
    API_ERROR: 'ERR_TG_002',
    WEBHOOK_ERROR: 'ERR_TG_003'
  },

  // Ошибки файловой системы
  FILE: {
    NOT_FOUND: 'ERR_FILE_001',
    PERMISSION_DENIED: 'ERR_FILE_002',
    INVALID_TYPE: 'ERR_FILE_003'
  },

  // Общие ошибки
  GENERAL: {
    INTERNAL_ERROR: 'ERR_GEN_001',
    NOT_IMPLEMENTED: 'ERR_GEN_002',
    SERVICE_UNAVAILABLE: 'ERR_GEN_003'
  },

  // Ошибки безопасности
  SECURITY: {
    CSRF_TOKEN_MISSING: 'ERR_SEC_001',
    CSRF_TOKEN_INVALID: 'ERR_SEC_002',
    INVALID_SESSION: 'ERR_SEC_003',
    RATE_LIMIT_EXCEEDED: 'ERR_SEC_004',
    INVALID_IP: 'ERR_SEC_005'
  }
};

module.exports = ErrorTypes; 