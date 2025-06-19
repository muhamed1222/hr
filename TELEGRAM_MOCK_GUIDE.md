# 🤖 Автоматический Telegram Mock — Руководство

## 🎯 Что это такое?

Автоматический эмулятор Telegram WebApp API, который **сам включается** в development режиме, если приложение запущено не в реальном Telegram. Никаких ручных действий в консоли браузера!

## ✨ Возможности

### 🔄 Автоматическая инициализация
- Определяет отсутствие `window.Telegram`
- Автоматически создает полный Telegram WebApp API
- Включается только в `NODE_ENV === 'development'`

### 👤 Умные пользователи
- **3 тестовых пользователя** с разными ролями
- Переключение через URL параметры
- Автоматическое сохранение выбора

### 🎨 Визуальный интерфейс
- **Плавающая панель** внизу экрана с кнопками
- **MainButton** и **BackButton** как в настоящем Telegram
- **Переключатель пользователей** для быстрого тестирования

### 📳 Полная эмуляция API
- Все методы Telegram WebApp API
- Тактильные отклики с визуальными эффектами
- Нативные диалоги и уведомления

## 🚀 Как использовать

### 1. Автоматический запуск
Просто запустите приложение в браузере:
```bash
cd admin-panel
npm run dev
```

**Mock автоматически активируется** если:
- `NODE_ENV === 'development'`
- `window.Telegram` не существует
- Приложение запущено в браузере (не в Telegram)

### 2. Переключение пользователей
Добавьте параметр в URL для смены роли:

```
# Сотрудник (по умолчанию)
http://localhost:5173/?mock_role=employee

# Менеджер
http://localhost:5173/?mock_role=manager

# Администратор  
http://localhost:5173/?mock_role=admin

# Конкретный пользователь по ID
http://localhost:5173/?mock_user=123456789
```

### 3. Использование в коде
Код работает **одинаково** с реальным Telegram и с mock:

```javascript
import { useIsTelegram, getTelegramUser } from '@/hooks/useIsTelegram';

function MyComponent() {
  const { isTelegram, isReady } = useIsTelegram();
  const user = getTelegramUser();

  if (!isReady) {
    return <div>Загрузка...</div>;
  }

  if (isTelegram && user) {
    return (
      <div>
        <h1>Привет, {user.first_name}!</h1>
        <p>Роль: {user.role}</p>
        {/* Ваш код работает одинаково! */}
      </div>
    );
  }

  return <div>Обычный веб-интерфейс</div>;
}
```

## 🧪 Тестирование функций

### MainButton
```javascript
// В любом компоненте
import { useTelegramMainButton } from '@/hooks/useTelegramUI';

const { setText, show, hide, onClick } = useTelegramMainButton();

// Настройка кнопки
setText('Отправить отчёт');
onClick(() => {
  console.log('Отчёт отправлен!');
});
show();
```

**В Mock:** Появится синяя кнопка внизу экрана  
**В Telegram:** Настоящая MainButton Telegram

### BackButton
```javascript
import { useTelegramBackButton } from '@/hooks/useTelegramUI';

const { show, hide, onClick } = useTelegramBackButton();

onClick(() => {
  // Возврат назад
  history.back();
});
show();
```

**В Mock:** Кнопка "← Назад" в панели  
**В Telegram:** Настоящая BackButton Telegram

### HapticFeedback
```javascript
import { hapticFeedback } from '@/hooks/useTelegramUI';

// Легкий отклик
hapticFeedback('light');

// Средний отклик  
hapticFeedback('medium');

// Сильный отклик
hapticFeedback('heavy');
```

**В Mock:** Визуальный эффект масштабирования  
**В Telegram:** Настоящая вибрация устройства

## 👥 Тестовые пользователи

### 1. Мухамед Келеметов (employee)
```javascript
{
  id: 782245481,
  first_name: 'Мухамед',
  last_name: 'Келеметов',
  username: 'mukhamed_dev',
  role: 'employee'
}
```

### 2. Анна Админова (admin)
```javascript
{
  id: 123456789,
  first_name: 'Анна',
  last_name: 'Админова',
  username: 'anna_admin',
  role: 'admin'
}
```

### 3. Петр Менеджеров (manager)
```javascript
{
  id: 987654321,
  first_name: 'Петр',
  last_name: 'Менеджеров',
  username: 'petr_manager',
  role: 'manager'
}
```

## 🎨 Визуальные элементы

### Плавающая панель
- **Позиция:** Фиксирована внизу экрана
- **Дизайн:** Градиентный фон, blur эффект
- **Содержимое:** Заголовок, переключатель, кнопки

### Кнопки Mock
- **MainButton:** Синяя кнопка справа
- **BackButton:** Прозрачная кнопка слева
- **Переключатель:** Выпадающий список пользователей

### Тактильные отклики
- **Light:** Легкое масштабирование (scale: 0.995)
- **Medium:** Среднее масштабирование (scale: 0.99)
- **Heavy:** Сильное масштабирование (scale: 0.985)

## 🔧 Настройка и интеграция

### Автоматическая интеграция
В `src/lib/telegram.js` уже добавлена автоматическая инициализация:

```javascript
// Автоматическая инициализация Mock в development режиме
if (process.env.NODE_ENV === 'development' && !window.Telegram) {
  import('./telegram-mock.js').then(({ initTelegramMock }) => {
    initTelegramMock();
  });
}
```

### Обновленный useIsTelegram
Хук теперь ждет инициализации mock:

```javascript
export function useIsTelegram() {
  const [isTelegram, setIsTelegram] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Проверка и ожидание инициализации
    const checkTelegram = () => {
      if (window.Telegram?.WebApp) {
        setIsTelegram(true);
        setIsReady(true);
      }
    };

    const interval = setInterval(checkTelegram, 100);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setIsReady(true);
    }, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  return { isTelegram, isReady };
}
```

## 🧩 Примеры использования

### Проверка среды
```javascript
function App() {
  const { isTelegram, isReady } = useIsTelegram();

  if (!isReady) {
    return <div>Инициализация Telegram Mock...</div>;
  }

  if (isTelegram) {
    return <TelegramApp />; // Мобильный интерфейс
  }

  return <WebApp />; // Обычный интерфейс
}
```

### Умное переключение интерфейсов
```javascript
function UserInterface() {
  const { isTelegram } = useIsTelegram();
  const user = getTelegramUser();

  // Админы всегда видят полный интерфейс
  if (user?.role === 'admin') {
    return <AdminInterface />;
  }

  // Сотрудники в Telegram видят мобильный
  if (isTelegram) {
    return <MobileInterface />;
  }

  // Остальные видят веб-интерфейс
  return <WebInterface />;
}
```

### Работа с кнопками
```javascript
function CreateReport() {
  const { setText, show, hide, onClick } = useTelegramMainButton();
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    if (isValid) {
      setText('Отправить отчёт');
      onClick(handleSubmit);
      show();
    } else {
      hide();
    }
  }, [isValid]);

  return (
    <form onSubmit={handleSubmit}>
      {/* Ваша форма */}
    </form>
  );
}
```

## 🎯 Преимущества

### ✅ Для разработчиков
- **Никаких ручных действий** — всё автоматически
- **Полная эмуляция API** — код работает одинаково
- **Визуальная обратная связь** — видите как работают кнопки
- **Быстрое переключение ролей** — тестируйте разные сценарии

### ✅ Для тестирования
- **Детерминированные пользователи** — предсказуемые тесты
- **Консольное логирование** — отслеживайте все события
- **Визуальные эффекты** — понятно что происходит
- **Мгновенное переключение** — не нужно настраивать

### ✅ Для демонстрации
- **Работает в любом браузере** — не нужен Telegram
- **Красивый интерфейс** — показывает возможности
- **Реалистичное поведение** — как настоящий Telegram

## 🔍 Отладка

### Консольные сообщения
Mock выводит подробные логи:

```javascript
🤖 Инициализация Telegram Mock для разработки...
✅ Telegram Mock инициализирован
👤 Текущий пользователь: {first_name: 'Мухамед', role: 'employee'}
💡 Подсказка: используйте ?mock_role=admin|manager|employee для смены роли

🔘 MainButton setText: Отправить отчёт
👁️ MainButton show
🔘 Mock MainButton clicked
📳 HapticFeedback: heavy
```

### Проблемы и решения

**Mock не инициализируется:**
- Проверьте `NODE_ENV === 'development'`
- Убедитесь что `window.Telegram` отсутствует
- Проверьте консоль на ошибки импорта

**Кнопки не работают:**
- Проверьте что обработчики установлены
- Убедитесь что кнопки показаны (`.show()`)
- Проверьте логи в консоли

**Данные пользователя неправильные:**
- Используйте правильные параметры URL
- Проверьте список доступных пользователей
- Обновите страницу после смены параметров

## 🎉 Результат

**Теперь ваше приложение работает как настоящий Telegram WebApp в любом браузере!**

- ✅ Автоматическая инициализация
- ✅ Полная эмуляция API  
- ✅ Визуальная обратная связь
- ✅ Простое переключение ролей
- ✅ Детальное логирование
- ✅ Готово к демонстрации

**Никаких костылей, никаких ручных действий — просто запустите и используйте!** 🚀 