import { useState } from 'react';
import { useTelegramUI } from '../hooks/useTelegramUI';

const DeepLinkTester = () => {
  const [selectedLink, setSelectedLink] = useState('');
  const { webApp } = useTelegramUI();

  const deepLinks = [
    {
      name: 'Отчёты',
      param: 'report',
      url: '?startapp=report',
      description: 'Переход к странице отчётов',
      icon: '📊'
    },
    {
      name: 'Статистика',
      param: 'stats', 
      url: '?startapp=stats',
      description: 'Переход к дашборду со статистикой',
      icon: '📈'
    },
    {
      name: 'Профиль',
      param: 'profile',
      url: '?startapp=profile', 
      description: 'Переход к профилю пользователя',
      icon: '👤'
    },
    {
      name: 'Рабочие логи',
      param: 'logs',
      url: '?startapp=logs',
      description: 'Переход к рабочим логам',
      icon: '⏰'
    }
  ];

  const testDeepLink = (linkData) => {
    const baseUrl = window.location.origin + window.location.pathname;
    const testUrl = baseUrl + linkData.url;
    
    // Открываем в новой вкладке для тестирования
    window.open(testUrl, '_blank');
    
    // Показываем уведомление
    if (webApp?.showAlert) {
      webApp.showAlert(`🔗 Тест: ${linkData.name}`);
    }
    
    setSelectedLink(linkData.param);
  };

  const generateTelegramDeepLink = (linkData) => {
    // Это будет ссылка для Telegram бота
    const botUsername = 'your_bot_username'; // Замените на реальное имя бота
    const telegramUrl = `https://t.me/${botUsername}/start?startapp=${linkData.param}`;
    
    return telegramUrl;
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      if (webApp?.showAlert) {
        webApp.showAlert('📋 Скопировано в буфер обмена!');
      }
    } catch (err) {
      console.error('Ошибка копирования:', err);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center space-x-2 mb-4">
        <span className="text-2xl">🔗</span>
        <h3 className="text-lg font-semibold text-gray-900">
          Тестирование Deep Links
        </h3>
      </div>
      
      <p className="text-gray-600 text-sm mb-6">
        Проверьте работу deep linking для различных разделов приложения
      </p>

      <div className="space-y-4">
        {deepLinks.map((link) => (
          <div 
            key={link.param} 
            className={`border rounded-lg p-4 transition-colors ${
              selectedLink === link.param 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-lg">{link.icon}</span>
                  <h4 className="font-medium text-gray-900">{link.name}</h4>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                    {link.param}
                  </code>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  {link.description}
                </p>
                
                <div className="space-y-2">
                  {/* URL для тестирования в браузере */}
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500 w-16">Браузер:</span>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded flex-1 font-mono">
                      {window.location.origin}{link.url}
                    </code>
                    <button
                      onClick={() => copyToClipboard(window.location.origin + link.url)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      📋
                    </button>
                  </div>
                  
                  {/* URL для Telegram */}
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500 w-16">Telegram:</span>
                    <code className="text-xs bg-blue-50 px-2 py-1 rounded flex-1 font-mono text-blue-800">
                      t.me/bot?start={link.param}
                    </code>
                    <button
                      onClick={() => copyToClipboard(generateTelegramDeepLink(link))}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      📋
                    </button>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => testDeepLink(link)}
                className="ml-4 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Тест
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <span className="text-yellow-600">⚠️</span>
          <div className="text-sm">
            <p className="font-medium text-yellow-800 mb-1">Инструкции по настройке:</p>
            <ol className="text-yellow-700 space-y-1 list-decimal list-inside">
              <li>Замените <code>your_bot_username</code> на имя вашего бота</li>
              <li>Настройте WebApp кнопку в @BotFather</li>
              <li>Добавьте URL: <code>https://outime.vercel.app</code></li>
              <li>Используйте параметры <code>?startapp=...</code> для deep linking</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeepLinkTester; 