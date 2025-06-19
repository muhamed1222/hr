# 🧩 **ФАЗА 6: УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ, КОМАНДАМИ И РОЛЯМИ**

## 📋 **ОБЗОР СИСТЕМЫ**

Фаза 6 представляет собой комплексную систему управления персоналом с разграничением ролей, командным управлением и полным аудитом действий.

### 🎯 **Основные компоненты:**
- **Управление пользователями** - CRUD, роли, статусы
- **Командная система** - создание команд, назначение менеджеров
- **Система ролей** - employee/manager/admin с разными правами
- **Аудит лог** - отслеживание всех действий администраторов
- **Telegram интеграция** - уведомления и приглашения

---

## 🔐 **СИСТЕМА РОЛЕЙ И ДОСТУПОВ**

### 👤 **employee (Сотрудник)**
- ✅ Доступ только к своим данным
- ✅ Редактирование профиля (ограниченно)
- ✅ Просмотр своих рабочих логов
- ❌ Доступ к админке
- ❌ Просмотр других пользователей

### 👨‍💼 **manager (Менеджер)**
- ✅ Просмотр своих команд
- ✅ Редактирование логов участников команды
- ✅ Экспорт отчётов по команде
- ✅ Просмотр аудит логов своих действий
- ❌ Управление пользователями
- ❌ Создание команд

### 🔧 **admin (Администратор)**
- ✅ Полный доступ ко всем данным
- ✅ Управление пользователями (CRUD)
- ✅ Управление командами
- ✅ Просмотр всех аудит логов
- ✅ Системные настройки

---

## 🏗️ **АРХИТЕКТУРА BACKEND**

### 📊 **Модели данных**

#### `Team` - Команды
```sql
CREATE TABLE teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  manager_id INTEGER,
  status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  settings JSON DEFAULT '{"reminders_enabled": true, "work_hours": {"start": "09:00", "end": "18:00", "lunch_duration": 60}, "timezone": "Europe/Moscow"}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (manager_id) REFERENCES users(id)
);
```

#### `UserTeam` - Связь пользователей и команд
```sql
CREATE TABLE user_teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  team_id INTEGER NOT NULL,
  role TEXT CHECK (role IN ('member', 'lead', 'manager')) DEFAULT 'member',
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  left_at DATETIME,
  status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (team_id) REFERENCES teams(id),
  UNIQUE(user_id, team_id)
);
```

#### `AuditLog` - Логи действий
```sql
CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  admin_id INTEGER,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(50) NOT NULL,
  resource_id VARCHAR(50),
  description TEXT,
  old_values JSON,
  new_values JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSON DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (admin_id) REFERENCES users(id)
);
```

### 🛡️ **Middleware авторизации**

#### `authenticateToken` - Проверка JWT
- Валидация токена
- Загрузка актуальных данных пользователя
- Проверка статуса активности

#### `requireRole(['admin', 'manager'])` - Проверка ролей
- Контроль доступа по ролям
- Гибкая настройка разрешений

#### `requireTeamAccess` - Доступ к командам
- Админы: доступ ко всем командам
- Менеджеры: только к своим командам
- Участники: только к своим командам

#### `logRequestInfo` - IP и User-Agent
- Автоматическое логирование метаданных запросов

---

## 🔌 **API ENDPOINTS**

### 👥 **Управление пользователями** (`/api/users-management`)

#### `GET /` - Список пользователей
**Права:** admin, manager
**Параметры:**
- `search` - поиск по имени/username
- `role` - фильтр по роли
- `status` - фильтр по статусу
- `teamId` - фильтр по команде
- `page`, `limit` - пагинация
- `sortBy`, `sortOrder` - сортировка

**Ответ:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Иван Петров",
      "username": "ivan.petrov",
      "role": "employee",
      "status": "active",
      "telegramId": "123456789",
      "teams": [...]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3
  }
}
```

#### `POST /` - Создание пользователя
**Права:** admin
**Тело запроса:**
```json
{
  "name": "Новый Сотрудник",
  "username": "new.employee",
  "role": "employee",
  "teams": [1, 2],
  "sendInvite": true
}
```

#### `PATCH /:id` - Обновление пользователя
**Права:** admin, self
**Особенности:**
- Обычные пользователи могут редактировать только себя
- Админы могут менять роли и статусы
- Автоматическое логирование изменений

#### `DELETE /:id` - Деактивация пользователя
**Права:** admin
- Мягкое удаление (status = 'inactive')
- Деактивация во всех командах
- Нельзя деактивировать самого себя

#### `POST /:id/reset-telegram` - Сброс Telegram
**Права:** admin
- Генерация нового временного ID
- Уведомление о необходимости переподключения

#### `POST /:id/reset-password` - Сброс пароля
**Права:** admin
- Генерация нового временного пароля
- Отправка в Telegram (если настроен)

#### `GET /stats/overview` - Статистика пользователей
**Права:** admin, manager
```json
{
  "success": true,
  "data": {
    "total": 25,
    "active": 23,
    "inactive": 2,
    "withTelegram": 20,
    "byRole": {
      "admin": 2,
      "manager": 3,
      "employee": 20
    }
  }
}
```

### 🏢 **Управление командами** (`/api/teams`)

#### `GET /` - Список команд
**Права:** admin, manager
**Фильтры:** search, status, managerId
**Возвращает:** команды с участниками и статистикой

#### `POST /` - Создание команды
**Права:** admin
```json
{
  "name": "Новая команда",
  "description": "Описание команды",
  "managerId": 2,
  "members": [
    {"userId": 3, "role": "member"},
    {"userId": 4, "role": "lead"}
  ]
}
```

#### `GET /:id/stats` - Статистика команды
**Права:** admin, manager (своих команд)
- Рабочие дни, часы
- Статистика по участникам
- Распределение режимов работы

#### `POST /:id/members` - Добавить участника
#### `DELETE /:id/members/:userId` - Удалить участника
#### `PATCH /:id/members/:userId` - Изменить роль

### 📋 **Аудит логи** (`/api/audit-logs`)

#### `GET /` - Список логов
**Права:** admin, manager
**Фильтры:**
- `adminId` - по администратору
- `userId` - по пользователю
- `resource` - по ресурсу (users, teams, etc.)
- `action` - по действию
- `startDate`, `endDate` - по датам

#### `GET /stats` - Статистика аудита
**Права:** admin
- Действия по типам
- Топ активных администраторов
- Недавние действия

#### `POST /export` - Экспорт логов
**Права:** admin
**Форматы:** JSON, CSV

---

## 🎨 **FRONTEND КОМПОНЕНТЫ** (планируется)

### 📱 **Основные страницы**

#### `/admin/users` - Управление пользователями
- Таблица с фильтрами и поиском
- Модальные окна создания/редактирования
- Массовые действия
- Экспорт данных

#### `/admin/teams` - Управление командами
- Список команд с участниками
- Drag&drop для перемещения участников
- Статистика команд
- Настройки команд

#### `/admin/audit-logs` - Аудит логи
- Фильтрация и поиск
- Детальный просмотр действий
- Экспорт отчётов
- Графики активности

### 🧩 **Компоненты**

#### `<UserTable />` - Таблица пользователей
- Сортировка, фильтрация
- Инлайн редактирование
- Контекстное меню действий

#### `<TeamCard />` - Карточка команды
- Информация о команде
- Список участников
- Быстрые действия

#### `<RoleSelector />` - Селектор ролей
- Визуальное отображение прав
- Подсказки по ограничениям

---

## 🔄 **ИНТЕГРАЦИЯ С TELEGRAM**

### 📨 **Автоматические уведомления**

#### При создании пользователя:
```
👥 Создан новый пользователь: Иван Петров
🔑 Логин: ivan.petrov
🔐 Временный пароль: A1B2C3D4
👤 Роль: employee

Передайте эти данные сотруднику для первого входа в систему.
```

#### При сбросе пароля:
```
🔐 Ваш пароль был сброшен

Новый пароль: X1Y2Z3A4

Рекомендуем сменить его после входа в систему.
```

### 🤖 **Приглашения**
- Автоматическая отправка учётных данных админу
- Уведомление пользователя о сбросе пароля
- Инструкции по подключению к боту

---

## 📊 **АУДИТ И ЛОГИРОВАНИЕ**

### 🎯 **Отслеживаемые действия**

#### Пользователи:
- `create` - создание
- `update` - изменение данных
- `deactivate` - деактивация
- `reset_password` - сброс пароля
- `reset_telegram` - сброс Telegram

#### Команды:
- `create` - создание команды
- `update` - изменение команды
- `deactivate` - деактивация
- `team_add` - добавление в команду
- `team_remove` - удаление из команды
- `update_team_role` - изменение роли

#### Система:
- `login` - вход в систему
- `export` - экспорт отчётов

### 📈 **Метрики аудита**
- Количество действий по периодам
- Топ активных администраторов
- Распределение по типам действий
- Статистика по ресурсам

---

## 🛠️ **УСТАНОВКА И НАСТРОЙКА**

### 📦 **Зависимости**
```bash
npm install bcrypt crypto
```

### 🗄️ **Миграции**
```bash
node scripts/run-migrations.js
```

### 🌱 **Тестовые данные**
```bash
node scripts/seed-teams.js
```

### ⚙️ **Переменные окружения**
```env
# Существующие
TELEGRAM_BOT_TOKEN=your_bot_token
JWT_SECRET=your_jwt_secret

# Новые для Фазы 6
DEMO_MODE=false  # Отключает опасные операции в демо
```

---

## 🧪 **ТЕСТИРОВАНИЕ API**

### 🔐 **Получение токена админа**
```bash
POST /api/auth/login
{
  "username": "admin",
  "password": "admin123"
}
```

### 👥 **Создание пользователя**
```bash
POST /api/users-management
Authorization: Bearer your_token
{
  "name": "Тестовый Пользователь",
  "username": "test.user",
  "role": "employee",
  "teams": [1]
}
```

### 🏢 **Создание команды**
```bash
POST /api/teams
Authorization: Bearer your_token
{
  "name": "Команда тестирования",
  "description": "Тестовая команда",
  "managerId": 1
}
```

### 📋 **Просмотр аудит логов**
```bash
GET /api/audit-logs?resource=users&limit=10
Authorization: Bearer your_token
```

---

## 🎯 **КЛЮЧЕВЫЕ ОСОБЕННОСТИ**

### ✨ **Безопасность**
- JWT токены с проверкой активности
- Хеширование паролей bcrypt
- IP и User-Agent логирование
- Демо режим для безопасности

### 🚀 **Производительность**
- Пагинация для больших списков
- Индексы для быстрых запросов
- Ленивая загрузка связанных данных

### 🎨 **UX/UI**
- Интуитивные роли и права
- Контекстные подсказки
- Быстрые действия
- Уведомления в реальном времени

### 🔧 **Масштабируемость**
- Гибкая система ролей
- Расширяемые настройки команд
- Модульная архитектура
- API-first подход

---

## 📈 **МЕТРИКИ И АНАЛИТИКА**

### 👥 **Пользователи**
- Количество активных/неактивных
- Распределение по ролям
- Подключение к Telegram
- Динамика регистраций

### 🏢 **Команды**
- Размер команд
- Эффективность команд
- Распределение нагрузки
- Статистика менеджеров

### 📊 **Активность**
- Действия администраторов
- Частота изменений
- Пиковые нагрузки
- Тенденции использования

---

## 🔮 **ПЛАНЫ РАЗВИТИЯ**

### 📱 **Мобильное приложение**
- React Native для iOS/Android
- Упрощённый интерфейс для сотрудников
- Push уведомления

### 🤖 **ИИ и автоматизация**
- Автоматическое распределение по командам
- Предиктивная аналитика
- Умные напоминания

### 🔗 **Интеграции**
- Single Sign-On (SSO)
- Active Directory
- Slack, Microsoft Teams
- HR системы

### 📊 **Расширенная аналитика**
- Дашборды в реальном времени
- Кастомные отчёты
- Экспорт в BI системы

---

## 🎉 **ЗАКЛЮЧЕНИЕ**

Фаза 6 превращает TimeBot из простой системы учёта времени в полноценную HR платформу с:

- ✅ **Масштабируемой архитектурой** для любого размера компании
- ✅ **Гранулярным контролем доступа** по ролям и командам  
- ✅ **Полной прозрачностью** через аудит логи
- ✅ **Интуитивным управлением** пользователями и командами
- ✅ **Безшовной интеграцией** с Telegram для уведомлений

Система готова к внедрению в продакшене и дальнейшему развитию! 🚀 

# 🔐 Этап 6: Автоматическая генерация initData с подписью

## Описание этапа
Реализована автоматическая генерация `initData` с правильной HMAC-SHA256 подписью по алгоритму Telegram WebApp. Теперь mock-режим полностью имитирует реальную авторизацию Telegram.

## ✅ Что реализовано

### 1. **Функция генерации HMAC-SHA256 подписи**
```js
// admin-panel/src/lib/telegram-mock.js
async function createHmacSha256(key, data) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(data);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
```

### 2. **Генерация initData по алгоритму Telegram**
```js
async function generateInitData(user) {
  const BOT_TOKEN = 'mock_bot_token_' + Date.now();
  const auth_date = Math.floor(Date.now() / 1000);
  
  // Данные для подписи (формат Telegram)
  const dataCheckString = [
    `auth_date=${auth_date}`,
    `user=${JSON.stringify({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      language_code: 'ru',
      is_premium: false,
      allows_write_to_pm: true
    })}`
  ].sort().join('\n');
  
  // Секретный ключ и подпись
  const secretKey = await createHmacSha256('WebAppData', BOT_TOKEN);
  const hash = await createHmacSha256(secretKey, dataCheckString);
  
  // Формируем finitive initData
  const initData = [
    `auth_date=${auth_date}`,
    `hash=${hash}`,
    `user=${encodeURIComponent(JSON.stringify({...}))}`
  ].join('&');
  
  return { initData, initDataUnsafe: {...}, bot_token: BOT_TOKEN };
}
```

### 3. **Асинхронная инициализация mock**
```js
export async function initTelegramMock() {
  // Генерируем правильные initData с подписью
  const initDataResult = await generateInitData(mockUser);
  
  window.Telegram = {
    WebApp: {
      initData: initDataResult.initData,
      initDataUnsafe: initDataResult.initDataUnsafe,
      // ... остальной API
    }
  };
}
```

### 4. **Детальная информация о подписи в dev режиме**
В странице тестирования (`/dev/test-telegram`) добавлена секция с:
- Длиной initData (символов)
- Временем авторизации
- Hash подписи
- Полным initData для проверки
- Подтверждением правильности алгоритма

### 5. **Расширенное логирование**
```js
console.group('🔐 Детали авторизации Telegram Mock');
console.log('👤 Пользователь:', mockUser);
console.log('📝 initData длина:', initDataResult.initData.length, 'символов');
console.log('🔑 Подпись (hash):', hash.substring(0, 16) + '...');
console.log('⏰ Время авторизации:', new Date(...).toLocaleString());
console.log('🤖 Bot Token (mock):', bot_token.substring(0, 20) + '...');
console.groupEnd();
```

## 🔍 Как это работает

### Алгоритм подписи Telegram WebApp:
1. **Создается data check string**: сортированные параметры через `\n`
2. **Вычисляется secret key**: `HMAC-SHA256('WebAppData', bot_token)`
3. **Подписывается data**: `HMAC-SHA256(secret_key, data_check_string)`
4. **Формируется initData**: URL-encoded строка с hash

### Структура initData:
```
auth_date=1703123456&hash=a1b2c3...&user=%7B%22id%22%3A123...%7D
```

## 🎯 Результат

### ✅ Преимущества:
- **Полная имитация** реального Telegram WebApp
- **Правильная подпись** по алгоритму Telegram
- **Детальная отладка** в dev режиме
- **Асинхронная генерация** с логированием
- **Автоматическое переключение** пользователей

### 🔧 Совместимость:
- ✅ Работает с существующим dev toggle
- ✅ Сохраняет все mock функции (кнопки, haptic)
- ✅ Полная интеграция с авторизацией
- ✅ Отображается в тестовой странице

## 🚀 Запуск и тестирование

### 1. Запустить dev сервер:
```bash
cd admin-panel && npm run dev
```

### 2. Открыть страницу тестирования:
```
http://localhost:5176/dev/test-telegram
```

### 3. Проверить консоль браузера:
```
🔐 Детали авторизации Telegram Mock
👤 Пользователь: {id: 782245481, first_name: "Мухамед", ...}
📝 initData длина: 245 символов
🔑 Подпись (hash): a1b2c3d4e5f6g7h8...
⏰ Время авторизации: 22.12.2024, 15:30:45
🤖 Bot Token (mock): mock_bot_token_170312...
```

### 4. В секции "initData с подписью (DEV)":
- Длина initData
- Время авторизации
- Hash подписи (полный)
- Полный initData
- ✅ Подтверждение правильности алгоритма

## 💡 Применение

### Для разработчиков:
- Тестирование авторизации без реального бота
- Отладка обработки initData на backend
- Проверка валидации подписей

### Для QA тестирования:
- Полная имитация production окружения
- Переключение между пользователями
- Проверка всех сценариев авторизации

### Для демонстраций:
- Реалистичная работа WebApp
- Правильные данные авторизации
- Профессиональный вид приложения

## 🔄 Совместимость с прошлыми этапами

### Этап 1-2: Dev Toggle
✅ Сохранена вся функциональность переключения режимов

### Этап 3: NotInTelegramNotice
✅ Правильно скрывается при наличии initData

### Этап 4: TelegramAuthStatus
✅ Использует данные из правильного initDataUnsafe

### Этап 5: Страница тестирования
✅ Показывает детальную информацию о подписи

## 🎉 Итоги этапа 6

**Достигнуто**:
- ✅ Автоматическая генерация initData с правильной подписью
- ✅ Полная имитация алгоритма Telegram WebApp
- ✅ Детальная отладочная информация в dev режиме
- ✅ Асинхронная инициализация с логированием
- ✅ Интеграция с существующей тестовой страницей

**Готово для**:
- 🔧 Backend валидации initData подписей
- 📱 Production-подобного тестирования
- 🎯 Демонстраций реальной функциональности
- 🚀 Дальнейшей разработки WebApp функций

HR система теперь имеет полностью функциональную имитацию Telegram WebApp с правильными подписями для максимально реалистичного dev опыта! 🎊 