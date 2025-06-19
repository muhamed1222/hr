# 🔧 Исправление проблемы "host is not allowed"

## ❌ Проблема
При попытке доступа к приложению через localtunnel появляется ошибка:
```
Blocked request. This host ("whole-women-lose.loca.lt") is not allowed.
To allow this host, add "whole-women-lose.loca.lt" to `server.allowedHosts` in vite.config.js.
```

## ✅ Решение

### 1. Остановите Vite сервер
Нажмите `Ctrl+C` в терминале где запущен `npm run dev`

### 2. Откройте `admin-panel/vite.config.js`
Найдите секцию `server` и добавьте настройки:

```javascript
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    allowedHosts: ['whole-women-lose.loca.lt', '.loca.lt'],
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
```

### 3. Перезапустите сервер
```bash
cd admin-panel
npm run dev
```

### 4. Проверьте работу
Теперь localtunnel URL должен работать корректно без ошибок.

## 🔍 Объяснение

- `host: '0.0.0.0'` - разрешает доступ с любых IP адресов
- `allowedHosts: ['.loca.lt']` - явно разрешает домены localtunnel
- Это стандартная защита Vite от атак через поддельные хосты

## 🚀 Для будущего

Если получите новый localtunnel URL (например: `crazy-cats-jump.loca.lt`), добавьте его в массив:

```javascript
allowedHosts: ['whole-women-lose.loca.lt', 'crazy-cats-jump.loca.lt', '.loca.lt']
```

Или просто используйте `.loca.lt` wildcard для всех поддоменов localtunnel. 