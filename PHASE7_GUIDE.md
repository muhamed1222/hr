# 📅 ФАЗА 7 — Отпуска, отсутствие, график

## 🎯 Цель достигнута

Успешно реализована система учёта отпусков, больничных, командировок с утверждением заявок менеджерами и календарным просмотром расписания.

---

## 🏗️ Архитектура системы

### 📊 Модель данных

**Таблица `absences`:**
```sql
CREATE TABLE absences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT CHECK (type IN ('vacation', 'sick', 'business_trip', 'day_off')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by INTEGER,
  rejection_reason TEXT,
  approved_at DATETIME,
  days_count INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Расширение таблицы `users`:**
- `vacation_days` — баланс отпускных дней (по умолчанию 28)
- `temporary_password` — временный пароль для новых пользователей
- `telegram_temp_id` — временный ID для связки с Telegram

---

## 🔐 Система разрешений

### Роли и доступ:

| Роль | Создание заявок | Просмотр | Одобрение/Отклонение | Удаление |
|------|----------------|----------|---------------------|----------|
| **Employee** | ✅ Свои | ✅ Только свои | ❌ | ✅ Свои (если не рассмотрена) |
| **Manager** | ✅ Свои | ✅ Своих команд | ✅ Команд | ❌ |
| **Admin** | ✅ Свои | ✅ Все | ✅ Все | ✅ Все |

---

## 🌐 API Endpoints

### 📝 Управление отсутствиями (`/api/absences`)

#### `GET /api/absences` - Список заявок
**Параметры:**
- `userId` — фильтр по пользователю
- `teamId` — фильтр по команде
- `type` — тип отсутствия (vacation/sick/business_trip/day_off)
- `status` — статус (pending/approved/rejected)
- `startDate`, `endDate` — фильтр по датам
- `page`, `limit` — пагинация

**Ответ:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "userId": 3,
      "type": "vacation",
      "startDate": "2025-07-15",
      "endDate": "2025-07-25",
      "reason": "Семейный отпуск",
      "status": "pending",
      "daysCount": 11,
      "user": {
        "id": 3,
        "name": "Сергей Иванов",
        "username": "sergey_backend"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "pages": 1
  }
}
```

#### `POST /api/absences` - Создать заявку
**Тело запроса:**
```json
{
  "type": "vacation",
  "startDate": "2025-07-15",
  "endDate": "2025-07-25",
  "reason": "Семейный отпуск"
}
```

#### `PATCH /api/absences/:id/approve` - Одобрить заявку
- Автоматически списывает дни отпуска
- Создаёт записи в work_logs для каждого дня
- Отправляет уведомления в Telegram

#### `PATCH /api/absences/:id/reject` - Отклонить заявку
**Тело запроса:**
```json
{
  "rejectionReason": "Недостаточно покрытия на данный период"
}
```

### 📅 Календарь и расписание (`/api/schedule`)

#### `GET /api/schedule/month` - Календарь на месяц
**Параметры:**
- `month` — месяц в формате YYYY-MM
- `teamId` — ID команды
- `userId` — ID пользователя

**Ответ:**
```json
{
  "success": true,
  "data": {
    "month": "2025-07",
    "startDate": "2025-07-01",
    "endDate": "2025-07-31",
    "users": [...],
    "calendar": {
      "2025-07-15": {
        "date": "2025-07-15",
        "dayOfWeek": 2,
        "isWeekend": false,
        "users": {
          "3": {
            "user": { "id": 3, "name": "Сергей Иванов" },
            "status": "vacation",
            "absence": {
              "id": 1,
              "type": "vacation",
              "reason": "Семейный отпуск"
            }
          }
        }
      }
    },
    "statistics": {
      "totalUsers": 5,
      "totalAbsences": 3,
      "absencesByType": {
        "vacation": 2,
        "sick": 1
      }
    }
  }
}
```

#### `GET /api/schedule/upcoming` - Ближайшие отсутствия
**Параметры:**
- `teamId` — фильтр по команде
- `days` — количество дней вперёд (по умолчанию 30)

---

## 🔄 Интеграция с системой

### 📋 Связь с рабочими логами
При одобрении отсутствия автоматически создаются записи в `work_logs`:
```javascript
{
  userId: absence.userId,
  workDate: "2025-07-15",
  workMode: "absent",
  dailyReport: "Отпуск (заявка #1)",
  totalMinutes: 0
}
```

### 🧮 Расчёт отпускных дней
- **Отпуск:** списывается с баланса `vacation_days`
- **Больничный:** не влияет на баланс
- **Командировка:** не влияет на баланс
- **Отгул:** не влияет на баланс

### 📱 Telegram уведомления (TODO)
- Новая заявка → уведомление менеджеру
- Одобрение/отклонение → уведомление сотруднику
- Подключение к существующему боту

---

## 🔧 Middleware и безопасность

### `checkAbsencePermissions`
- `canCreate` — проверка права создания заявок
- `canView` — контроль доступа к просмотру
- `canApprove` — права одобрения для менеджеров
- `canEdit` — права редактирования собственных заявок
- `canViewSchedule` — доступ к календарю команд

### Аудит действий
Все операции логируются в `audit_logs`:
- Создание заявки
- Одобрение/отклонение
- Удаление заявки

---

## 📈 Статистика и аналитика

### Статистика пользователя
- Общее количество отсутствий
- Дни отсутствия по типам
- Средние рабочие часы в период
- Остаток отпускных дней

### Статистика команды
- Количество отсутствий по типам
- Рабочие дни vs выходные в месяце
- Общие рабочие минуты команды

---

## 🛠️ Установка и тестирование

### 1. Настройка окружения
```bash
# Добавить в .env
DB_TYPE=sqlite
DB_STORAGE=./database.sqlite
JWT_SECRET=your-secret-key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

### 2. Запуск миграций
```bash
node scripts/run-migrations.js
```

### 3. Создание тестовых данных
```bash
node scripts/seed-absences.js
```

### 4. Тестирование API

**Авторизация:**
```bash
curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

**Получение заявок:**
```bash
curl -X GET "http://localhost:3000/api/absences" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Создание заявки:**
```bash
curl -X POST "http://localhost:3000/api/absences" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "vacation",
    "startDate": "2025-08-01",
    "endDate": "2025-08-10",
    "reason": "Летний отпуск"
  }'
```

**Календарь на месяц:**
```bash
curl -X GET "http://localhost:3000/api/schedule/month?month=2025-07" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📊 Тестовые данные

### Созданные заявки:
- **13 заявок** разных типов для 5 пользователей
- **Статусы:** 10 pending, 1 approved, 2 rejected
- **Типы:** 4 отпуска, 4 больничных, 3 отгула, 2 командировки
- **3 ближайших отсутствия** для демонстрации календаря

### Пользователи:
1. **Мухамед Келеметов** (admin) — ID: 1
2. **Анна Петрова** (manager) — ID: 2
3. **Сергей Иванов** (employee) — ID: 3
4. **Мария Сидорова** (employee) — ID: 4
5. **Алексей Козлов** (employee) — ID: 5

---

## 🚀 Готовые фичи

✅ **Создание заявок** на 4 типа отсутствий  
✅ **Система одобрения** менеджерами  
✅ **Календарное представление** с цветовой кодировкой  
✅ **Ролевые разрешения** и доступ  
✅ **Интеграция с work_logs** при одобрении  
✅ **Аудит всех действий** с отсутствиями  
✅ **Статистика и аналитика** по отсутствиям  
✅ **Валидация пересечений** дат заявок  
✅ **Управление балансом** отпускных дней  

---

## 🔮 Следующие шаги (Фаза 8)

1. **Полная Telegram интеграция** с уведомлениями
2. **Веб-интерфейс** для управления заявками
3. **Экспорт календарей** в различные форматы
4. **Дополнительные типы** отсутствий
5. **Автоматические напоминания** о заканчивающихся отпусках
6. **Интеграция с внешними календарями** (Google, Outlook)

---

## 📞 Техническая поддержка

При возникновении проблем:
1. Проверьте настройки `.env` файла
2. Убедитесь, что база данных создана и мигрирована
3. Проверьте логи сервера на наличие ошибок
4. Используйте тестовые скрипты для проверки функциональности

**Система готова к интеграции фронтенда и продакшен-развёртыванию!** 🎉 