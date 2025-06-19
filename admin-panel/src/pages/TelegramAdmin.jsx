import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useTelegramAdmin } from '@/hooks/useTelegramAdmin'
import { 
  isInsideTelegram, 
  setupMainButton, 
  hideMainButton,
  showTelegramAlert,
  showTelegramConfirm,
  tg
} from '@/lib/telegram'
import { Button } from '@/components/ui/Button'
import { 
  Users, 
  RefreshCw, 
  User, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit3,
  Trash2,
  UserCheck,
  UserX,
  BarChart3,
  Phone,
  Calendar,
  Activity
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function TelegramAdmin() {
  const { user } = useAuthStore()
  const {
    employees,
    stats,
    isLoading,
    error,
    loadEmployees,
    loadStats,
    refreshAll,
    disableUser,
    enableUser,
    deleteLog,
    getFilteredEmployees,
    getSummary
  } = useTelegramAdmin()

  const [activeFilter, setActiveFilter] = useState('all')
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [showLogModal, setShowLogModal] = useState(false)

  const isTelegram = isInsideTelegram()
  const summary = getSummary()
  const filteredEmployees = getFilteredEmployees(activeFilter)

  // Проверка доступа
  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Доступ запрещен
          </h2>
          <p className="text-gray-600">
            У вас нет прав администратора для доступа к этой странице
          </p>
        </div>
      </div>
    )
  }

  // Загрузка данных при монтировании
  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  // Настройка Telegram кнопок
  useEffect(() => {
    if (isTelegram) {
      // Главная кнопка для обновления
      setupMainButton('🔄 Обновить', handleRefresh)
      
      // Haptic feedback при загрузке
      if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light')
      }
      
      return () => {
        hideMainButton()
      }
    }
  }, [isTelegram])

  const handleRefresh = async () => {
    try {
      if (isTelegram && tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('medium')
      }
      await refreshAll()
      if (isTelegram) {
        showTelegramAlert('Данные обновлены! ✅')
      } else {
        toast.success('Данные обновлены')
      }
    } catch (error) {
      if (isTelegram) {
        showTelegramAlert('Ошибка обновления данных ❌')
      } else {
        toast.error('Ошибка обновления')
      }
    }
  }

  const handleDisableUser = async (employee) => {
    const action = () => disableUser(employee.id, 'Отключен через Telegram админку')
    
    if (isTelegram) {
      showTelegramConfirm(
        `Отключить пользователя ${employee.name}?`,
        async (confirmed) => {
          if (confirmed) {
            try {
              await action()
              if (tg.HapticFeedback) {
                tg.HapticFeedback.notificationOccurred('warning')
              }
            } catch (error) {
              // Ошибка уже обработана в хуке
            }
          }
        }
      )
    } else {
      if (confirm(`Отключить пользователя ${employee.name}?`)) {
        await action()
      }
    }
  }

  const handleEnableUser = async (employee) => {
    try {
      await enableUser(employee.id)
      if (isTelegram && tg.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('success')
      }
    } catch (error) {
      // Ошибка уже обработана в хуке
    }
  }

  const handleDeleteLog = async (logId, userName) => {
    const action = () => deleteLog(logId)
    
    if (isTelegram) {
      showTelegramConfirm(
        `Удалить лог пользователя ${userName}?`,
        async (confirmed) => {
          if (confirmed) {
            try {
              await action()
              if (tg.HapticFeedback) {
                tg.HapticFeedback.notificationOccurred('warning')
              }
            } catch (error) {
              // Ошибка уже обработана в хуке
            }
          }
        }
      )
    } else {
      if (confirm(`Удалить лог пользователя ${userName}?`)) {
        await action()
      }
    }
  }

  const getStatusIcon = (workStatus) => {
    switch (workStatus) {
      case 'working':
        return <Activity className="h-4 w-4 text-green-500" />
      case 'worked':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'absent':
        return <Calendar className="h-4 w-4 text-blue-500" />
      case 'not_worked':
      default:
        return <XCircle className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (workStatus) => {
    switch (workStatus) {
      case 'working':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'worked':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'absent':
        return 'bg-blue-50 border-blue-200 text-blue-800'
      case 'not_worked':
      default:
        return 'bg-gray-50 border-gray-200 text-gray-600'
    }
  }

  return (
    <div className={`min-h-screen ${isTelegram ? 'bg-white' : 'bg-gray-50'}`}>
      {/* Заголовок */}
      <div className={`${isTelegram ? 'p-4' : 'p-6'} bg-white border-b`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Админ панель
              </h1>
              <p className="text-sm text-gray-500">
                {isTelegram ? '📱 Telegram WebApp' : '💻 Браузер'}
              </p>
            </div>
          </div>
          
          {!isTelegram && (
            <Button 
              onClick={handleRefresh} 
              disabled={isLoading}
              size="sm"
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Обновить
            </Button>
          )}
        </div>
      </div>

      {/* Статистика */}
      {summary && (
        <div className={`${isTelegram ? 'p-4' : 'p-6'} bg-white border-b`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{summary.total}</div>
              <div className="text-sm text-gray-500">Всего</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{summary.working + summary.worked}</div>
              <div className="text-sm text-gray-500">Работают</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{summary.absent}</div>
              <div className="text-sm text-gray-500">Отсутствуют</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{summary.notWorked}</div>
              <div className="text-sm text-gray-500">Не отметились</div>
            </div>
          </div>
        </div>
      )}

      {/* Фильтры */}
      <div className={`${isTelegram ? 'p-4' : 'p-6'} bg-white border-b`}>
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'Все', icon: Users },
            { key: 'working', label: 'Работают', icon: Activity },
            { key: 'worked', label: 'Работали', icon: CheckCircle },
            { key: 'absent', label: 'Отсутствуют', icon: Calendar },
            { key: 'not_worked', label: 'Не отметились', icon: XCircle },
            { key: 'suspended', label: 'Отключены', icon: UserX },
            { key: 'telegram', label: 'Telegram', icon: Phone }
          ].map(filter => {
            const Icon = filter.icon
            const isActive = activeFilter === filter.key
            
            return (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                className={`
                  flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${isActive 
                    ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                <span>{filter.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Список сотрудников */}
      <div className={`${isTelegram ? 'p-4' : 'p-6'}`}>
        {isLoading && employees.length === 0 ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Загрузка сотрудников...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-4" />
            <p className="text-red-600">{error}</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-8 w-8 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {activeFilter === 'all' ? 'Нет сотрудников' : 'Нет сотрудников в этой категории'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEmployees.map(employee => (
              <div 
                key={employee.id}
                className={`
                  bg-white rounded-lg border p-4 
                  ${isTelegram ? 'shadow-sm' : 'shadow'}
                  ${employee.status === 'suspended' ? 'opacity-60' : ''}
                `}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Основная информация */}
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="flex-shrink-0">
                        <User className="h-8 w-8 text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900">
                            {employee.name}
                          </h3>
                          {employee.telegram.createdVia && (
                            <Phone className="h-4 w-4 text-blue-500" />
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          @{employee.username} • {employee.role}
                          {employee.status === 'suspended' && (
                            <span className="ml-2 text-red-600">• Отключен</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Статус работы */}
                    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm border ${getStatusColor(employee.workStatus)}`}>
                      {getStatusIcon(employee.workStatus)}
                      <span>{employee.statusText}</span>
                    </div>

                    {/* Telegram информация */}
                    {employee.telegram.firstName && (
                      <div className="mt-2 text-sm text-gray-500">
                        📱 {employee.telegram.firstName} {employee.telegram.lastName}
                        {employee.telegram.username && ` (@${employee.telegram.username})`}
                      </div>
                    )}

                    {/* Информация о логе */}
                    {employee.todayLog && (
                      <div className="mt-2 text-xs text-gray-400">
                        {employee.todayLog.startTime && (
                          <span>Начал: {employee.todayLog.startTime}</span>
                        )}
                        {employee.todayLog.endTime && (
                          <span className="ml-3">Закончил: {employee.todayLog.endTime}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Действия */}
                  <div className="flex flex-col space-y-2 ml-4">
                    {employee.todayLog && (
                      <button
                        onClick={() => handleDeleteLog(employee.todayLog.id, employee.name)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Удалить лог"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    
                    {employee.status === 'suspended' ? (
                      <button
                        onClick={() => handleEnableUser(employee)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Включить пользователя"
                      >
                        <UserCheck className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDisableUser(employee)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Отключить пользователя"
                      >
                        <UserX className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Telegram specific UI */}
      {isTelegram && (
        <div className="p-4 bg-gray-50 text-center">
          <p className="text-xs text-gray-500">
            🤖 Telegram WebApp Admin Panel v1.0
          </p>
        </div>
      )}
    </div>
  )
} 