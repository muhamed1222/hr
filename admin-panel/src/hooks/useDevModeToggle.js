import { useState, useEffect } from 'react';

/**
 * 🔧 Dev Mode Toggle — переключатель Telegram режима для разработки
 * Позволяет вручную включать/выключать Telegram WebApp режим
 */

const DEV_STORAGE_KEY = 'hr_dev_telegram_mock';
const DEV_USER_KEY = 'hr_dev_mock_user';

export function useDevModeToggle() {
  const [isTelegramMode, setIsTelegramMode] = useState(false);
  const [mockUser, setMockUser] = useState('employee');
  const [isDevMode, setIsDevMode] = useState(false);

  // Проверяем development режим
  useEffect(() => {
    setIsDevMode(process.env.NODE_ENV === 'development');
  }, []);

  // Загружаем настройки из localStorage
  useEffect(() => {
    if (!isDevMode) return;

    const savedMode = localStorage.getItem(DEV_STORAGE_KEY);
    const savedUser = localStorage.getItem(DEV_USER_KEY);
    
    if (savedMode === 'true') {
      setIsTelegramMode(true);
    }
    
    if (savedUser) {
      setMockUser(savedUser);
    }
  }, [isDevMode]);

  // Переключение Telegram режима
  const toggleTelegramMode = () => {
    if (!isDevMode) return;

    const newMode = !isTelegramMode;
    setIsTelegramMode(newMode);
    localStorage.setItem(DEV_STORAGE_KEY, newMode.toString());

    // Перезагружаем страницу для применения изменений
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  // Смена mock пользователя
  const changeMockUser = (userRole) => {
    if (!isDevMode) return;

    setMockUser(userRole);
    localStorage.setItem(DEV_USER_KEY, userRole);

    // Обновляем URL параметр для мгновенного применения
    const url = new URL(window.location);
    url.searchParams.set('mock_role', userRole);
    window.history.replaceState(null, '', url.toString());

    // Если mock активен, перезагружаем страницу
    if (isTelegramMode) {
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  };

  // Сброс всех настроек
  const resetDevSettings = () => {
    if (!isDevMode) return;

    localStorage.removeItem(DEV_STORAGE_KEY);
    localStorage.removeItem(DEV_USER_KEY);
    setIsTelegramMode(false);
    setMockUser('employee');

    // Очищаем URL параметры
    const url = new URL(window.location);
    url.searchParams.delete('mock_role');
    url.searchParams.delete('mock_user');
    window.history.replaceState(null, '', url.toString());

    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  // Быстрые действия для тестирования
  const quickActions = {
    // Включить Telegram с определенной ролью
    enableTelegramAs: (role) => {
      if (!isDevMode) return;
      
      localStorage.setItem(DEV_STORAGE_KEY, 'true');
      localStorage.setItem(DEV_USER_KEY, role);
      
      const url = new URL(window.location);
      url.searchParams.set('mock_role', role);
      window.history.replaceState(null, '', url.toString());
      
      setTimeout(() => {
        window.location.reload();
      }, 100);
    },

    // Быстрое переключение между ролями (если Telegram уже включен)
    switchRole: (role) => {
      if (!isDevMode || !isTelegramMode) return;
      changeMockUser(role);
    },

    // Включить обычный веб режим
    enableWebMode: () => {
      if (!isDevMode) return;
      
      localStorage.setItem(DEV_STORAGE_KEY, 'false');
      
      const url = new URL(window.location);
      url.searchParams.delete('mock_role');
      url.searchParams.delete('mock_user');
      window.history.replaceState(null, '', url.toString());
      
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  };

  // Информация о текущем состоянии
  const status = {
    isDevMode,
    isTelegramMode,
    currentUser: mockUser,
    hasRealTelegram: !!window.Telegram?.WebApp?.initDataUnsafe?.user,
    isMocked: isDevMode && isTelegramMode && !window.location.href.includes('telegram.org')
  };

  return {
    // Основные состояния
    isDevMode,
    isTelegramMode,
    mockUser,
    status,

    // Действия
    toggleTelegramMode,
    changeMockUser,
    resetDevSettings,
    quickActions,

    // Утилиты
    isEnabled: isDevMode,
    canToggle: isDevMode
  };
}

// Вспомогательные константы для UI
export const DEV_MOCK_USERS = [
  { id: 'employee', name: 'Мухамед Келеметов', role: 'employee', emoji: '👨‍💼' },
  { id: 'manager', name: 'Петр Менеджеров', role: 'manager', emoji: '👨‍💼' },
  { id: 'admin', name: 'Анна Админова', role: 'admin', emoji: '👨‍🔧' }
];

// Быстрые команды для консоли разработчика
if (process.env.NODE_ENV === 'development') {
  window.devTelegram = {
    enable: () => {
      localStorage.setItem(DEV_STORAGE_KEY, 'true');
      window.location.reload();
    },
    disable: () => {
      localStorage.setItem(DEV_STORAGE_KEY, 'false');
      window.location.reload();
    },
    asEmployee: () => {
      localStorage.setItem(DEV_STORAGE_KEY, 'true');
      localStorage.setItem(DEV_USER_KEY, 'employee');
      window.location.href = window.location.pathname + '?mock_role=employee';
    },
    asAdmin: () => {
      localStorage.setItem(DEV_STORAGE_KEY, 'true');
      localStorage.setItem(DEV_USER_KEY, 'admin');
      window.location.href = window.location.pathname + '?mock_role=admin';
    },
    asManager: () => {
      localStorage.setItem(DEV_STORAGE_KEY, 'true');
      localStorage.setItem(DEV_USER_KEY, 'manager');
      window.location.href = window.location.pathname + '?mock_role=manager';
    },
    reset: () => {
      localStorage.removeItem(DEV_STORAGE_KEY);
      localStorage.removeItem(DEV_USER_KEY);
      window.location.href = window.location.pathname;
    }
  };
  
  console.log('🔧 Dev Commands доступны в window.devTelegram:');
  console.log('- devTelegram.enable() — включить Telegram режим');
  console.log('- devTelegram.disable() — выключить Telegram режим');
  console.log('- devTelegram.asEmployee() — включить как сотрудник');
  console.log('- devTelegram.asAdmin() — включить как админ');
  console.log('- devTelegram.asManager() — включить как менеджер');
  console.log('- devTelegram.reset() — сбросить все настройки');
} 