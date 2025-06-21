import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { 
  isInsideTelegram, 
  getTelegramUser, 
  showTelegramAlert, 
  showTelegramConfirm,
  setupMainButton,
  hideMainButton,
  setupBackButton,
  sendTelegramData,
  closeTelegramApp,
  tg
} from '@/lib/telegram'

export default function TelegramDemo() {
  const [telegramData, setTelegramData] = useState(null)
  const [isVisible, setIsVisible] = useState(false)
  
  const isTelegram = isInsideTelegram()
  const tgUser = getTelegramUser()

  useEffect(() => {
    if (isTelegram) {
      setTelegramData({
        platform: tg.platform,
        version: tg.version,
        colorScheme: tg.colorScheme,
        themeParams: tg.themeParams,
        isExpanded: tg.isExpanded,
        viewportHeight: tg.viewportHeight,
        viewportStableHeight: tg.viewportStableHeight,
        user: tgUser
      })
    }
  }, [isTelegram, tgUser])

  const handleShowAlert = () => {
    showTelegramAlert('Это уведомление из Telegram WebApp! 🎉')
  }

  const handleShowConfirm = () => {
    showTelegramConfirm(
      'Вы уверены, что хотите продолжить?',
      (confirmed) => {
        if (confirmed) {
          showTelegramAlert('Вы подтвердили действие! ✅')
        } else {
          showTelegramAlert('Действие отменено! ❌')
        }
      }
    )
  }

  const handleSetupMainButton = () => {
    setupMainButton('Главная кнопка! 🚀', () => {
      showTelegramAlert('Главная кнопка нажата!')
    })
  }

  const handleHideMainButton = () => {
    hideMainButton()
  }

  const handleSetupBackButton = () => {
    setupBackButton(() => {
      showTelegramAlert('Кнопка назад нажата!')
    })
  }

  const handleSendData = () => {
    const data = {
      action: 'demo_data',
      timestamp: new Date().toISOString(),
      message: 'Привет от TimeBot Admin!'
    }
    sendTelegramData(data)
    showTelegramAlert('Данные отправлены боту!')
  }

  const handleCloseApp = () => {
    closeTelegramApp()
  }

  if (!isTelegram) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-2xl">⚠️</span>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Приложение запущено не в Telegram
            </h3>
            <p className="text-sm text-yellow-700 mt-2">
              Для полной функциональности откройте приложение через Telegram WebApp.
              Некоторые функции работают только внутри Telegram.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Статус Telegram */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-2xl">✅</span>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">
              Telegram WebApp активен
            </h3>
            <p className="text-sm text-green-700 mt-2">
              Приложение успешно запущено в Telegram и имеет доступ ко всем возможностям WebApp API.
            </p>
          </div>
        </div>
      </div>

      {/* Информация о пользователе */}
      {tgUser && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Данные пользователя Telegram
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">ID</label>
              <p className="text-sm text-gray-900">{tgUser.id}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Имя</label>
              <p className="text-sm text-gray-900">{tgUser.first_name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Фамилия</label>
              <p className="text-sm text-gray-900">{tgUser.last_name || 'Не указана'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Username</label>
              <p className="text-sm text-gray-900">@{tgUser.username || 'Не указан'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Язык</label>
              <p className="text-sm text-gray-900">{tgUser.language_code || 'Не указан'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Premium</label>
              <p className="text-sm text-gray-900">{tgUser.is_premium ? 'Да' : 'Нет'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Системная информация */}
      {telegramData && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Системная информация
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Платформа</label>
              <p className="text-sm text-gray-900">{telegramData.platform}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Версия</label>
              <p className="text-sm text-gray-900">{telegramData.version}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Цветовая схема</label>
              <p className="text-sm text-gray-900">{telegramData.colorScheme}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Развернуто</label>
              <p className="text-sm text-gray-900">{telegramData.isExpanded ? 'Да' : 'Нет'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Высота экрана</label>
              <p className="text-sm text-gray-900">{telegramData.viewportHeight}px</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Стабильная высота</label>
              <p className="text-sm text-gray-900">{telegramData.viewportStableHeight}px</p>
            </div>
          </div>
        </div>
      )}

      {/* Демонстрация API */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Демонстрация Telegram WebApp API
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Button onClick={handleShowAlert} className="w-full">
            Показать Alert
          </Button>
          
          <Button onClick={handleShowConfirm} className="w-full">
            Показать Confirm
          </Button>
          
          <Button onClick={handleSetupMainButton} className="w-full">
            Настроить главную кнопку
          </Button>
          
          <Button onClick={handleHideMainButton} variant="outline" className="w-full">
            Скрыть главную кнопку
          </Button>
          
          <Button onClick={handleSetupBackButton} className="w-full">
            Настроить кнопку "Назад"
          </Button>
          
          <Button onClick={handleSendData} className="w-full">
            Отправить данные боту
          </Button>
          
          <Button onClick={handleCloseApp} variant="destructive" className="w-full md:col-span-2 lg:col-span-3">
            Закрыть приложение
          </Button>
        </div>
      </div>

      {/* Детали темы */}
      {telegramData?.themeParams && (
        <details className="bg-white shadow rounded-lg p-6">
          <summary className="text-lg font-medium text-gray-900 cursor-pointer">
            Параметры темы Telegram
          </summary>
          <pre className="mt-4 text-xs bg-gray-50 p-4 rounded overflow-auto">
            {JSON.stringify(telegramData.themeParams, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
} 