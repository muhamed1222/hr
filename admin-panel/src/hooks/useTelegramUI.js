import { useEffect, useCallback } from "react";

export const useTelegramUI = () => {
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    // Инициализация WebApp
    tg.ready();
    tg.expand(); // Полный экран
    
    // Настройка цветовой схемы
    tg.setHeaderColor('#1f2937'); // темный заголовок
    tg.setBackgroundColor('#f9fafb'); // светлый фон
    
    // Скрываем кнопки по умолчанию
    tg.MainButton.hide();
    tg.BackButton.hide();
    
    console.log('🚀 Telegram WebApp инициализировано:', {
      platform: tg.platform,
      version: tg.version,
      colorScheme: tg.colorScheme,
      user: tg.initDataUnsafe?.user
    });

    return () => {
      // Очистка при размонтировании
      tg.MainButton.hide();
      tg.BackButton.hide();
    };
  }, []);
};

export const useTelegramMainButton = (text, onClick, isVisible = false) => {
  const setMainButton = useCallback((buttonText, handler, visible) => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    if (visible && buttonText && handler) {
      tg.MainButton.setText(buttonText);
      tg.MainButton.onClick(handler);
      tg.MainButton.show();
    } else {
      tg.MainButton.hide();
    }
  }, []);

  useEffect(() => {
    setMainButton(text, onClick, isVisible);
    
    return () => {
      const tg = window.Telegram?.WebApp;
      if (tg) {
        tg.MainButton.hide();
        tg.MainButton.offClick(onClick);
      }
    };
  }, [text, onClick, isVisible, setMainButton]);

  return setMainButton;
};

export const useTelegramBackButton = (onBack) => {
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    if (onBack) {
      tg.BackButton.onClick(onBack);
      tg.BackButton.show();
    } else {
      tg.BackButton.hide();
    }

    return () => {
      if (tg.BackButton) {
        tg.BackButton.hide();
        tg.BackButton.offClick(onBack);
      }
    };
  }, [onBack]);
};

export const showTelegramAlert = (message, callback) => {
  const tg = window.Telegram?.WebApp;
  if (tg?.showAlert) {
    tg.showAlert(message, callback);
  } else {
    alert(message);
    if (callback) callback();
  }
};

export const showTelegramConfirm = (message, callback) => {
  const tg = window.Telegram?.WebApp;
  if (tg?.showConfirm) {
    tg.showConfirm(message, callback);
  } else {
    const result = confirm(message);
    if (callback) callback(result);
  }
};

export const hapticFeedback = (type = 'light') => {
  const tg = window.Telegram?.WebApp;
  if (tg?.HapticFeedback) {
    tg.HapticFeedback.impactOccurred(type); // light, medium, heavy
  }
}; 