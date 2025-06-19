import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useTelegramAuth } from '@/auth/useTelegramAuth'
import { useAuthStore } from '@/store/useAuthStore'
import { isInsideTelegram, getTelegramUser } from '@/lib/telegram'
import { Loader2, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginTelegram() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const {
    isLoading,
    error,
    loginWithTelegram,
    checkTelegramStatus,
    canUseTelegramAuth,
    getTelegramUserData,
    clearError
  } = useTelegramAuth()

  const [telegramStatus, setTelegramStatus] = useState(null)
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false)

  const isTelegram = canUseTelegramAuth()
  const tgUser = getTelegramUserData()

  // Проверяем статус Telegram при загрузке
  useEffect(() => {
    const checkStatus = async () => {
      const status = await checkTelegramStatus()
      setTelegramStatus(status)
    }
    checkStatus()
  }, [checkTelegramStatus])

  // Автоматический вход при открытии в Telegram
  useEffect(() => {
    if (isTelegram && !autoLoginAttempted && !isAuthenticated && telegramStatus?.enabled) {
      setAutoLoginAttempted(true)
      handleTelegramLogin()
    }
  }, [isTelegram, autoLoginAttempted, isAuthenticated, telegramStatus])

  // Перенаправление при успешной авторизации
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  const handleTelegramLogin = async () => {
    try {
      clearError()
      await loginWithTelegram()
      toast.success('Успешный вход через Telegram!')
    } catch (error) {
      toast.error(error.message || 'Ошибка входа через Telegram')
    }
  }

  const handleRegularLogin = () => {
    navigate('/login')
  }

  // Показываем загрузку при автоматическом входе
  if (isTelegram && !autoLoginAttempted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Инициализация Telegram
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Подготавливаем вход через Telegram...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        {/* Заголовок */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-2xl text-white">🚀</span>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Outcast TimeBot
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Система учета рабочего времени
          </p>
        </div>

        {/* Статус Telegram */}
        {isTelegram ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Запущено в Telegram
                </h3>
                <p className="text-sm text-green-700 mt-1">
                  Вы можете войти без пароля через Telegram WebApp
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Запущено в браузере
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Для входа без пароля откройте приложение в Telegram
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Данные пользователя Telegram */}
        {tgUser && (
          <div className="bg-white shadow rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Данные Telegram
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Имя:</span>
                <span className="text-gray-900">{tgUser.firstName} {tgUser.lastName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Username:</span>
                <span className="text-gray-900">@{tgUser.username || 'Не указан'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">ID:</span>
                <span className="text-gray-900">{tgUser.id}</span>
              </div>
            </div>
          </div>
        )}

        {/* Ошибка */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Ошибка аутентификации
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Кнопки входа */}
        <div className="space-y-4">
          {isTelegram && telegramStatus?.enabled ? (
            <Button
              onClick={handleTelegramLogin}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Вход через Telegram...
                </>
              ) : (
                <>
                  <span className="mr-2">📱</span>
                  Войти через Telegram
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              <Button
                onClick={handleRegularLogin}
                className="w-full"
              >
                Обычный вход (логин/пароль)
              </Button>
              
              {!telegramStatus?.enabled && (
                <p className="text-xs text-gray-500 text-center">
                  Telegram аутентификация не настроена на сервере
                </p>
              )}
            </div>
          )}
        </div>

        {/* Дополнительная информация */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            {isTelegram ? (
              'Вход через Telegram WebApp безопасен и не требует пароля'
            ) : (
              <>
                Для входа без пароля откройте{' '}
                <button
                  onClick={() => window.open('https://t.me/your_bot', '_blank')}
                  className="text-blue-600 hover:text-blue-500 inline-flex items-center"
                >
                  Telegram бота
                  <ExternalLink className="ml-1 h-3 w-3" />
                </button>
              </>
            )}
          </p>
        </div>

        {/* Статус системы */}
        {telegramStatus && (
          <div className="text-center text-xs text-gray-400">
            Telegram auth: {telegramStatus.enabled ? '✅ Включен' : '❌ Отключен'}
            {telegramStatus.configured && ' | ⚙️ Настроен'}
          </div>
        )}
      </div>
    </div>
  )
} 