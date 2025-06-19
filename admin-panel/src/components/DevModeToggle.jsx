import { useState } from 'react';
import { useDevModeToggle, DEV_MOCK_USERS } from '@/hooks/useDevModeToggle';

/**
 * 🔧 DevModeToggle — компонент для переключения Telegram режима
 * Отображается только в development режиме
 */
export default function DevModeToggle({ className = '' }) {
  const {
    isDevMode,
    isTelegramMode,
    mockUser,
    status,
    toggleTelegramMode,
    changeMockUser,
    resetDevSettings,
    quickActions
  } = useDevModeToggle();

  const [isExpanded, setIsExpanded] = useState(false);

  // Не показываем в production
  if (!isDevMode) return null;

  return (
    <div className={`dev-mode-toggle ${className}`}>
      {/* Компактный переключатель */}
      <div className="bg-gray-900 text-white rounded-lg p-4 shadow-lg border border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-xl">🔧</div>
            <div>
              <div className="font-semibold text-sm">Dev Mode</div>
              <div className="text-xs text-gray-400">
                {isTelegramMode ? '📱 Telegram режим' : '🌐 Веб режим'}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Основной переключатель */}
            <button
              onClick={toggleTelegramMode}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                isTelegramMode ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isTelegramMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            
            {/* Кнопка расширения */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-400 hover:text-white transition-colors p-1"
            >
              <svg 
                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Расширенная панель */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            {/* Статус */}
            <div className="mb-4">
              <div className="text-xs font-semibold text-gray-400 mb-2">СТАТУС</div>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Режим разработки:</span>
                  <span className="text-green-400">✓ Активен</span>
                </div>
                <div className="flex justify-between">
                  <span>Telegram WebApp:</span>
                  <span className={isTelegramMode ? 'text-green-400' : 'text-gray-500'}>
                    {isTelegramMode ? '✓ Включен' : '○ Выключен'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Mock пользователь:</span>
                  <span className="text-blue-400">
                    {DEV_MOCK_USERS.find(u => u.id === mockUser)?.emoji} {mockUser}
                  </span>
                </div>
                {status.hasRealTelegram && (
                  <div className="flex justify-between">
                    <span>Реальный Telegram:</span>
                    <span className="text-yellow-400">⚠ Обнаружен</span>
                  </div>
                )}
              </div>
            </div>

            {/* Переключение ролей */}
            {isTelegramMode && (
              <div className="mb-4">
                <div className="text-xs font-semibold text-gray-400 mb-2">РОЛЬ ПОЛЬЗОВАТЕЛЯ</div>
                <div className="grid grid-cols-3 gap-2">
                  {DEV_MOCK_USERS.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => changeMockUser(user.id)}
                      className={`p-2 rounded text-xs font-medium transition-colors ${
                        mockUser === user.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <div>{user.emoji}</div>
                      <div className="mt-1">{user.role}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Быстрые действия */}
            <div className="mb-4">
              <div className="text-xs font-semibold text-gray-400 mb-2">БЫСТРЫЕ ДЕЙСТВИЯ</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => quickActions.enableTelegramAs('employee')}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                >
                  📱 Как сотрудник
                </button>
                <button
                  onClick={() => quickActions.enableTelegramAs('admin')}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded transition-colors"
                >
                  🔧 Как админ
                </button>
                <button
                  onClick={() => quickActions.enableWebMode()}
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors"
                >
                  🌐 Веб режим
                </button>
                <button
                  onClick={resetDevSettings}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                >
                  🔄 Сброс
                </button>
              </div>
            </div>

            {/* Консольные команды */}
            <div>
              <div className="text-xs font-semibold text-gray-400 mb-2">КОНСОЛЬНЫЕ КОМАНДЫ</div>
              <div className="bg-black rounded p-2 text-xs font-mono">
                <div className="text-green-400">// В консоли браузера:</div>
                <div className="text-gray-300">devTelegram.enable()</div>
                <div className="text-gray-300">devTelegram.asAdmin()</div>
                <div className="text-gray-300">devTelegram.reset()</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 🎯 Компактная версия переключателя для угла экрана
 */
export function DevModeFloatingToggle() {
  const { isDevMode, isTelegramMode, toggleTelegramMode } = useDevModeToggle();
  const [isVisible, setIsVisible] = useState(true);

  if (!isDevMode) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isVisible ? (
        <div className="bg-gray-900 text-white rounded-full p-3 shadow-lg border border-gray-700 backdrop-blur-sm">
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleTelegramMode}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                isTelegramMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-700'
              }`}
              title={`${isTelegramMode ? 'Выключить' : 'Включить'} Telegram режим`}
            >
              {isTelegramMode ? '📱' : '🌐'}
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="w-6 h-6 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-xs"
              title="Скрыть"
            >
              ×
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsVisible(true)}
          className="w-10 h-10 bg-gray-900 text-white rounded-full shadow-lg border border-gray-700 flex items-center justify-center hover:bg-gray-800 transition-colors"
          title="Показать Dev Toggle"
        >
          🔧
        </button>
      )}
    </div>
  );
}
