# 🤖 Outcast TimeBot

Система учёта рабочего времени через Telegram с полной админ-панелью и аналитикой.

## 📋 Возможности

### Для сотрудников (Telegram бот):
- ✅ Отметка прихода (офис/удалённо)
- 🍱 Фиксация обеда
- ❌ Отметка ухода
- 📝 Ежедневные отчёты
- 📊 Просмотр статистики за день/неделю
- 🔔 Автоматические напоминания

### Для администраторов (Web-панель):
- 👥 Управление сотрудниками
- 📈 Аналитика и статистика
- 📄 Экспорт отчётов (Excel/PDF)
- 🎯 Рейтинг надёжности сотрудников
- ⚙️ Редактирование записей времени
- 📊 Дашборд в реальном времени

## 🏗 Архитектура

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Telegram Bot  │───▶│   Node.js API   │───▶│   PostgreSQL    │
│    (Frontend)   │    │   (Backend)     │    │   (Database)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                      ┌─────────────────┐
                      │   Admin Panel   │
                      │   (React/HTML)  │
                      └─────────────────┘
```

## 🚀 Быстрый старт

### Предварительные требования

- Node.js 18+
- PostgreSQL 12+
- Telegram Bot Token

### 1. Установка Backend

```bash
# Установка зависимостей
npm install

# Настройка окружения
cp env.example .env
# Заполните переменные в .env файле

# Создание базы данных
createdb outcast_timebot

# Миграция и тестовые данные
npm run migrate
npm run seed

# Запуск backend сервера
npm run dev
```

### 2. Установка Admin Panel

```bash
# Переход в папку админ-панели
cd admin-panel

# Установка зависимостей
npm install

# Запуск веб-админки
npm run dev
```

### 3. Доступ к системе

- **Backend API:** http://localhost:3000
- **Admin Panel:** http://localhost:5173
- **Авторизация:** admin / admin123

### Обязательные переменные окружения:

**Backend (.env):**
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=outcast_timebot
DB_USER=postgres
DB_PASSWORD=your_password

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_here

# JWT
JWT_SECRET=your_super_secret_jwt_key_here

# Admin Panel
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

**Admin Panel (admin-panel/.env):**
```env
VITE_API_URL=http://localhost:3000/api
```

## 📊 API Endpoints

### Авторизация
- `POST /api/auth/login` - Вход в админ-панель
- `GET /api/auth/verify` - Проверка токена

### Пользователи
- `GET /api/users` - Список пользователей
- `GET /api/users/:id` - Данные пользователя
- `PUT /api/users/:id` - Обновление пользователя
- `DELETE /api/users/:id` - Деактивация пользователя
- `GET /api/users/:id/stats` - Статистика пользователя
- `GET /api/users/ranking/reliability` - Рейтинг надёжности

### Рабочие логи
- `GET /api/work-logs` - Список логов с фильтрами
- `GET /api/work-logs/stats` - Статистика за период
- `GET /api/work-logs/:userId/:date` - Лог конкретного дня
- `PUT /api/work-logs/:id` - Редактирование лога
- `GET /api/work-logs/team/today` - Сводка команды на сегодня

### Отчёты
- `POST /api/reports/excel` - Генерация Excel отчёта
- `POST /api/reports/pdf` - Генерация PDF отчёта
- `GET /api/reports/analytics` - Данные для аналитики

## 🤖 Команды бота

### Основные команды:
- `/start` - Регистрация/главное меню
- `/myday` - Статус за сегодня
- `/myweek` - Сводка за неделю
- `/team` - Статус команды (для менеджеров)
- `/help` - Справка

### Inline кнопки:
- ✅ **Пришёл в офис** - Отметка прихода в офис
- 🏠 **Работаю удалённо** - Отметка удалённой работы
- 🍱 **Начал обед** - Начало обеденного перерыва
- 🔙 **Вернулся с обеда** - Конец обеденного перерыва
- ❌ **Ушёл домой** - Завершение рабочего дня
- 🤒 **Больничный** - Отметка болезни

## 📈 Система рейтингов

Рейтинг надёжности сотрудника рассчитывается по формуле:

**Базовый балл: 100**

**Штрафы:**
- Опоздания: до -30 баллов
- Отсутствие отчётов: до -25 баллов  
- Недоработка (< 7 часов): до -20 баллов

**Бонусы:**
- Переработка (> 8 часов): до +15 баллов

## 🗃 Структура базы данных

Основные таблицы:
- `users` - Пользователи системы
- `work_logs` - Логи рабочего времени
- `audit_logs` - Журнал действий
- `sessions` - Сессии пользователей
- `reports` - Генерированные отчёты

## 🔧 Конфигурация

### Время работы по умолчанию:
- Начало рабочего дня: 09:00
- Определение опоздания: после 09:00

### Напоминания:
- 09:50 - "Вы пришли?"
- 14:00 - "Обед?"
- 17:50 - "Сдать отчёт"

### Роли пользователей:
- `employee` - Обычный сотрудник
- `manager` - Менеджер (может видеть команду)
- `admin` - Администратор (полный доступ)

## 📦 Развёртывание

### Docker (рекомендуется)

```bash
# Создание образа
docker build -t outcast-timebot .

# Запуск с PostgreSQL
docker-compose up -d
```

### PM2

```bash
# Установка PM2
npm install -g pm2

# Запуск
pm2 start src/app.js --name "timebot"

# Просмотр логов
pm2 logs timebot
```

## 🛡 Безопасность

- JWT токены для админ-панели
- Rate limiting на API endpoints
- Валидация всех входящих данных
- Логирование действий пользователей
- Защита от SQL-инъекций через ORM

## 📱 Telegram бот

### Создание бота:
1. Напишите @BotFather в Telegram
2. Выполните команду `/newbot`
3. Следуйте инструкциям
4. Получите токен и добавьте в `.env`

### Настройка webhook (опционально):
```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://yourdomain.com/webhook"}'
```

## 🔍 Мониторинг

### Health check:
```bash
curl http://localhost:3000/health
```

### Логи:
```bash
# Все логи
tail -f logs/app.log

# Только ошибки
tail -f logs/error.log
```

## 🚨 Troubleshooting

### База данных не подключается:
```bash
# Проверка подключения
psql -h localhost -U postgres -d outcast_timebot

# Проверка прав доступа
GRANT ALL PRIVILEGES ON DATABASE outcast_timebot TO postgres;
```

### Бот не отвечает:
1. Проверьте токен в `.env`
2. Убедитесь что бот не заблокирован
3. Проверьте логи: `npm run dev`

### Ошибки миграции:
```bash
# Пересоздание таблиц
npm run migrate
```

## 🤝 Участие в разработке

1. Fork репозитория
2. Создайте feature branch
3. Сделайте изменения
4. Напишите тесты
5. Создайте Pull Request

## 📄 Лицензия

MIT License - см. файл LICENSE

## 📞 Поддержка

- GitHub Issues: [создать issue](https://github.com/outcast-dev/timebot/issues)
- Email: support@outcast.dev
- Telegram: @outcast_support

---

**Made with ❤️ by Outcast Development Team** 