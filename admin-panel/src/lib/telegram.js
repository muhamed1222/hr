// Автоматическая инициализация Mock в development режиме
if (process.env.NODE_ENV === 'development' && !window.Telegram) {
  // Проверяем настройки разработчика
  const devTelegramMode = localStorage.getItem('hr_dev_telegram_mock');
  
  // Если явно включен dev toggle ИЛИ нет настроек (первый запуск)
  if (devTelegramMode === 'true' || devTelegramMode === null) {
    import('./telegram-mock.js').then(async ({ initTelegramMock }) => {
      await initTelegramMock();
      console.log('🔐 Telegram Mock инициализирован с правильной подписью initData');
    });
  }
}

// Telegram WebApp SDK API
export const tg = window.Telegram?.WebApp;

/**
 * Проверяет, доступен ли Telegram WebApp API
 */
export function isTelegramWebApp() {
  return typeof tg !== 'undefined';
}

/**
 * Проверяет, запущено ли приложение внутри Telegram
 */
export function isInsideTelegram() {
  return !!window.Telegram?.WebApp?.initDataUnsafe?.user;
}

/**
 * Инициализация Telegram WebApp
 */
export function initTelegramApp() {
  if (!isTelegramWebApp()) {
    console.log('❌ Telegram WebApp не доступен (приложение запущено не в Telegram)');
    return;
  }

  // Готовность к работе
  tg.ready();
  
  // Развернуть во весь экран
  tg.expand();
  
  // Включить анимации закрытия (только если поддерживается)
  if (tg.isVersionAtLeast && tg.isVersionAtLeast('6.1')) {
    tg.enableClosingConfirmation();
  } else {
    console.log('⚠️ enableClosingConfirmation не поддерживается в данной версии WebApp');
  }
  
  console.log('✅ Telegram WebApp инициализирован');
  console.log('📱 Платформа:', tg.platform);
  console.log('👤 Пользователь:', tg.initDataUnsafe?.user);
  
  return tg;
}

/**
 * Получить данные пользователя Telegram
 */
export function getTelegramUser() {
  if (!isInsideTelegram()) return null;
  
  return tg.initDataUnsafe.user;
}

/**
 * Показать алерт в Telegram
 */
export function showTelegramAlert(message) {
  if (isTelegramWebApp()) {
    tg.showAlert(message);
  } else {
    alert(message);
  }
}

/**
 * Показать подтверждение в Telegram
 */
export function showTelegramConfirm(message, callback) {
  if (isTelegramWebApp()) {
    tg.showConfirm(message, callback);
  } else {
    const result = confirm(message);
    callback(result);
  }
}

/**
 * Настроить главную кнопку Telegram
 */
export function setupMainButton(text, onClick) {
  if (!isTelegramWebApp()) return;
  
  tg.MainButton.text = text;
  tg.MainButton.onClick(onClick);
  tg.MainButton.show();
}

/**
 * Скрыть главную кнопку
 */
export function hideMainButton() {
  if (!isTelegramWebApp()) return;
  tg.MainButton.hide();
}

/**
 * Настроить кнопку "Назад"
 */
export function setupBackButton(onClick) {
  if (!isTelegramWebApp()) return;
  
  tg.BackButton.onClick(onClick);
  tg.BackButton.show();
}

/**
 * Отправить данные обратно в бота
 */
export function sendTelegramData(data) {
  if (!isTelegramWebApp()) return;
  tg.sendData(JSON.stringify(data));
}

/**
 * Отправить тактильный отклик (вибрация)
 */
export function sendHapticFeedback(type = 'impact', style = 'medium') {
  if (!isTelegramWebApp()) return;
  
  if (type === 'impact') {
    tg.HapticFeedback.impactOccurred(style);
  } else if (type === 'notification') {
    tg.HapticFeedback.notificationOccurred(style);
  } else if (type === 'selection') {
    tg.HapticFeedback.selectionChanged();
  }
}

/**
 * Показать popup с кнопками
 */
export function showTelegramPopup(params, callback) {
  if (isTelegramWebApp() && tg.showPopup) {
    tg.showPopup(params, callback);
  } else {
    // Fallback для браузера
    showTelegramAlert(params.message, callback);
  }
}

/**
 * Проверить доступность версии API
 */
export function isVersionAtLeast(version) {
  if (!isTelegramWebApp()) return false;
  return tg.isVersionAtLeast(version);
}

/**
 * Закрыть WebApp
 */
export function closeTelegramApp() {
  if (isTelegramWebApp()) {
    tg.close();
  }
} 