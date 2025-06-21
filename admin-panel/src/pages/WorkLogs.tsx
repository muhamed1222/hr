import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useTelegramDeepLink } from '@/hooks/useTelegramStartParam'
import { isInsideTelegram, setupMainButton, setupBackButton } from '@/lib/telegram'
import { useEffect, useState } from 'react'

export default function WorkLogs() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filter = searchParams.get('filter') || 'today'
  const [selectedFilter, setSelectedFilter] = useState(filter)
  const { generateLogsLink } = useTelegramDeepLink()

  // Обновление URL при изменении фильтра
  useEffect(() => {
    setSelectedFilter(filter)
  }, [filter])

  const handleFilterChange = (newFilter) => {
    setSelectedFilter(newFilter)
    setSearchParams({ filter: newFilter })
  }

  // Запрос данных логов
  const { data: logs, isLoading, error } = useQuery({
    queryKey: ['workLogs', selectedFilter],
    queryFn: async () => {
      // Здесь будет реальный API запрос
      // Пока возвращаем моковые данные в зависимости от фильтра
      const mockData = {
        today: [
          { id: 1, employeeName: 'Иван Петров', startTime: '09:00', endTime: '18:00', hours: 8, description: 'Разработка новой функции', date: '2024-01-15' },
          { id: 2, employeeName: 'Мария Сидорова', startTime: '10:00', endTime: '19:00', hours: 8, description: 'Тестирование', date: '2024-01-15' }
        ],
        week: [
          { id: 3, employeeName: 'Иван Петров', startTime: '09:00', endTime: '18:00', hours: 40, description: 'Недельная работа', date: '2024-01-09 - 2024-01-15' },
          { id: 4, employeeName: 'Мария Сидорова', startTime: '10:00', endTime: '19:00', hours: 39, description: 'Недельная работа', date: '2024-01-09 - 2024-01-15' }
        ],
        month: [
          { id: 5, employeeName: 'Иван Петров', startTime: '09:00', endTime: '18:00', hours: 160, description: 'Месячная работа', date: 'Январь 2024' },
          { id: 6, employeeName: 'Мария Сидорова', startTime: '10:00', endTime: '19:00', hours: 155, description: 'Месячная работа', date: 'Январь 2024' }
        ],
        all: [
          { id: 7, employeeName: 'Иван Петров', startTime: '09:00', endTime: '18:00', hours: 1600, description: 'Вся работа', date: '2023-2024' },
          { id: 8, employeeName: 'Мария Сидорова', startTime: '10:00', endTime: '19:00', hours: 1550, description: 'Вся работа', date: '2023-2024' }
        ]
      }
      
      return mockData[selectedFilter] || mockData.today
    }
  })

  // Настройка Telegram UI
  useEffect(() => {
    if (!isInsideTelegram()) return

    // Настройка кнопки "Назад"
    setupBackButton(() => {
      window.history.back()
    })

    // Настройка основной кнопки
    setupMainButton('Экспортировать', () => {
      console.log('Экспорт логов с фильтром:', selectedFilter)
      // Здесь будет логика экспорта
    })

    return () => {
      // Очистка при размонтировании
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.BackButton.hide()
        window.Telegram.WebApp.MainButton.hide()
      }
    }
  }, [selectedFilter])

  const filters = [
    { key: 'today', label: 'Сегодня', icon: '📅' },
    { key: 'week', label: 'Неделя', icon: '📊' },
    { key: 'month', label: 'Месяц', icon: '📈' },
    { key: 'all', label: 'Все время', icon: '🗂️' }
  ]

  const shareLink = generateLogsLink(selectedFilter)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Загрузка логов...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 110 18 9 9 0 010-18z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Ошибка загрузки</h3>
          <p className="text-gray-600 mb-4">Не удалось загрузить логи работы</p>
          <Button onClick={() => window.location.reload()}>
            Попробовать снова
          </Button>
        </Card>
      </div>
    )
  }

  const totalHours = logs?.reduce((sum, log) => sum + log.hours, 0) || 0

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Логи работы</h1>
          <p className="text-gray-600">
            {filters.find(f => f.key === selectedFilter)?.label || 'Все записи'} • 
            Всего часов: {totalHours}
          </p>
        </div>
        
        {shareLink && (
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(shareLink)
              console.log('Ссылка скопирована:', shareLink)
            }}
          >
            Поделиться
          </Button>
        )}
      </div>

      {/* Фильтры */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          {filters.map((filterItem) => (
            <Button
              key={filterItem.key}
              variant={selectedFilter === filterItem.key ? 'default' : 'outline'}
              onClick={() => handleFilterChange(filterItem.key)}
              className="flex items-center space-x-2"
            >
              <span>{filterItem.icon}</span>
              <span>{filterItem.label}</span>
            </Button>
          ))}
        </div>
      </Card>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{logs?.length || 0}</div>
          <div className="text-sm text-gray-600">Записей</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{totalHours}</div>
          <div className="text-sm text-gray-600">Часов</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {logs?.length ? Math.round(totalHours / logs.length * 10) / 10 : 0}
          </div>
          <div className="text-sm text-gray-600">Часов в среднем</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">
            {new Set(logs?.map(log => log.employeeName)).size || 0}
          </div>
          <div className="text-sm text-gray-600">Сотрудников</div>
        </Card>
      </div>

      {/* Таблица логов */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Записи времени ({filters.find(f => f.key === selectedFilter)?.label})
          </h3>
        </div>
        
        {logs && logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Сотрудник
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дата/Период
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Время
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Часы
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Описание
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-blue-600 font-semibold text-sm">
                            {log.employeeName.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {log.employeeName}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.startTime && log.endTime && `${log.startTime} - ${log.endTime}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        {log.hours}ч
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {log.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => console.log('Редактировать лог:', log.id)}
                      >
                        Редактировать
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Нет записей</h3>
            <p className="text-gray-600">
              Записи времени для периода "{filters.find(f => f.key === selectedFilter)?.label}" не найдены
            </p>
          </div>
        )}
      </Card>
    </div>
  )
} 