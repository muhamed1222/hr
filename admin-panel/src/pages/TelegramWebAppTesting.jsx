import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { useIsTelegram } from '@/hooks/useIsTelegram';
import { useDevModeToggle } from '@/hooks/useDevModeToggle';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  getTelegramUser, 
  setupMainButton, 
  setupBackButton, 
  showTelegramAlert, 
  showTelegramConfirm,
  sendHapticFeedback,
  showTelegramPopup,
  closeTelegramApp,
  isInsideTelegram
} from '@/lib/telegram';
import { 
  Play, 
  AlertCircle, 
  CheckCircle, 
  MessageSquare, 
  Zap, 
  Bell, 
  ExternalLink,
  ArrowLeft,
  TestTube,
  Smartphone,
  Globe
} from 'lucide-react';

/**
 * 🧪 TelegramWebAppTesting — dev-страница для тестирования WebApp функциональности
 */
export default function TelegramWebAppTesting() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { isTelegram } = useIsTelegram();
  const { isDevMode, isTelegramMode } = useDevModeToggle();
  
  const [testResults, setTestResults] = useState({});
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [logs, setLogs] = useState([]);

  const tgUser = getTelegramUser();

  // Добавление лога
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
  };

  // Очистка логов
  const clearLogs = () => setLogs([]);

  // Отметка результата теста
  const markTestResult = (testId, success, message = '') => {
    setTestResults(prev => ({
      ...prev,
      [testId]: { success, message, timestamp: new Date().toLocaleTimeString() }
    }));
    addLog(`${testId}: ${success ? '✅' : '❌'} ${message}`, success ? 'success' : 'error');
  };

  // Тесты WebApp функциональности
  const tests = [
    {
      id: 'main_button',
      title: 'MainButton тест',
      description: 'Показать главную кнопку с текстом и обработчиком',
      icon: <Play className="w-5 h-5" />,
      action: () => {
        try {
          setupMainButton('Тест успешен! 🎉', () => {
            markTestResult('main_button', true, 'MainButton нажата');
            addLog('MainButton callback вызван', 'success');
            
            // Скрываем кнопку через 2 секунды
            setTimeout(() => {
              if (window.Telegram?.WebApp?.MainButton) {
                window.Telegram.WebApp.MainButton.hide();
                addLog('MainButton скрыта', 'info');
              }
            }, 2000);
          });
          addLog('MainButton настроена', 'info');
        } catch (error) {
          markTestResult('main_button', false, error.message);
        }
      }
    },
    {
      id: 'back_button',
      title: 'BackButton тест',
      description: 'Показать кнопку "Назад" и обработать нажатие',
      icon: <ArrowLeft className="w-5 h-5" />,
      action: () => {
        try {
          setupBackButton(() => {
            markTestResult('back_button', true, 'BackButton нажата');
            addLog('BackButton callback вызван', 'success');
            
            // Скрываем кнопку
            if (window.Telegram?.WebApp?.BackButton) {
              window.Telegram.WebApp.BackButton.hide();
              addLog('BackButton скрыта', 'info');
            }
          });
          addLog('BackButton настроена', 'info');
        } catch (error) {
          markTestResult('back_button', false, error.message);
        }
      }
    },
    {
      id: 'alert',
      title: 'Alert тест',
      description: 'Показать нативное уведомление Telegram',
      icon: <AlertCircle className="w-5 h-5" />,
      action: () => {
        try {
          showTelegramAlert('🎉 Уведомление сработало!\n\nЭто тестовое сообщение из WebApp.', () => {
            markTestResult('alert', true, 'Alert показан и закрыт');
            addLog('Alert callback вызван', 'success');
          });
          addLog('Alert вызван', 'info');
        } catch (error) {
          markTestResult('alert', false, error.message);
        }
      }
    },
    {
      id: 'confirm',
      title: 'Confirm тест',
      description: 'Показать диалог подтверждения',
      icon: <CheckCircle className="w-5 h-5" />,
      action: () => {
        try {
          showTelegramConfirm('🤔 Подтвердить действие?', (confirmed) => {
            const result = confirmed ? 'подтверждено' : 'отменено';
            markTestResult('confirm', true, `Действие ${result}`);
            addLog(`Confirm ${result}`, confirmed ? 'success' : 'warning');
          });
          addLog('Confirm вызван', 'info');
        } catch (error) {
          markTestResult('confirm', false, error.message);
        }
      }
    },
    {
      id: 'haptic',
      title: 'Haptic тест',
      description: 'Тактильная обратная связь (вибрация)',
      icon: <Zap className="w-5 h-5" />,
      action: () => {
        try {
          // Последовательность разных типов вибрации
          sendHapticFeedback('impact', 'light');
          setTimeout(() => sendHapticFeedback('impact', 'medium'), 200);
          setTimeout(() => sendHapticFeedback('impact', 'heavy'), 400);
          setTimeout(() => sendHapticFeedback('notification', 'success'), 600);
          
          markTestResult('haptic', true, 'Haptic feedback отправлен');
          addLog('Haptic sequence выполнен', 'success');
        } catch (error) {
          markTestResult('haptic', false, error.message);
        }
      }
    },
    {
      id: 'deeplink_profile',
      title: 'Deep Link: Профиль',
      description: 'Открыть профиль сотрудника через deep link',
      icon: <ExternalLink className="w-5 h-5" />,
      action: () => {
        try {
          const employeeId = '123';
          const url = `/employee/${employeeId}?action=view&from=test`;
          navigate(url);
          markTestResult('deeplink_profile', true, `Переход на ${url}`);
          addLog(`Deep link выполнен: ${url}`, 'success');
        } catch (error) {
          markTestResult('deeplink_profile', false, error.message);
        }
      }
    },
    {
      id: 'deeplink_logs',
      title: 'Deep Link: Логи',
      description: 'Открыть страницу логов работы',
      icon: <ExternalLink className="w-5 h-5" />,
      action: () => {
        try {
          const url = `/logs?user=${user?.id}&date=${new Date().toISOString().split('T')[0]}`;
          navigate(url);
          markTestResult('deeplink_logs', true, `Переход на ${url}`);
          addLog(`Deep link выполнен: ${url}`, 'success');
        } catch (error) {
          markTestResult('deeplink_logs', false, error.message);
        }
      }
    },
    {
      id: 'test_report',
      title: 'Тестовый отчёт',
      description: 'Отправить mock-отчёт через WebApp',
      icon: <MessageSquare className="w-5 h-5" />,
      action: async () => {
        try {
          const reportData = {
            description: 'Тестовый отчёт из WebApp Testing',
            hours: 8,
            project: 'Test Project',
            date: new Date().toISOString().split('T')[0],
            tags: ['testing', 'webapp']
          };

          addLog('Отправка тестового отчёта...', 'info');
          
          // Имитация API запроса
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          markTestResult('test_report', true, 'Отчёт отправлен');
          addLog(`Отчёт создан: ${reportData.description}`, 'success');
          
          // Показываем успех через Telegram
          if (isTelegram) {
            showTelegramAlert('✅ Тестовый отчёт успешно отправлен!');
          }
        } catch (error) {
          markTestResult('test_report', false, error.message);
        }
      }
    },
    {
      id: 'push_notification',
      title: 'Push уведомление',
      description: 'Симуляция push-уведомления',
      icon: <Bell className="w-5 h-5" />,
      action: () => {
        try {
          // Используем новую функцию showTelegramPopup
          showTelegramPopup({
            title: '🔔 Push уведомление',
            message: 'Это симуляция push-уведомления в Telegram WebApp\n\nВ реальном приложении это будет приходить автоматически.',
            buttons: [
              { id: 'ok', type: 'ok', text: 'Понятно' },
              { id: 'cancel', type: 'cancel' }
            ]
          }, (buttonId) => {
            if (buttonId === 'ok') {
              markTestResult('push_notification', true, 'Push уведомление подтверждено');
              addLog('Push notification: пользователь нажал "Понятно"', 'success');
            } else {
              markTestResult('push_notification', true, 'Push уведомление отменено');
              addLog('Push notification: пользователь нажал "Отмена"', 'warning');
            }
          });
          addLog('Push notification запущен', 'info');
        } catch (error) {
          markTestResult('push_notification', false, error.message);
        }
      }
    },
    {
      id: 'close_app',
      title: 'Закрыть WebApp',
      description: 'Закрыть WebApp (будет показано предупреждение)',
      icon: <ExternalLink className="w-5 h-5" />,
      action: () => {
        try {
          showTelegramConfirm('⚠️ Закрыть WebApp?\n\nЭто закроет приложение в Telegram.', (confirmed) => {
            if (confirmed) {
              markTestResult('close_app', true, 'WebApp закрыт');
              addLog('WebApp будет закрыт', 'warning');
              setTimeout(() => {
                closeTelegramApp();
              }, 1000);
            } else {
              markTestResult('close_app', true, 'Закрытие отменено');
              addLog('Закрытие WebApp отменено', 'info');
            }
          });
        } catch (error) {
          markTestResult('close_app', false, error.message);
        }
      }
    }
  ];

  // Запуск всех тестов
  const runAllTests = async () => {
    setIsRunningTests(true);
    clearLogs();
    addLog('🚀 Запуск всех тестов...', 'info');

    for (const test of tests.slice(0, -1)) { // Исключаем "закрыть app"
      try {
        addLog(`Выполнение: ${test.title}`, 'info');
        await test.action();
        await new Promise(resolve => setTimeout(resolve, 1000)); // Пауза между тестами
      } catch (error) {
        addLog(`Ошибка в ${test.title}: ${error.message}`, 'error');
      }
    }

    setIsRunningTests(false);
    addLog('✅ Все тесты завершены', 'success');
  };

  // Настройка BackButton для выхода со страницы
  useEffect(() => {
    if (isTelegram) {
      setupBackButton(() => {
        navigate('/settings');
      });

      return () => {
        if (window.Telegram?.WebApp?.BackButton) {
          window.Telegram.WebApp.BackButton.hide();
        }
      };
    }
  }, [isTelegram, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Заголовок */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <TestTube className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Тестирование Telegram WebApp
              </h1>
              <p className="text-gray-600">
                Проверка всей функциональности в 1 клик
              </p>
            </div>
          </div>

          {/* Статус среды */}
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
              isTelegram ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {isTelegram ? <Smartphone className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
              <span>{isTelegram ? 'Telegram WebApp' : 'Браузер'}</span>
            </div>

            {isDevMode && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-gray-800 text-white rounded-full text-sm font-medium">
                <span>🔧</span>
                <span>Dev Mode</span>
              </div>
            )}

            {isTelegramMode && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                <span>🎭</span>
                <span>Mock активен</span>
              </div>
            )}
          </div>

          {/* Быстрые действия */}
          <div className="flex items-center justify-center space-x-4">
            <Button
              onClick={runAllTests}
              disabled={isRunningTests}
              className="flex items-center space-x-2"
            >
              <Play className="w-4 h-4" />
              <span>{isRunningTests ? 'Выполняется...' : 'Запустить все тесты'}</span>
            </Button>

            <Button variant="outline" onClick={clearLogs}>
              Очистить логи
            </Button>

            <Button variant="outline" onClick={() => navigate('/settings')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад к настройкам
            </Button>
          </div>
        </div>

        {/* Информация о пользователе и WebApp */}
        {(tgUser || user) && (
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-3">Информация о пользователе</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {tgUser && (
                <>
                  <div>
                    <span className="text-gray-500">Telegram ID:</span>
                    <span className="ml-2 font-mono">{tgUser.id}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Имя:</span>
                    <span className="ml-2">{tgUser.first_name} {tgUser.last_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Username:</span>
                    <span className="ml-2">@{tgUser.username || 'Не указан'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Язык:</span>
                    <span className="ml-2">{tgUser.language_code || 'Не указан'}</span>
                  </div>
                </>
              )}
              <div>
                <span className="text-gray-500">Роль в системе:</span>
                <span className="ml-2">{user?.role || 'Не авторизован'}</span>
              </div>
              <div>
                <span className="text-gray-500">WebApp версия:</span>
                <span className="ml-2">{window.Telegram?.WebApp?.version || 'N/A'}</span>
              </div>
            </div>
          </Card>
        )}

        {/* Детальная информация о initData (только в dev режиме) */}
        {isDevMode && window.Telegram?.WebApp?.initData && (
          <Card className="p-4">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-6 h-6 bg-purple-600 rounded flex items-center justify-center">
                <span className="text-white text-xs">🔐</span>
              </div>
              <h3 className="text-lg font-semibold">initData с подписью (DEV)</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Длина initData:</span>
                <span className="ml-2 font-mono">{window.Telegram.WebApp.initData.length} символов</span>
              </div>
              
              <div>
                <span className="text-gray-500">Время авторизации:</span>
                <span className="ml-2">
                  {new Date(window.Telegram.WebApp.initDataUnsafe.auth_date * 1000).toLocaleString()}
                </span>
              </div>
              
              <div className="lg:col-span-2">
                <span className="text-gray-500">Hash подписи:</span>
                <div className="mt-1 p-2 bg-gray-100 rounded font-mono text-xs break-all">
                  {window.Telegram.WebApp.initDataUnsafe.hash}
                </div>
              </div>
              
              <div className="lg:col-span-2">
                <span className="text-gray-500">Полный initData:</span>
                <div className="mt-1 p-2 bg-gray-100 rounded font-mono text-xs break-all max-h-32 overflow-y-auto">
                  {window.Telegram.WebApp.initData}
                </div>
              </div>
            </div>
            
            <div className="mt-4 flex items-center space-x-2 p-3 bg-green-50 rounded">
              <span className="text-green-600">✅</span>
              <span className="text-green-800 text-sm">
                initData сгенерирован с HMAC-SHA256 подписью по алгоритму Telegram
              </span>
            </div>
          </Card>
        )}

        {/* Тесты */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tests.map(test => {
            const result = testResults[test.id];
            return (
              <Card key={test.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {test.icon}
                    <h3 className="font-semibold">{test.title}</h3>
                  </div>
                  {result && (
                    <div className={`w-3 h-3 rounded-full ${
                      result.success ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                  )}
                </div>

                <p className="text-sm text-gray-600 mb-4">{test.description}</p>

                <Button
                  onClick={test.action}
                  disabled={isRunningTests}
                  size="sm"
                  className="w-full"
                >
                  Запустить тест
                </Button>

                {result && (
                  <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                    <div className={`font-medium ${
                      result.success ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {result.success ? '✅ Успешно' : '❌ Ошибка'}
                    </div>
                    {result.message && (
                      <div className="text-gray-600 mt-1">{result.message}</div>
                    )}
                    <div className="text-gray-500 mt-1">{result.timestamp}</div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Логи */}
        {logs.length > 0 && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Логи выполнения</h3>
              <Button variant="outline" size="sm" onClick={clearLogs}>
                Очистить
              </Button>
            </div>
            
            <div className="max-h-60 overflow-y-auto space-y-1">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={`flex items-start space-x-2 text-sm p-2 rounded ${
                    log.type === 'success' ? 'bg-green-50 text-green-800' :
                    log.type === 'error' ? 'bg-red-50 text-red-800' :
                    log.type === 'warning' ? 'bg-yellow-50 text-yellow-800' :
                    'bg-gray-50 text-gray-800'
                  }`}
                >
                  <span className="text-gray-500 font-mono text-xs">{log.timestamp}</span>
                  <span className="flex-1">{log.message}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Предупреждение для браузера */}
        {!isTelegram && (
          <Card className="p-4 bg-yellow-50 border-yellow-200">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-yellow-800">Режим браузера</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Некоторые тесты могут работать по-разному в браузере. 
                  Для полного тестирования откройте приложение в Telegram WebApp.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
} 