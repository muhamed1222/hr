import { Link } from 'react-router-dom';
import { useDevModeToggle } from '@/hooks/useDevModeToggle';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TestTube, ExternalLink } from 'lucide-react';

/**
 * 🧪 TelegramTestingLink — ссылка на страницу тестирования WebApp
 * Показывается только в dev режиме
 */
export default function TelegramTestingLink({ className = '' }) {
  const { isDevMode } = useDevModeToggle();

  // Показываем только в dev режиме
  if (!isDevMode) return null;

  return (
    <Card className={`p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <TestTube className="w-5 h-5 text-white" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              🧪 Тестирование WebApp
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Комплексная проверка всей Telegram WebApp функциональности в одном месте
            </p>
            
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-4">
              <div className="flex items-center space-x-1">
                <span>🔘</span>
                <span>MainButton тест</span>
              </div>
              <div className="flex items-center space-x-1">
                <span>🔘</span>
                <span>Alert & Confirm</span>
              </div>
              <div className="flex items-center space-x-1">
                <span>🔘</span>
                <span>Deep Links</span>
              </div>
              <div className="flex items-center space-x-1">
                <span>🔘</span>
                <span>Haptic Feedback</span>
              </div>
              <div className="flex items-center space-x-1">
                <span>🔘</span>
                <span>Push уведомления</span>
              </div>
              <div className="flex items-center space-x-1">
                <span>🔘</span>
                <span>Тестовые отчёты</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Link to="/dev/test-telegram">
                <Button size="sm" className="flex items-center space-x-2">
                  <span>Открыть тестирование</span>
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </Link>
              
              <div className="flex items-center space-x-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                <span>⚠️</span>
                <span>Dev Only</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-4 p-3 bg-white bg-opacity-60 rounded-lg">
        <div className="text-xs text-gray-600">
          <div className="font-medium mb-1">🎯 Для кого:</div>
          <div className="mb-2">
            • Разработчики — проверка интеграции<br/>
            • QA — тестирование функциональности<br/>
            • Демонстрации — показ возможностей
          </div>
          <div className="font-medium mb-1">⚡ Что проверяется:</div>
          <div>
            Все Telegram WebApp API: кнопки, диалоги, вибрация, deep links, уведомления
          </div>
        </div>
      </div>
    </Card>
  );
} 