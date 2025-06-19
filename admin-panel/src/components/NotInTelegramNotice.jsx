import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useIsTelegram } from '@/hooks/useIsTelegram';
import { useDevModeToggle } from '@/hooks/useDevModeToggle';

/**
 * 📱 NotInTelegramNotice — уведомление для браузерных пользователей
 * Показывается когда приложение открыто не в Telegram
 */
export default function NotInTelegramNotice() {
  const { isAuthenticated } = useAuthStore();
  const { isTelegram } = useIsTelegram();
  const { isDevMode, isTelegramMode } = useDevModeToggle();
  const [isDismissed, setIsDismissed] = useState(false);

  // Показываем уведомление если:
  // 1. НЕ в Telegram (или выключен dev toggle)
  // 2. И пользователь НЕ авторизован (чтобы не мешать работающим админам)
  // 3. И уведомление не было закрыто
  const shouldShow = !isTelegram && !isAuthenticated && !isDismissed;

  // В dev режиме показываем только если Telegram режим выключен
  if (isDevMode && isTelegramMode) {
    return null;
  }

  if (!shouldShow) {
    return null;
  }

  const botUsername = 'hr_oc_bot'; // TODO: вынести в конфиг
  const telegramUrl = `https://t.me/${botUsername}?startapp=home`;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Иконка предупреждения */}
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            </div>

            {/* Основное сообщение */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold">
                  ❌ Вы не запустили приложение в Telegram
                </span>
                {isDevMode && (
                  <span className="px-2 py-1 bg-white bg-opacity-20 rounded text-xs font-medium">
                    DEV MODE
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-100 mt-1">
                Некоторые функции будут недоступны. Для полного опыта используйте Telegram WebApp.
              </p>
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="flex items-center space-x-2 ml-4">
            {/* Кнопка открытия в Telegram */}
            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-md text-sm font-medium transition-colors duration-200 border border-white border-opacity-30"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
              Запустить в Telegram
            </a>

            {/* Кнопка закрытия */}
            <button
              onClick={() => setIsDismissed(true)}
              className="w-8 h-8 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-md flex items-center justify-center transition-colors duration-200"
              title="Закрыть уведомление"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Дополнительная информация (раскрывающаяся) */}
        <ExpandableInfo botUsername={botUsername} />
      </div>
    </div>
  );
}

/**
 * 📖 Раскрывающаяся секция с дополнительной информацией
 */
function ExpandableInfo({ botUsername }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mt-3 border-t border-white border-opacity-20 pt-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center space-x-2 text-sm text-blue-100 hover:text-white transition-colors"
      >
        <svg 
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        <span>{isExpanded ? 'Скрыть' : 'Как запустить WebApp?'}</span>
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-3 text-sm text-blue-100">
          <div className="bg-white bg-opacity-10 rounded-lg p-4">
            <h4 className="font-semibold text-white mb-2">📱 Инструкция по запуску:</h4>
            <ol className="space-y-2 list-decimal list-inside">
              <li>Откройте Telegram на телефоне или в браузере</li>
              <li>Найдите бота <span className="font-mono bg-white bg-opacity-20 px-1 rounded">@{botUsername}</span></li>
              <li>Нажмите кнопку "Запустить" или отправьте команду <span className="font-mono bg-white bg-opacity-20 px-1 rounded">/start</span></li>
              <li>В меню бота выберите "Открыть приложение"</li>
            </ol>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white bg-opacity-10 rounded-lg p-3">
              <h5 className="font-semibold text-white mb-1">✅ В Telegram WebApp:</h5>
              <ul className="text-xs space-y-1">
                <li>• Мобильный интерфейс</li>
                <li>• Нативные кнопки</li>
                <li>• Push-уведомления</li>
                <li>• Полная интеграция</li>
              </ul>
            </div>

            <div className="bg-white bg-opacity-10 rounded-lg p-3">
              <h5 className="font-semibold text-white mb-1">⚠️ В браузере:</h5>
              <ul className="text-xs space-y-1">
                <li>• Ограниченный функционал</li>
                <li>• Нет уведомлений</li>
                <li>• Нет Telegram API</li>
                <li>• Только для демонстрации</li>
              </ul>
            </div>
          </div>

          <div className="text-center">
            <a
              href={`https://t.me/${botUsername}?startapp=home`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
              Открыть @{botUsername}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 🎯 Компактная версия уведомления (для мобильных устройств)
 */
export function NotInTelegramBanner() {
  const { isAuthenticated } = useAuthStore();
  const { isTelegram } = useIsTelegram();
  const { isDevMode, isTelegramMode } = useDevModeToggle();
  const [isDismissed, setIsDismissed] = useState(false);

  const shouldShow = !isTelegram && !isAuthenticated && !isDismissed;

  if (isDevMode && isTelegramMode) {
    return null;
  }

  if (!shouldShow) {
    return null;
  }

  const botUsername = 'hr_oc_bot';
  const telegramUrl = `https://t.me/${botUsername}?startapp=home`;

  return (
    <div className="bg-blue-600 text-white p-3 text-center text-sm">
      <div className="flex items-center justify-center space-x-2">
        <span>📱 Для лучшего опыта используйте Telegram</span>
        <a 
          href={telegramUrl}
          target="_blank"
          rel="noopener noreferrer" 
          className="underline hover:no-underline"
        >
          Открыть
        </a>
        <button 
          onClick={() => setIsDismissed(true)}
          className="ml-2 hover:bg-white hover:bg-opacity-20 rounded px-1"
        >
          ×
        </button>
      </div>
    </div>
  );
} 