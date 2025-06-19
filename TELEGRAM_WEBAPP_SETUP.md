# 🚀 Настройка Telegram WebApp для HR системы

## 📱 Что реализовано в Фазе 4

### ✅ Функциональность:
- **Определение среды Telegram** — автоматическая детекция WebApp
- **Нативные кнопки Telegram** — MainButton и BackButton
- **Тактильные отклики** — HapticFeedback для iOS/Android
- **Упрощенный мобильный UI** — без боковых панелей
- **Адаптивность** — работает на 320px ширине
- **Автоматическое переключение** — разные интерфейсы для админов и сотрудников

### 📋 Компоненты:

#### 1. **Хуки для Telegram API**
```javascript
// src/hooks/useIsTelegram.js - определение среды
useIsTelegram() // true, если запущено в Telegram

// src/hooks/useTelegramUI.js - управление интерфейсом
useTelegramUI() // инициализация WebApp
useTelegramMainButton() // управление главной кнопкой
useTelegramBackButton() // управление кнопкой назад
showTelegramAlert() // нативные уведомления
hapticFeedback() // тактильные отклики
```

#### 2. **Компоненты интерфейса**
```javascript
// src/components/TelegramApp.jsx - главный мобильный интерфейс
// src/components/MobileWorkLogForm.jsx - форма отчёта для мобильных
```

#### 3. **CSS адаптация**
```css
/* Telegram WebApp переменные */
--tg-theme-bg-color
--tg-theme-text-color  
--tg-theme-button-color
/* + мобильная адаптивность под 320px */
```

---

## 🔧 Настройка Telegram бота

### 1. **Регистрация WebApp в BotFather**

Откройте [@BotFather](https://t.me/BotFather) в Telegram:

```
/setmenubutton
@hr_oc_bot
Кнопка - HR Система
URL - https://your-domain.com
```

### 2. **Обновление бота с WebApp кнопкой**

```javascript
// В боте добавить кнопку меню
bot.api.setMyCommands([
  { command: 'start', description: 'Запуск HR системы' },
  { command: 'report', description: 'Сдать отчёт о работе' },
  { command: 'stats', description: 'Моя статистика' }
]);

// Установка WebApp кнопки
bot.api.setChatMenuButton({
  menu_button: {
    type: 'web_app',
    text: 'HR Система',
    web_app: { url: 'https://your-domain.com' }
  }
});
```

---

## 🎯 Как использовать

### **Для сотрудников:**
1. Открывают бота → нажимают "HR Система" 
2. Видят упрощенный интерфейс:
   - 📝 **Сдать отчёт** — главная функция
   - 📊 **Статистика** — мои часы  
   - 🏖️ **Отсутствие** — заявки

### **Для администраторов:**
1. Переключаются на полный веб-интерфейс
2. Доступ ко всем функциям управления

---

## 🔄 Логика переключения интерфейсов

```javascript
// В App.jsx
if (isTelegram && isAuthenticated && user?.role !== 'admin') {
  return <TelegramApp />; // Упрощенный мобильный
}

return <FullWebInterface />; // Полный интерфейс
```

---

## 📱 Тестирование WebApp

### 1. **Локальное тестирование**
```bash
# Запуск dev сервера
cd admin-panel && npm run dev

# Откройте test-telegram.html в браузере
# Или http://localhost:5173 
```

### 2. **Тестирование в Telegram**
- Настройте ngrok или аналогичный туннель
- Обновите URL в BotFather
- Откройте бота в Telegram

### 3. **Проверка функций**
- ✅ MainButton появляется/скрывается
- ✅ BackButton работает  
- ✅ HapticFeedback срабатывает
- ✅ showAlert/showConfirm работают
- ✅ Цвета темы применяются

---

## 🛠️ Технические детали

### **Инициализация WebApp:**
```javascript
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand(); // полный экран
tg.setHeaderColor('#1f2937');
```

### **Управление кнопками:**
```javascript
// Главная кнопка
tg.MainButton.setText('Сдать отчёт');
tg.MainButton.onClick(handleSubmit);
tg.MainButton.show();

// Кнопка назад  
tg.BackButton.onClick(goBack);
tg.BackButton.show();
```

### **Нативные диалоги:**
```javascript
// Алерт
tg.showAlert('Отчёт отправлен!');

// Подтверждение
tg.showConfirm('Удалить отчёт?', (confirmed) => {
  if (confirmed) deleteReport();
});
```

---

## 📊 Результат

### ✅ Получили:
- 🚀 **Мгновенный запуск** — как нативное приложение
- 📱 **Мобильный интерфейс** — адаптированный под телефоны  
- 🔘 **Нативные кнопки** — встроенные в Telegram
- 🎯 **Простота использования** — минимум кликов
- 🔄 **Умное переключение** — разные UI для разных ролей

### 🎯 Следующие шаги:
- Настройка production деплоя
- Интеграция с существующим API
- Расширение мобильного функционала
- Push-уведомления через бота

---

## 📞 Поддержка

При возникновении проблем:
1. Проверьте консоль браузера
2. Убедитесь что WebApp script загружен
3. Проверьте URL в BotFather
4. Тестируйте сначала локально, потом в Telegram

**Telegram WebApp готов к использованию! 🎉** 