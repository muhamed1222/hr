import { useState, useCallback } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { isInsideTelegram, tg } from '@/lib/telegram'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

/**
 * Хук для аутентификации через Telegram WebApp
 */
export function useTelegramAuth() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const { setAuth } = useAuthStore()

  /**
   * Получение initData от Telegram
   */
  const getTelegramInitData = useCallback(() => {
    if (!isInsideTelegram()) {
      throw new Error('Приложение должно быть запущено в Telegram')
    }

    const initData = tg.initData
    
    if (!initData) {
      throw new Error('Не удалось получить данные инициализации от Telegram')
    }

    console.log('📱 Получены данные инициализации Telegram:', {
      hasData: !!initData,
      length: initData.length,
      preview: initData.substring(0, 50) + '...'
    })

    return initData
  }, [])

  /**
   * Проверка статуса Telegram аутентификации на сервере
   */
  const checkTelegramStatus = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/telegram-status`)
      return response.data
    } catch (error) {
      console.error('❌ Ошибка проверки статуса Telegram:', error)
      return { enabled: false, configured: false }
    }
  }, [])

  /**
   * Выполнение Telegram аутентификации
   */
  const loginWithTelegram = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Проверяем, что мы внутри Telegram
      if (!isInsideTelegram()) {
        throw new Error('Для входа через Telegram откройте приложение в Telegram')
      }

      // Получаем данные инициализации
      const initData = getTelegramInitData()

      // Отправляем запрос на сервер
      console.log('🔐 Отправка запроса аутентификации в Telegram...')
      
      const response = await axios.post(`${API_BASE_URL}/auth/telegram-login`, {
        initData
      })

      const { token, user } = response.data

      if (!token || !user) {
        throw new Error('Сервер не вернул токен или данные пользователя')
      }

      // Сохраняем токен и данные пользователя
      localStorage.setItem('auth_token', token)
      setAuth(user, token)

      console.log('✅ Успешная аутентификация через Telegram:', {
        userId: user.id,
        username: user.username,
        telegramId: user.telegram_id
      })

      return { user, token }

    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Неизвестная ошибка'
      
      console.error('❌ Ошибка Telegram аутентификации:', {
        message: errorMessage,
        status: error.response?.status,
        data: error.response?.data
      })

      setError(errorMessage)
      throw new Error(errorMessage)

    } finally {
      setIsLoading(false)
    }
  }, [getTelegramInitData, setAuth])

  /**
   * Проверка возможности использования Telegram аутентификации
   */
  const canUseTelegramAuth = useCallback(() => {
    return isInsideTelegram()
  }, [])

  /**
   * Получение данных пользователя Telegram для отображения
   */
  const getTelegramUserData = useCallback(() => {
    if (!isInsideTelegram()) return null

    const user = tg.initDataUnsafe?.user
    
    return user ? {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
      languageCode: user.language_code,
      isPremium: user.is_premium,
      allowsWriteToPm: user.allows_write_to_pm
    } : null
  }, [])

  return {
    // Состояние
    isLoading,
    error,
    
    // Функции
    loginWithTelegram,
    checkTelegramStatus,
    canUseTelegramAuth,
    getTelegramUserData,
    getTelegramInitData,
    
    // Утилиты
    clearError: () => setError(null)
  }
} 