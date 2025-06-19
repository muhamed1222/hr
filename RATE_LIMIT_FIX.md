# 🔧 Исправление проблемы Rate Limiting

## ❌ Проблема
При тестировании в браузере появляются ошибки:
```
Failed to load resource: the server responded with a status of 429 (Too Many Requests)
```

## 🔍 Причина
Rate limiting настроен очень строго для production:
- **Только 5 попыток входа за 15 минут** на `/api/auth/login`
- Это хорошо для безопасности, но мешает разработке и тестированию

## ✅ Решение

### 1. Обновлены настройки в `src/routes/auth.js`
```javascript
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: process.env.NODE_ENV === 'production' ? 5 : 50, // 5 для production, 50 для разработки
  message: {
    success: false,
    message: 'Слишком много попыток входа. Попробуйте через 15 минут.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
```

### 2. Умные лимиты по окружению:
- **Production:** 5 попыток за 15 минут (безопасно)
- **Development:** 50 попыток за 15 минут (удобно для тестирования)

### 3. Перезапуск сервера
После изменений нужно перезапустить backend:
```bash
# Остановить текущий процесс
pkill -f "node src/app.js"

# Запустить заново
npm start
```

## 🧪 Проверка исправления

### Тест в консоли браузера:
```javascript
// Проверьте что больше нет ошибок 429
fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'test', password: 'test' })
}).then(r => console.log('Status:', r.status))
```

### Health check:
```bash
curl http://localhost:3000/health
# Должен вернуть: {"status": "OK", "environment": "development"}
```

## 🎯 Для production

В production окружении установите:
```bash
export NODE_ENV=production
```

Это автоматически активирует строгие лимиты (5 попыток за 15 минут).

## 📊 Другие лимиты в системе

### Общий API лимитер (src/app.js):
```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100 // 100 запросов с одного IP
});
```

### Telegram Bot лимиты:
- Встроенные лимиты Telegram API
- Обычно не требуют настройки

## 🔄 Мониторинг лимитов

Логи сервера покажут превышение лимитов:
```bash
# Смотрите логи в реальном времени
tail -f logs/access.log
```

## 💡 Дополнительные улучшения

### Для полного отключения лимитов в dev:
```javascript
const loginLimiter = process.env.NODE_ENV === 'production' 
  ? rateLimit({ windowMs: 15 * 60 * 1000, max: 5 })
  : (req, res, next) => next(); // Пропускаем в dev
```

### Белый список IP для разработки:
```javascript
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 50,
  skip: (req) => {
    // Пропускаем localhost в development
    return process.env.NODE_ENV === 'development' && 
           (req.ip === '127.0.0.1' || req.ip === '::1');
  }
});
``` 