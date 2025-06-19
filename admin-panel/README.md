# 🖥️ Outcast TimeBot Admin Panel

Веб-админка для управления системой учёта рабочего времени.

## 🚀 Быстрый старт

### Предварительные требования

- Node.js 18+
- Запущенный backend API (порт 3000)

### Установка и запуск

```bash
# Переход в папку админ-панели
cd admin-panel

# Установка зависимостей
npm install

# Запуск в режиме разработки
npm run dev
```

Админ-панель будет доступна по адресу: http://localhost:5173

### Переменные окружения

Создайте файл `.env` в папке `admin-panel`:

```env
VITE_API_URL=http://localhost:3000/api
```

## 🔐 Авторизация

Используйте тестовые данные для входа:
- **Логин:** `admin`
- **Пароль:** `admin123`

## 📋 Функциональность MVP

### ✅ Готово
- 🔐 Авторизация с JWT токенами
- 📊 Дашборд с реальными данными
- 📱 Адаптивный интерфейс
- 🔄 Автообновление данных
- 🎨 Современный UI на Tailwind CSS

### 📊 Дашборд
- Статистика команды в реальном времени
- Таблица всех сотрудников с текущим статусом
- Индикаторы опозданий и отсутствия отчётов
- Кнопка экспорта данных

### 🧭 Навигация
- **Дашборд** - главная страница со сводкой
- **Сотрудники** - управление пользователями (в разработке)
- **Аналитика** - графики и отчёты (в разработке)
- **Настройки** - конфигурация системы (в разработке)

## 🛠️ Технический стек

- **Frontend:** React 18 + Vite
- **State Management:** Zustand
- **Data Fetching:** TanStack React Query
- **Styling:** Tailwind CSS + shadcn/ui
- **Icons:** Lucide React
- **Routing:** React Router DOM
- **Notifications:** React Hot Toast

## 📁 Структура проекта

```
admin-panel/
├── src/
│   ├── components/         # Переиспользуемые компоненты
│   │   ├── ui/            # UI компоненты (Button, Input, Card)
│   │   ├── Layout.jsx     # Основной лэйаут
│   │   └── ProtectedRoute.jsx
│   ├── pages/             # Страницы приложения
│   │   ├── Login.jsx      # Страница авторизации
│   │   └── Dashboard.jsx  # Главная страница
│   ├── api/               # HTTP клиенты
│   │   ├── client.js      # Axios клиент с интерсепторами
│   │   ├── auth.js        # API авторизации
│   │   └── workLogs.js    # API рабочих логов
│   ├── store/             # Zustand stores
│   │   └── useAuthStore.js
│   ├── lib/               # Утилиты
│   │   └── utils.js       # Хелперы и форматеры
│   ├── App.jsx            # Главный компонент
│   └── main.jsx           # Точка входа
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## 🔄 API Интеграция

Админ-панель интегрируется с существующими API endpoints:

- `GET /api/work-logs/team/today` - данные команды на сегодня
- `POST /api/auth/login` - авторизация
- `GET /api/auth/verify` - проверка токена

## 🎨 UI/UX особенности

- **Адаптивный дизайн** - работает на всех устройствах
- **Тёмная/светлая тема** - готово к расширению
- **Живые обновления** - данные обновляются каждые 30 секунд
- **Индикаторы состояния** - цветовые маркеры для быстрого понимания
- **Уведомления** - toast сообщения для всех действий

## 🚀 Развёртывание

### Vercel (рекомендуется)

```bash
# Сборка для продакшена
npm run build

# Автодеплой через Vercel CLI
vercel --prod
```

### Netlify

```bash
# Сборка
npm run build

# Загрузка папки dist на Netlify
```

### Docker

```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 🔧 Разработка

### Добавление новых страниц

1. Создайте компонент в `src/pages/`
2. Добавьте роут в `src/App.jsx`
3. Обновите навигацию в `src/components/Layout.jsx`

### Добавление API endpoints

1. Создайте новый файл в `src/api/`
2. Используйте базовый клиент из `src/api/client.js`
3. Добавьте React Query хуки в компонентах

### Стилизация

Используйте Tailwind CSS классы и компоненты из `src/components/ui/`

## 🐛 Troubleshooting

### CORS ошибки
Убедитесь, что backend API настроен на приём запросов с localhost:5173

### 401 ошибки
Проверьте, что токен JWT не истёк и backend работает

### Проблемы с сборкой
```bash
rm -rf node_modules package-lock.json
npm install
```

## 📞 Поддержка

- **Issues:** [GitHub Issues](https://github.com/outcast-dev/timebot/issues)
- **Документация API:** См. основной README проекта

---

**Сделано с ❤️ для Outcast Development Team** 