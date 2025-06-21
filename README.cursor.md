# 🧠 OutTime HR — Telegram WebApp для учёта времени

## 🎯 Цель проекта
Упростить процесс трекинга рабочего времени сотрудников через Telegram WebApp с автоматическими напоминаниями и админ-панелью.

---

## 🚀 MVP Функциональность

- Авторизация через Telegram
- Логи: приход, обед, уход
- Напоминания через cron и Telegram
- Панель менеджера: сотрудники, фильтры, отчёты

---

## 🧱 Технологический стек

| Компонент       | Технология          |
|----------------|---------------------|
| Фронтенд       | React (Vite)        |
| UI             | TailwindCSS         |
| Telegram       | Telegram WebApp SDK |
| Бэкенд         | Node.js (Express)   |
| ORM            | Sequelize           |
| База данных    | PostgreSQL          |
| Хранилище      | Railway (cloud DB)  |
| Менеджер пакетов | pnpm              |

---

## 🗂️ Структура
/src
/api
/models
/routes
/services
/utils
/webapp (Telegram UI)
---

## 🔌 API (REST)

| Метод | Путь             | Описание                         |
|-------|------------------|----------------------------------|
| POST  | /auth/telegram   | Авторизация через Telegram       |
| POST  | /logs            | Создать лог (checkin/lunch/etc) |
| GET   | /logs            | Получить логи пользователя       |
| GET   | /users           | Список сотрудников (для менеджера) |

---

## 🧩 Основные сущности

### User
- `id`: integer, PK
- `telegramId`: string, уникальный
- `name`: string
- `role`: enum: employee / manager / admin
- `createdAt`: timestamp

### WorkLog
- `id`: integer, PK
- `userId`: FK (User)
- `type`: enum: checkin / lunch / checkout
- `timestamp`: timestamp

---

## 🖼️ UI (WebApp)

- Экран 1: Приветствие и кнопки логов
- Экран 2: Менеджерская панель (список, фильтры, отчёт)
- Используем компоненты Tailwind + кастомные

---

## ⏰ Напоминания

- node-cron + Telegram API
- Примеры:
  - 09:00 — напомнить о приходе
  - 13:00 — об обеде
  - 18:00 — не забыл ли уйти

---

## 📦 Важные зависимости

- `date-fns`
- `dotenv`
- `node-cron`
- `telegram-webapp`