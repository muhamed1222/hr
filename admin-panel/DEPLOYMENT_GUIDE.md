# 🚀 Руководство по деплою на Vercel

## Проблема с доменом https://outime.vercel.app/login

Ваш домен перестал работать. Вот пошаговое решение:

## 🔧 Шаги для исправления:

### 1. Проверьте статус проекта в Vercel Dashboard
1. Зайдите на [vercel.com/dashboard](https://vercel.com/dashboard)
2. Найдите проект `outime` или `outcast-timebot-admin`
3. Проверьте последний деплой на наличие ошибок

### 2. Передеплой проекта
```bash
# В директории admin-panel
cd admin-panel

# Установите Vercel CLI если не установлен
npm i -g vercel

# Логин в Vercel
vercel login

# Деплой
vercel --prod
```

### 3. Настройка переменных окружения в Vercel
В Vercel Dashboard → Settings → Environment Variables добавьте:

```
VITE_API_URL=https://your-backend-url.com/api
```

### 4. Проверка конфигурации
Убедитесь что в `vercel.json`:
```json
{
  "buildCommand": "npm run vercel-build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": "vite"
}
```

### 5. Альтернативный деплой через GitHub
1. Запушьте код в GitHub
2. Подключите репозиторий к Vercel
3. Настройте автоматический деплой

## 🚨 Возможные причины проблемы:

1. **Истёк бесплатный план Vercel** - проверьте лимиты
2. **Ошибка в сборке** - проверьте логи деплоя
3. **Проблемы с переменными окружения** - проверьте настройки
4. **Домен не привязан** - проверьте настройки домена

## 🔍 Диагностика:

### Проверьте логи деплоя:
```bash
vercel logs
```

### Проверьте статус:
```bash
vercel ls
```

## 📞 Если проблема остаётся:

1. Проверьте [Vercel Status Page](https://vercel-status.com/)
2. Обратитесь в [Vercel Support](https://vercel.com/support)
3. Рассмотрите альтернативы: Netlify, Railway, Render

## 🎯 Быстрое решение:

```bash
# Полная пересборка и деплой
cd admin-panel
npm run build
vercel --prod --force
```

**После выполнения этих шагов ваш домен должен заработать!** 🚀 