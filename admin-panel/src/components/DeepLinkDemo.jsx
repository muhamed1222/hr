import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useTelegramDeepLink } from '@/hooks/useTelegramStartParam'
import { isInsideTelegram } from '@/lib/telegram'
import { useState } from 'react'

export default function DeepLinkDemo() {
  const {
    generateEmployeeLink,
    generateLogsLink,
    generateSettingsLink,
    generateAnalyticsLink,
    generateTeamLink,
    generateReportLink,
    generateCreateLink
  } = useTelegramDeepLink()

  const [copiedLink, setCopiedLink] = useState(null)

  const copyToClipboard = (link, name) => {
    navigator.clipboard.writeText(link)
    setCopiedLink(name)
    setTimeout(() => setCopiedLink(null), 2000)
  }

  const demoLinks = [
    {
      name: 'Профиль сотрудника 123',
      link: generateEmployeeLink('123'),
      description: 'Прямая ссылка на профиль сотрудника с ID 123',
      param: 'employee_123'
    },
    {
      name: 'Редактирование сотрудника 456',
      link: generateEmployeeLink('456', 'edit'),
      description: 'Открывает профиль сотрудника 456 в режиме редактирования',
      param: 'employee_456_edit'
    },
    {
      name: 'Логи за сегодня',
      link: generateLogsLink('today'),
      description: 'Показывает логи работы за сегодняшний день',
      param: 'logs_today'
    },
    {
      name: 'Логи за неделю',
      link: generateLogsLink('week'),
      description: 'Показывает логи работы за текущую неделю',
      param: 'logs_week'
    },
    {
      name: 'Логи за месяц',
      link: generateLogsLink('month'),
      description: 'Показывает логи работы за текущий месяц',
      param: 'logs_month'
    },
    {
      name: 'Настройки общие',
      link: generateSettingsLink(),
      description: 'Открывает общие настройки системы',
      param: 'settings'
    },
    {
      name: 'Настройки Telegram',
      link: generateSettingsLink('telegram'),
      description: 'Открывает настройки интеграции с Telegram',
      param: 'settings_telegram'
    },
    {
      name: 'Аналитика за неделю',
      link: generateAnalyticsLink('week'),
      description: 'Показывает аналитику за текущую неделю',
      param: 'analytics_week'
    },
    {
      name: 'Команда 789',
      link: generateTeamLink('789'),
      description: 'Открывает страницу команды с ID 789',
      param: 'team_789'
    },
    {
      name: 'Недельный отчет',
      link: generateReportLink('weekly'),
      description: 'Генерирует и показывает недельный отчет',
      param: 'report_weekly'
    },
    {
      name: 'Создать запись времени',
      link: generateCreateLink('worklog'),
      description: 'Открывает форму создания новой записи времени',
      param: 'create_worklog'
    }
  ]

  if (!isInsideTelegram()) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <div className="text-yellow-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Deep Linking недоступен</h3>
          <p className="text-gray-600">
            Deep linking работает только внутри Telegram WebApp
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          🔗 Демо Deep Linking
        </h3>
        <p className="text-gray-600">
          Нажмите на любую ссылку ниже, чтобы скопировать её в буфер обмена. 
          Эти ссылки можно отправлять в Telegram чатах для прямого перехода к нужным страницам.
        </p>
      </div>

      <div className="space-y-4">
        {demoLinks.map((item, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 mb-1">{item.name}</h4>
                <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                
                <div className="bg-gray-100 rounded p-2 text-xs font-mono text-gray-700">
                  <div className="mb-1">
                    <span className="text-gray-500">Параметр:</span> {item.param}
                  </div>
                  <div className="truncate">
                    <span className="text-gray-500">Ссылка:</span> {item.link}
                  </div>
                </div>
              </div>
              
              <div className="ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(item.link, item.name)}
                  className="whitespace-nowrap"
                >
                  {copiedLink === item.name ? (
                    <>
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Скопировано
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Копировать
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="text-blue-500 mr-3 mt-0.5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="font-medium text-blue-900 mb-1">Как это работает?</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• Ссылки содержат параметр <code className="bg-blue-100 px-1 rounded">startapp</code></p>
              <p>• При клике в Telegram WebApp открывается с этим параметром</p>
              <p>• Приложение автоматически перенаправляет на нужную страницу</p>
              <p>• Все параметры безопасно проверяются через Telegram API</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="text-green-500 mr-3 mt-0.5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="font-medium text-green-900 mb-1">Примеры использования</h4>
            <div className="text-sm text-green-800 space-y-1">
              <p>• Отправка прямой ссылки на профиль сотрудника менеджеру</p>
              <p>• Быстрый доступ к отчетам за определенный период</p>
              <p>• Создание ярлыков для часто используемых функций</p>
              <p>• Интеграция с уведомлениями бота</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
} 