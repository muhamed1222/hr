import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useTelegramStartParam } from '../hooks/useTelegramStartParam';
import { useTelegramAuth } from '../auth/useTelegramAuth';

const TelegramDeepLink = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();
  const startParam = useTelegramStartParam();
  const { initDataUnsafe, webApp } = useTelegramAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [deepLinkProcessed, setDeepLinkProcessed] = useState(false);

  // Обработка Telegram авторизации
  useEffect(() => {
    const handleTelegramAuth = async () => {
      if (!initDataUnsafe?.user || isProcessing) return;

      setIsProcessing(true);
      
      try {
        const telegramData = {
          id: initDataUnsafe.user.id,
          first_name: initDataUnsafe.user.first_name,
          last_name: initDataUnsafe.user.last_name,
          username: initDataUnsafe.user.username,
          language_code: initDataUnsafe.user.language_code,
          hash: initDataUnsafe.hash,
          auth_date: initDataUnsafe.auth_date
        };

        const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/telegram`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(telegramData),
        });

        if (response.ok) {
          const data = await response.json();
          login(data.user, data.token);
          
          // Показываем уведомление об успешной авторизации
          if (webApp?.showAlert) {
            webApp.showAlert(`Добро пожаловать, ${data.user.firstName}!`);
          }
        } else {
          console.error('Telegram auth failed:', await response.text());
          if (webApp?.showAlert) {
            webApp.showAlert('Ошибка авторизации через Telegram');
          }
        }
      } catch (error) {
        console.error('Telegram auth error:', error);
        if (webApp?.showAlert) {
          webApp.showAlert('Ошибка подключения к серверу');
        }
      } finally {
        setIsProcessing(false);
      }
    };

    handleTelegramAuth();
  }, [initDataUnsafe, login, webApp, isProcessing]);

  // Обработка deep linking
  useEffect(() => {
    if (!startParam || deepLinkProcessed) return;

    const handleDeepLink = async () => {
      setDeepLinkProcessed(true);

      // Ждём завершения авторизации
      const maxWait = 3000; // 3 секунды
      const startTime = Date.now();
      
      while (isProcessing && (Date.now() - startTime) < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Обработка различных deep link параметров
      switch (startParam) {
        case 'report':
          navigate('/reports', { replace: true });
          if (webApp?.showAlert) {
            webApp.showAlert('📊 Переход к отчётам');
          }
          break;

        case 'stats':
          navigate('/dashboard', { 
            replace: true, 
            state: { showStats: true } 
          });
          if (webApp?.showAlert) {
            webApp.showAlert('📈 Переход к статистике');
          }
          break;

        case 'profile':
          navigate('/profile', { replace: true });
          if (webApp?.showAlert) {
            webApp.showAlert('👤 Переход к профилю');
          }
          break;

        case 'logs':
        case 'worklogs':
          navigate('/work-logs', { replace: true });
          if (webApp?.showAlert) {
            webApp.showAlert('⏰ Переход к рабочим логам');
          }
          break;

        default:
          // Неизвестный параметр - переходим на главную
          navigate('/dashboard', { replace: true });
          if (webApp?.showAlert) {
            webApp.showAlert(`🏠 Добро пожаловать! (${startParam})`);
          }
      }

      // Обновляем URL, убирая startapp параметр
      const newUrl = new URL(window.location);
      newUrl.searchParams.delete('tgWebAppStartParam');
      window.history.replaceState({}, '', newUrl.pathname + newUrl.search);
    };

    handleDeepLink();
  }, [startParam, navigate, deepLinkProcessed, isProcessing, webApp]);

  // Обработка query параметров из URL (fallback)
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const startAppParam = urlParams.get('startapp');
    
    if (startAppParam && !deepLinkProcessed) {
      // Используем тот же механизм обработки
      const simulatedStartParam = startAppParam;
      
      setTimeout(() => {
        switch (simulatedStartParam) {
          case 'report':
            navigate('/reports', { replace: true });
            break;
          case 'stats':  
            navigate('/dashboard', { state: { showStats: true }, replace: true });
            break;
          case 'profile':
            navigate('/profile', { replace: true });
            break;
          default:
            navigate('/dashboard', { replace: true });
        }
        
        // Очищаем URL
        const newUrl = new URL(window.location);
        newUrl.searchParams.delete('startapp');
        window.history.replaceState({}, '', newUrl.pathname + newUrl.search);
      }, 500);
      
      setDeepLinkProcessed(true);
    }
  }, [location.search, navigate, deepLinkProcessed]);

  // Показываем индикатор загрузки при обработке
  if (isProcessing) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-700">Вход через Telegram...</span>
          </div>
        </div>
      </div>
    );
  }

  return null; // Компонент не рендерит ничего после обработки
};

export default TelegramDeepLink; 