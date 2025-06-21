import { useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useTelegramDeepLink } from '@/hooks/useTelegramStartParam'
import { isInsideTelegram, setupMainButton, setupBackButton } from '@/lib/telegram'
import { useEffect } from 'react'

export default function EmployeeProfile() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const action = searchParams.get('action') || 'view'
  const { generateEmployeeLink } = useTelegramDeepLink()

  // Запрос данных сотрудника
  const { data: employee, isLoading, error } = useQuery({
    queryKey: ['employee', id],
    queryFn: async () => {
      // Здесь будет реальный API запрос
      // Пока возвращаем моковые данные
      return {
        id,
        name: `Сотрудник ${id}`,
        position: 'Разработчик',
        email: `employee${id}@company.com`,
        phone: '+7 999 123-45-67',
        department: 'IT',
        startDate: '2023-01-15',
        status: 'active'
      }
    },
    enabled: !!id
  })

  // Настройка Telegram UI
  useEffect(() => {
    if (!isInsideTelegram()) return

    // Настройка кнопки "Назад"
    setupBackButton(() => {
      window.history.back()
    })

    // Настройка основной кнопки в зависимости от действия
    if (action === 'edit') {
      setupMainButton('Сохранить изменения', () => {
        // Логика сохранения
        console.log('Сохранение изменений сотрудника:', id)
      })
    } else {
      setupMainButton('Редактировать', () => {
        window.location.href = `/employee/${id}?action=edit`
      })
    }

    return () => {
      // Очистка при размонтировании
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.BackButton.hide()
        window.Telegram.WebApp.MainButton.hide()
      }
    }
  }, [id, action])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Загрузка профиля...</p>
        </div>
      </div>
    )
  }

  if (error || !employee) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Сотрудник не найден</h3>
          <p className="text-gray-600 mb-4">Сотрудник с ID {id} не существует</p>
          <Button onClick={() => window.history.back()}>
            Вернуться назад
          </Button>
        </Card>
      </div>
    )
  }

  const shareLink = generateEmployeeLink(id)

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Заголовок с действием */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {action === 'edit' ? 'Редактирование профиля' : 'Профиль сотрудника'}
          </h1>
          <p className="text-gray-600">ID: {id}</p>
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

      {/* Основная информация */}
      <Card className="p-6">
        <div className="flex items-start space-x-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-semibold text-xl">
              {employee.name.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
          
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900">{employee.name}</h2>
            <p className="text-gray-600">{employee.position}</p>
            <p className="text-sm text-gray-500">{employee.department}</p>
            
            <div className="mt-2">
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                employee.status === 'active' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {employee.status === 'active' ? 'Активен' : 'Неактивен'}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Контактная информация */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Контактная информация</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <p className="mt-1 text-gray-900">{employee.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Телефон</label>
            <p className="mt-1 text-gray-900">{employee.phone}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Отдел</label>
            <p className="mt-1 text-gray-900">{employee.department}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Дата начала работы</label>
            <p className="mt-1 text-gray-900">{new Date(employee.startDate).toLocaleDateString('ru-RU')}</p>
          </div>
        </div>
      </Card>

      {/* Статистика */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Статистика</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">8</div>
            <div className="text-sm text-gray-600">Часов сегодня</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">40</div>
            <div className="text-sm text-gray-600">Часов на неделе</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">3</div>
            <div className="text-sm text-gray-600">Дня отпуска</div>
          </div>
        </div>
      </Card>

      {/* Последние записи */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Последние записи времени</h3>
        <div className="space-y-3">
          {[
            { date: '2024-01-15', hours: 8, description: 'Разработка новой функции' },
            { date: '2024-01-14', hours: 7.5, description: 'Исправление багов' },
            { date: '2024-01-13', hours: 8, description: 'Код-ревью' }
          ].map((log, index) => (
            <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{log.description}</p>
                <p className="text-sm text-gray-600">{new Date(log.date).toLocaleDateString('ru-RU')}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">{log.hours}ч</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Действия для редактирования */}
      {action === 'edit' && (
        <Card className="p-6 bg-yellow-50 border-yellow-200">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Режим редактирования</h3>
          <p className="text-yellow-700 mb-4">
            Здесь будут формы для редактирования данных сотрудника
          </p>
          <div className="space-x-2">
            <Button>Сохранить изменения</Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = `/employee/${id}`}
            >
              Отменить
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
} 