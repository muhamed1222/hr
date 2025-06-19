import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useIsTelegram } from '@/hooks/useIsTelegram';
import { useDevModeToggle } from '@/hooks/useDevModeToggle';
import { getTelegramUser } from '@/lib/telegram';
import { CheckCircle, User, Crown, Target, X } from 'lucide-react';

/**
 * 👤 TelegramAuthStatus — статус авторизации через Telegram
 * Показывает информацию о залогиненном пользователе
 */
export default function TelegramAuthStatus({ variant = 'header', className = '' }) {
  const { user, isAuthenticated } = useAuthStore();
  const { isTelegram } = useIsTelegram();
  const { isDevMode, isTelegramMode, mockUser } = useDevModeToggle();
  
  const tgUser = getTelegramUser();

  // Определяем источник данных пользователя
  const userSource = isTelegram ? 'telegram' : 'web';
  const displayUser = tgUser || user;

  if (!isAuthenticated || !displayUser) return null;

  // Компактная версия для хедера
  if (variant === 'header') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {/* Индикатор Telegram */}
        {isTelegram && (
          <div className="flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
            <span>📱</span>
            <span>Telegram</span>
          </div>
        )}
        
        {/* Dev режим badge */}
        {isDevMode && (
          <div className="flex items-center space-x-1 px-2 py-1 bg-gray-800 text-white rounded-full text-xs font-medium">
            <span>🔧</span>
            <span>DEV</span>
          </div>
        )}

        {/* Информация о пользователе */}
        <div className="text-sm">
          <span className="font-medium">
            👤 {displayUser.first_name || displayUser.name || user?.username}
            {displayUser.last_name && ` ${displayUser.last_name}`}
            {tgUser?.username && ` (@${tgUser.username})`}
          </span>
          <span className="text-gray-500 ml-2">
            • {getRoleDisplayText(user?.role)}
          </span>
        </div>
      </div>
    );
  }

  // Полная версия для профиля
  if (variant === 'profile') {
    return (
      <div className={`bg-white rounded-lg border shadow-sm p-4 ${className}`}>
        <div className="flex items-start space-x-4">
          {/* Аватар */}
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xl font-bold">
              {getInitials(displayUser.first_name || displayUser.name || user?.username)}
            </span>
          </div>

          {/* Информация */}
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {displayUser.first_name || displayUser.name || user?.username}
                {displayUser.last_name && ` ${displayUser.last_name}`}
              </h3>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>

            {tgUser?.username && (
              <p className="text-gray-600 mb-1">@{tgUser.username}</p>
            )}

            <div className="flex items-center space-x-2 mb-3">
              {getRoleIcon(user?.role)}
              <span className="text-sm font-medium text-gray-700">
                {getRoleDisplayText(user?.role)}
              </span>
            </div>

            {/* Статус авторизации */}
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                <CheckCircle className="w-3 h-3" />
                <span>Авторизован</span>
              </div>
              
              {isTelegram && (
                <div className="flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  <span>📱</span>
                  <span>Telegram WebApp</span>
                </div>
              )}

              {isDevMode && (
                <div className="flex items-center space-x-1 px-2 py-1 bg-gray-800 text-white rounded-full text-xs font-medium">
                  <span>🔧</span>
                  <span>Dev Mode</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * 🎉 WelcomeMessage — приветственное сообщение для новых пользователей
 */
export function WelcomeMessage({ className = '' }) {
  const { user, isAuthenticated } = useAuthStore();
  const { isTelegram } = useIsTelegram();
  const { isDevMode } = useDevModeToggle();
  const [isVisible, setIsVisible] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);

  const tgUser = getTelegramUser();
  const displayUser = tgUser || user;

  useEffect(() => {
    if (!isAuthenticated || !displayUser) return;

    // Проверяем, первый ли это вход пользователя
    const welcomeKey = `welcome_shown_${user?.id || displayUser.id}`;
    const hasShownWelcome = localStorage.getItem(welcomeKey);

    if (!hasShownWelcome) {
      setIsFirstTime(true);
      setIsVisible(true);
      
      // Помечаем что welcome показали
      localStorage.setItem(welcomeKey, 'true');
      
      // Автоскрытие через 5 секунд
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, displayUser, user]);

  if (!isVisible || !isFirstTime) return null;

  const firstName = displayUser.first_name || displayUser.name || user?.username || 'Коллега';

  return (
    <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-40 max-w-md mx-auto ${className}`}>
      <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-lg shadow-lg p-4 animate-in slide-in-from-top-5 duration-500">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">🎉</span>
            </div>
            
            <div className="flex-1">
              <h4 className="font-semibold text-lg mb-1">
                Добро пожаловать, {firstName}!
              </h4>
              <p className="text-sm text-green-100 mb-2">
                Вы успешно авторизованы {isTelegram ? 'через Telegram' : 'в системе'}.
              </p>
              
              <div className="flex items-center space-x-2 text-xs">
                <div className="flex items-center space-x-1 px-2 py-1 bg-white bg-opacity-20 rounded-full">
                  {getRoleIcon(user?.role, 'w-3 h-3')}
                  <span>{getRoleDisplayText(user?.role)}</span>
                </div>
                
                {isTelegram && (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-white bg-opacity-20 rounded-full">
                    <span>📱</span>
                    <span>WebApp</span>
                  </div>
                )}

                {isDevMode && (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-gray-800 bg-opacity-50 rounded-full">
                    <span>🔧</span>
                    <span>Dev</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsVisible(false)}
            className="w-6 h-6 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
            title="Закрыть"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {/* Прогресс-бар автоскрытия */}
        <div className="mt-3 h-1 bg-white bg-opacity-20 rounded-full overflow-hidden">
          <div 
            className="h-full bg-white bg-opacity-50 rounded-full animate-pulse"
            style={{ 
              animation: 'shrink 5s linear forwards',
            }}
          />
        </div>
      </div>

      {/* CSS анимация для прогресс-бара */}
      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}

/**
 * 📱 TelegramUserBadge — компактный бейдж в стиле Telegram
 */
export function TelegramUserBadge({ className = '' }) {
  const { user } = useAuthStore();
  const { isTelegram } = useIsTelegram();
  const tgUser = getTelegramUser();

  if (!isTelegram || !tgUser) return null;

  return (
    <div className={`inline-flex items-center space-x-2 px-3 py-1 bg-blue-500 text-white rounded-full text-sm font-medium ${className}`}>
      <span>📱</span>
      <span>
        {tgUser.first_name}
        {tgUser.username && ` (@${tgUser.username})`}
      </span>
      <span className="text-blue-200">•</span>
      <span className="text-blue-200">{getRoleDisplayText(user?.role)}</span>
    </div>
  );
}

// Утилиты
function getRoleDisplayText(role) {
  switch (role) {
    case 'admin': return 'Администратор';
    case 'manager': return 'Менеджер';
    case 'employee': return 'Сотрудник';
    default: return 'Пользователь';
  }
}

function getRoleIcon(role, className = 'w-4 h-4') {
  switch (role) {
    case 'admin': 
      return <Crown className={`${className} text-yellow-500`} />;
    case 'manager': 
      return <Target className={`${className} text-blue-500`} />;
    case 'employee': 
      return <User className={`${className} text-green-500`} />;
    default: 
      return <User className={`${className} text-gray-500`} />;
  }
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
} 