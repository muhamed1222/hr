# CSRF Protection Guide

## Общая информация

CSRF (Cross-Site Request Forgery) защита реализована для всех модифицирующих API-запросов (POST, PUT, DELETE, PATCH).

## Как это работает

1. При первом запросе сервер генерирует CSRF токен и отправляет его клиенту в cookie `XSRF-TOKEN`
2. Клиент должен отправлять этот токен в одном из следующих форматов:
   - В заголовке `X-CSRF-Token`
   - В заголовке `X-XSRF-Token`
   - В теле запроса как поле `_csrf`
   - В URL как параметр `_csrf`

## Исключения

CSRF защита не применяется к следующим эндпоинтам:
- `/api/auth/login`
- `/api/auth/logout`
- `/api/telegram-webhook`
- `/health`
- `/api-docs`
- `/api/metrics`

## Примеры использования

### Axios

```javascript
// Axios автоматически берет значение из cookie XSRF-TOKEN
// и отправляет его в заголовке X-XSRF-Token
const axios = require('axios');

const api = axios.create({
  baseURL: '/api',
  withCredentials: true // Важно для работы с cookies
});

// Запрос будет автоматически включать CSRF токен
api.post('/users', userData);
```

### Fetch API

```javascript
// Получаем токен из cookie
const getCsrfToken = () => {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('XSRF-TOKEN='))
    ?.split('=')[1];
};

// Пример POST запроса
async function createUser(userData) {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': getCsrfToken()
    },
    credentials: 'include', // Важно для работы с cookies
    body: JSON.stringify(userData)
  });
  return response.json();
}
```

### HTML Forms

```html
<form action="/api/users" method="POST">
  <!-- CSRF токен в скрытом поле -->
  <input type="hidden" name="_csrf" value="<%= csrfToken %>">
  
  <!-- Остальные поля формы -->
  <input type="text" name="username">
  <input type="password" name="password">
  <button type="submit">Create User</button>
</form>
```

## Обработка ошибок

При отсутствии или неверном CSRF токене сервер вернет ошибку 403 Forbidden:

```json
{
  "status": "error",
  "message": "CSRF validation failed",
  "errorCode": "ERR_SEC_001" // или "ERR_SEC_002"
}
```

## Безопасность

1. Токены имеют ограниченный срок действия (настраивается через `CSRF_TIMEOUT` в .env)
2. Используется строгая настройка Same-Site для cookies
3. В production режиме cookies отправляются только по HTTPS

## Отладка

Для отладки CSRF защиты:

1. Проверьте наличие cookie `XSRF-TOKEN` в браузере
2. Убедитесь, что отправляете токен в правильном формате
3. Проверьте, не истек ли срок действия токена
4. В development режиме включите подробное логирование

## Известные проблемы

1. При использовании прокси может потребоваться дополнительная настройка заголовков
2. Некоторые старые браузеры могут не поддерживать Same-Site cookies
3. При тестировании API через Postman необходимо включить сохранение cookies 