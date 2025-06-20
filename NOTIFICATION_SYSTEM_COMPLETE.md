# 🔔 СИСТЕМА УВЕДОМЛЕНИЙ И НАПОМИНАНИЙ TimeBot v4.0

## 🧠 Назначение

Сделать TimeBot **проактивным** помощником, который не ждёт действий от пользователя, а сам напоминает и направляет. Это позволяет повысить дисциплину, снизить пропуски и освободить менеджеров от микроконтроля.

## 🏗️ Архитектурная схема

```
┌──────────────┐    emitEvent()    ┌──────────────┐
│  Cron Jobs   │ ───────────────→  │ EventEmitter │
└──────────────┘                   └────┬─────────┘
┌──────────────┐    emitEvent()         │
│  API Actions │ ───────────────────────┘
└──────────────┘                        ▼
                                ┌────────────────────┐
                                │ NotificationHandler│
                                └────┬───────────────┘
                                     ▼
                            ┌────────────────────────────┐
                            │ Telegram Message + DeepLink│
                            └────────────────────────────┘
```

## 🕐 ФАЗА 6.2: Интеллектуальные напоминания и события

### ✅ 1. Cron-напоминания (по времени)

**Реализация:** `src/cron/scheduler.js` через `node-cron`

| Время | Цель напоминания              | Получатели                         | Функция |
|-------|-------------------------------|------------------------------------| --------|
| 09:50 | Кто не отметил приход         | Все, у кого `arrivedAt = null`     | `getUsersForMorningReminder()` |
| 14:00 | Напомнить начать обед         | Кто на работе, но не начал обед    | `getUsersForLunchStartReminder()` |
| 15:00 | Напомнить завершить обед      | Кто начал, но не завершил обед     | `getUsersForLunchEndReminder()` |
| 17:50 | Напомнить сдать дневной отчёт | Все, кто не отправил `dailyReport` | `getUsersForEveningReminder()` |
| 18:30 | Сводка для менеджеров         | Все пользователи с ролью `manager`  | `sendManagerDailyStats()` |

**Гибкость управления через `.env`:**
```env
REMINDERS_ENABLED=true
MORNING_REMINDER_TIME=09:50
LUNCH_START_REMINDER_TIME=14:00
LUNCH_END_REMINDER_TIME=15:00
EVENING_REMINDER_TIME=17:50
MANAGER_STATS_TIME=18:30
```

**Логика определения получателей (`src/cron/reminderService.js`):**
```javascript
// Кто не отметил приход
async function getUsersForMorningReminder() {
  const today = new Date().toISOString().split('T')[0]
  return await User.findAll({
    include: [{
      model: WorkLog,
      where: { 
        workDate: today,
        arrivedAt: null,
        status: 'active'
      },
      required: false
    }],
    where: { 
      telegramId: { [Op.not]: null },
      status: 'active',
      role: ['employee', 'manager']
    }
  })
}
```

### 🚨 2. Push-уведомления (событийная модель)

**Механизм:** `src/events/eventEmitter.js`  
**Обработчики:** `src/notifications/`

#### Принцип работы:
1. **Триггер** - Сервер генерирует событие (например, `worklog.missed`)
2. **Эмиттер** - `emitEvent()` оповещает нужный обработчик
3. **Обработчик** - Отправляет кастомное уведомление через Telegram
4. **Доставка** - Уведомление с контекстом и действиями

#### Поддерживаемые события:

| Событие | Триггер | Обработчик | Получатели |
|---------|---------|------------|------------|
| `user.created` | Новый пользователь зарегистрирован | `notifyNewUser.js` | Админы + менеджеры |
| `worklog.missed` | Не было отметки/отчёта | `notifyMissedWorklog.js` | Конкретный сотрудник |
| `team.stats.ready` | Сформирована командная сводка | `notifyTeamStats.js` | Менеджеры команды |
| `worklog.edited` | Админ отредактировал лог | `notifyLogEdited.js` | Сотрудник + его менеджер |
| `user.promoted` | Изменена роль пользователя | `notifyUserPromoted.js` | Сам пользователь |

**Пример использования:**
```javascript
// В контроллере при создании пользователя
const newUser = await User.create(userData)
emitEvent('user.created', {
  user: newUser,
  createdBy: req.user.id,
  timestamp: new Date()
})
```

### 💬 3. Умные уведомления с действиями

**Все уведомления включают:**
- ✅ **Markdown форматирование** для читаемости
- 🔗 **Inline-кнопки** с deep links (прямое открытие админки/бота)
- 💡 **Контекст** - имя, дата, причины, призыв к действию
- 🎯 **Персонализация** под роль пользователя

**Пример утреннего напоминания:**
```javascript
const message = `🕒 *Доброе утро, ${user.name}!*

Вы забыли отметить приход на работу сегодня.
Пожалуйста, укажите ваш статус до 10:30.

_Дата: ${today}_`

const keyboard = {
  inline_keyboard: [[
    { text: '✅ Пришёл в офис', callback_data: 'work_office' },
    { text: '🏠 Работаю удалённо', callback_data: 'work_remote' }
  ]]
}
```

**Пример уведомления менеджера:**
```javascript
const statsMessage = `📊 *Сводка команды на ${date}*

👥 Всего сотрудников: ${totalEmployees}
✅ Присутствует: ${presentEmployees}
❌ Отсутствует: ${absentEmployees}
📝 Отчёты сданы: ${reportsSubmitted}/${totalEmployees}

⏱️ Среднее время работы: ${averageWorkHours}ч`

const keyboard = {
  inline_keyboard: [[
    { text: '📋 Открыть админку', url: `${webAppUrl}/dashboard` },
    { text: '📊 Аналитика', url: `${webAppUrl}/analytics` }
  ]]
}
```

### 🔐 4. Безопасность и совместимость

#### Проверки безопасности:
- ✅ Уведомления отправляются **только пользователям с валидным telegramId**
- ✅ Проверка статуса пользователя (`active`) перед отправкой
- ✅ Rate limiting для предотвращения спама
- ✅ Обработка ошибок API Telegram

#### Совместимость и fallback:
- ✅ Обработчики событий изолированы (можно масштабировать)
- ✅ Старая логика (прямая отправка) поддерживается для fallback
- ✅ Graceful degradation при недоступности Telegram API
- ✅ Логирование всех уведомлений для аудита

### 📈 5. Статистика и мониторинг

**API эндпоинт:** `/api/reminders/stats`

**Предоставляет:**
```json
{
  "general": {
    "totalUsers": 45,
    "activeUsers": 42,
    "usersWithTelegram": 38,
    "dailyNotificationsSent": 156
  },
  "reminders": {
    "morning": { "count": 3, "users": [...] },
    "lunchStart": { "count": 8, "users": [...] },
    "lunchEnd": { "count": 5, "users": [...] },
    "evening": { "count": 12, "users": [...] }
  },
  "events": {
    "user.created": 2,
    "worklog.missed": 5,
    "team.stats.ready": 3
  }
}
```

## 🧩 Компоненты системы

### Core файлы:
- `src/cron/scheduler.js` - Планировщик cron задач
- `src/cron/reminderService.js` - Логика определения получателей
- `src/events/eventEmitter.js` - Event-driven архитектура
- `src/utils/reminderMessages.js` - Генерация сообщений
- `src/utils/sendTelegramMessage.js` - Отправка в Telegram

### Обработчики уведомлений:
- `src/notifications/notifyNewUser.js`
- `src/notifications/notifyMissedWorklog.js`
- `src/notifications/notifyTeamStats.js`
- `src/notifications/notifyLogEdited.js`
- `src/notifications/notifyUserPromoted.js`

### API роуты:
- `src/routes/reminders.js` - Управление напоминаниями
- `src/routes/test-events.js` - Тестирование событий

## 🎯 Преимущества решения

### Для сотрудников:
- ✅ **Проактивные напоминания** - не забудут отметиться
- ✅ **Контекстные действия** - быстрые кнопки для ответа
- ✅ **Персонализация** - сообщения учитывают роль и статус

### Для менеджеров:
- ✅ **Автоматические сводки** - ежедневная статистика команды
- ✅ **Уведомления о проблемах** - пропуски и нарушения
- ✅ **Deep links** - прямые переходы к нужным данным

### Для администраторов:
- ✅ **Гибкая настройка** - управление через .env
- ✅ **Мониторинг системы** - статистика уведомлений
- ✅ **Событийная архитектура** - легко добавлять новые типы

### Для разработчиков:
- ✅ **Модульность** - каждый обработчик независим
- ✅ **Расширяемость** - простое добавление новых событий
- ✅ **Тестируемость** - изолированные компоненты
- ✅ **Отказоустойчивость** - fallback механизмы

## ✅ ГОТОВНОСТЬ МОДУЛЯ

| Компонент | Статус | Комментарий |
|-----------|---------|-------------|
| Утренние напоминания | ✅ | Работают по cron 09:50 |
| Обеденные напоминания | ✅ | 14:00 начало, 15:00 конец |
| Вечерние напоминания | ✅ | 17:50 daily reports |
| Сводки менеджерам | ✅ | 18:30 ежедневно |
| Push-события | ✅ | 5 событий, 5 обработчиков |
| Deep Linking | ✅ | Во всех уведомлениях |
| Telegram-интеграция | ✅ | Персонализированные сообщения |
| Настройка через .env | ✅ | Гибкий контроль |
| API мониторинга | ✅ | `/api/reminders/stats` |
| Error handling | ✅ | Graceful degradation |

## 🔚 ИТОГ

**Система уведомлений TimeBot v4.0** — это **продвинутая и гибкая** система взаимодействия с пользователем, сочетающая:

- 🕐 **Cron-задачи** для регулярных напоминаний
- 🚨 **Event-driven архитектуру** для push-уведомлений  
- 🔗 **Telegram-интеграцию** с deep links
- 🎯 **UX-ориентированные сценарии** с контекстом и действиями

Это не просто бот — это **цифровой координатор**, который сам напоминает, проверяет и направляет. Уровень корпоративных решений вроде Microsoft Teams + Jira Reminders.

---

*Документация создана: 2024*  
*Система уведомлений: Production Ready ✅*  
*TimeBot v4.0: Complete Enterprise Solution 🚀* 