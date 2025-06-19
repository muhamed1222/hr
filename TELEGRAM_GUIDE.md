# 🤖 Telegram Уведомления - Руководство

## ✅ Что реализовано

### 1. Система уведомлений
- 📝 **Уведомления об изменении рабочих логов** - сотрудники получают сообщения при редактировании их данных менеджером
- 📊 **Уведомления о экспорте отчётов** - менеджеры получают подтверждения о создании Excel/PDF отчётов
- 🧪 **Тестовые сообщения** - для проверки работоспособности системы

### 2. API Endpoints
- `POST /api/telegram/test` - отправка тестового сообщения
- `POST /api/telegram/send` - отправка произвольного сообщения  
- `GET /api/telegram/bot-info` - информация о боте

### 3. Интеграция в систему
- ✅ При редактировании логов через админ-панель автоматически отправляются уведомления
- ✅ При экспорте отчётов менеджеры получают подтверждения
- ✅ Безопасная обработка ошибок - сбои Telegram не влияют на основную работу

## 🚀 Как использовать

### Шаг 1: Получить свой chat_id

1. Найдите бота `@hr_oc_bot` в Telegram
2. Напишите боту `/start`
3. Откройте в браузере: https://api.telegram.org/bot7825920966:AAGBim6tbpeGnwocHi5a2YUm3QrdnhKzzBA/getUpdates
4. В ответе найдите ваш `chat_id`:

```json
{
  "result": [
    {
      "message": {
        "chat": {
          "id": 123456789  ← ваш chat_id
        }
      }
    }
  ]
}
```

### Шаг 2: Протестировать уведомления

```bash
# Тестовое сообщение
node test-telegram.js YOUR_CHAT_ID

# Или через API
curl -X POST http://localhost:3000/api/telegram/test \
  -H "Content-Type: application/json" \
  -d '{"chatId": "YOUR_CHAT_ID"}'
```

### Шаг 3: Добавить chat_id в базу данных

```sql
-- Для сотрудника
UPDATE users SET telegram_id = 'YOUR_CHAT_ID' WHERE username = 'employee_username';

-- Для менеджера  
UPDATE users SET telegram_id = 'YOUR_CHAT_ID' WHERE username = 'admin';
```

## 📋 Примеры уведомлений

### Уведомление о редактировании лога
```
📝 Ваш рабочий день отредактирован

🗓 Дата: 2024-12-19
👤 Менеджер: Администратор

Изменения:
• Время прихода: 09:30:00
• Время ухода: 18:00:00
• Отчёт о работе: Завершил проект

ℹ️ Проверьте обновленную информацию в системе.
```

### Уведомление об экспорте отчёта
```
📊 Отчёт сгенерирован

📈 Тип: Excel отчёт
🗓 Период: 2024-12-10 - 2024-12-19
⏰ Время: 19.12.2024, 15:30:25

✅ Файл готов к скачиванию в админ-панели.
```

## ⚙️ Технические детали

### Конфигурация (.env)
```env
TELEGRAM_BOT_TOKEN=7825920966:AAGBim6tbpeGnwocHi5a2YUm3QrdnhKzzBA
```

### Основная утилита
```javascript
// src/utils/sendTelegramMessage.js
await notifyWorkLogEdited(userTelegramId, workDate, managerName, changes);
await notifyReportExported(managerTelegramId, reportType, period);
```

### Интеграция в маршруты
- `src/routes/workLogs.js` - уведомления при PATCH запросах
- `src/routes/reports.js` - уведомления при экспорте отчётов

## 🔐 Безопасность

- ✅ Токен хранится в переменных окружения
- ✅ Graceful error handling - ошибки Telegram не ломают основную систему
- ✅ Проверка наличия токена перед отправкой
- ✅ Timeout 10 секунд для HTTP запросов

## 🧪 Тестирование

```bash
# Запуск тестового скрипта
node test-telegram.js

# Проверка информации о боте
curl http://localhost:3000/api/telegram/bot-info

# Отправка тестового сообщения
curl -X POST http://localhost:3000/api/telegram/test \
  -H "Content-Type: application/json" \
  -d '{"chatId": "YOUR_CHAT_ID"}'
```

## 🎯 Следующие шаги

1. **Получите ваш chat_id** используя инструкции выше
2. **Обновите базу данных** с вашим telegram_id  
3. **Протестируйте** - отредактируйте любой лог в админ-панели
4. **Проверьте** - должно прийти уведомление в Telegram

---

**Статус**: ✅ Полностью функционально  
**Версия**: 1.0  
**Дата**: 19.12.2024 