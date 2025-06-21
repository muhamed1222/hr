# API Documentation

## Общая информация

Базовый URL: `http://localhost:3000/api` (для разработки)

### Аутентификация

Все защищенные эндпоинты требуют JWT токен в заголовке:
```
Authorization: Bearer <token>
```

## Эндпоинты

### Аутентификация

#### POST /auth/login
Аутентификация пользователя.

**Запрос:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Ответ:**
```json
{
  "token": "string",
  "user": {
    "id": "number",
    "username": "string",
    "role": "string"
  }
}
```

### Пользователи

#### GET /users
Получение списка пользователей.

**Параметры запроса:**
- `page` (number, optional): номер страницы
- `limit` (number, optional): количество записей на странице
- `search` (string, optional): поиск по имени пользователя

**Ответ:**
```json
{
  "users": [
    {
      "id": "number",
      "username": "string",
      "role": "string",
      "createdAt": "string"
    }
  ],
  "total": "number",
  "page": "number",
  "limit": "number"
}
```

### Рабочие логи

#### POST /work-logs
Создание записи о работе.

**Запрос:**
```json
{
  "userId": "number",
  "date": "string (YYYY-MM-DD)",
  "hours": "number",
  "description": "string",
  "workMode": "string"
}
```

**Ответ:**
```json
{
  "id": "number",
  "userId": "number",
  "date": "string",
  "hours": "number",
  "description": "string",
  "workMode": "string",
  "createdAt": "string"
}
```

## Коды ошибок

- `400`: Неверный запрос
- `401`: Не авторизован
- `403`: Доступ запрещен
- `404`: Ресурс не найден
- `500`: Внутренняя ошибка сервера

## Ограничения

- Максимальное количество запросов: 100 запросов в минуту
- Максимальный размер запроса: 10MB
- Поддерживаемые форматы: JSON

## Версионирование

API версионируется через URL: `/api/v1/...`
Текущая версия: v1 