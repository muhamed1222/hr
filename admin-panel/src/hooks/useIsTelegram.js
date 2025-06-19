import { useState, useEffect } from 'react';

export function useIsTelegram() {
  const [isTelegram, setIsTelegram] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Проверяем сразу если Telegram уже доступен
    if (window.Telegram?.WebApp) {
      setIsTelegram(true);
      setIsReady(true);
      return;
    }

    // Ждем инициализации mock в development режиме
    const checkTelegram = () => {
      if (window.Telegram?.WebApp) {
        setIsTelegram(true);
        setIsReady(true);
      }
    };

    // Проверяем каждые 100ms до инициализации
    const interval = setInterval(checkTelegram, 100);
    
    // Очищаем интервал через 2 секунды
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

export function getTelegramUser() {
  const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
  
  // В mock режиме данные могут быть немного в другом формате
  if (user && process.env.NODE_ENV === 'development') {
    return {
      id: user.id,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      ...user
    };
  }
  
  return user || null;
}

export function isTelegramReady() {
  return window.Telegram?.WebApp !== undefined;
} 