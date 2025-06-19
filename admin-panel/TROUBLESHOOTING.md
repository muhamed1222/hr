# Руководство по решению проблем

## Проблемы с Service Worker

Если вы видите ошибки типа "FetchEvent resulted in a network error", это может быть связано с:

1. **Кешем браузера**: Очистите кеш браузера (Ctrl+Shift+R или Cmd+Shift+R)
2. **Расширениями браузера**: Попробуйте режим инкогнито или отключите расширения
3. **Service Worker в DevTools**: Откройте DevTools → Application → Service Workers и удалите все зарегистрированные

## Быстрое решение проблем

### Очистка Service Worker
```bash
# В консоли браузера выполните:
navigator.serviceWorker.getRegistrations().then(function(registrations) {
  for(let registration of registrations) {
    registration.unregister();
  }
});
```

### Перезапуск сервера
```bash
cd admin-panel
node start-dev.cjs
```

### Проверка доступности ресурсов
```bash
curl http://localhost:5173/sw.js
curl http://localhost:5173/manifest.json
curl http://localhost:5173/icon-192x192.png
```

## Ошибки 404

Все статические ресурсы теперь созданы:
- ✅ `/sw.js` - пустой service worker
- ✅ `/manifest.json` - PWA манифест
- ✅ `/icon-192x192.png` - иконка приложения
- ✅ `/icon-512x512.png` - большая иконка
- ✅ `/vite.svg` - favicon

## Контакт
Если проблемы продолжаются, проверьте:
1. Работает ли backend на http://localhost:3000
2. Установлены ли все зависимости (`npm install`)
3. Нет ли конфликтов портов 