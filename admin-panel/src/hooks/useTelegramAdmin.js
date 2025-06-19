import { useState, useCallback } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import axios from 'axios'
import toast from 'react-hot-toast'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

/**
 * Хук для работы с Telegram админкой
 */
export function useTelegramAdmin() {
  const [employees, setEmployees] = useState([])
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const { token } = useAuthStore()

  // Создаем axios инстанс с авторизацией
  const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })

  /**
   * Загрузка списка сотрудников
   */
  const loadEmployees = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await apiClient.get('/telegram-admin/employees')
      
      setEmployees(response.data.employees)
      
      console.log('📋 Загружен список сотрудников:', {
        count: response.data.employees.length,
        summary: response.data.summary
      })

      return response.data

    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Ошибка загрузки сотрудников'
      setError(errorMessage)
      console.error('❌ Ошибка загрузки сотрудников:', error)
      throw new Error(errorMessage)

    } finally {
      setIsLoading(false)
    }
  }, [apiClient])

  /**
   * Загрузка логов за сегодня
   */
  const loadTodayLogs = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await apiClient.get('/telegram-admin/logs/today')
      
      setLogs(response.data.logs)
      
      console.log('📊 Загружены логи за сегодня:', response.data.logs.length)

      return response.data.logs

    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Ошибка загрузки логов'
      setError(errorMessage)
      console.error('❌ Ошибка загрузки логов:', error)
      throw new Error(errorMessage)

    } finally {
      setIsLoading(false)
    }
  }, [apiClient])

  /**
   * Загрузка статистики
   */
  const loadStats = useCallback(async () => {
    try {
      const response = await apiClient.get('/telegram-admin/stats')
      
      setStats(response.data)
      
      console.log('📈 Загружена статистика:', response.data)

      return response.data

    } catch (error) {
      console.error('❌ Ошибка загрузки статистики:', error)
      return null
    }
  }, [apiClient])

  /**
   * Редактирование лога работы
   */
  const editLog = useCallback(async (logId, logData) => {
    try {
      setIsLoading(true)

      const response = await apiClient.patch(`/telegram-admin/logs/${logId}`, logData)
      
      // Обновляем лог в списке
      setLogs(prevLogs => 
        prevLogs.map(log => 
          log.id === logId 
            ? { ...log, ...response.data.log }
            : log
        )
      )

      // Обновляем лог в списке сотрудников если есть
      setEmployees(prevEmployees =>
        prevEmployees.map(employee => {
          if (employee.todayLog?.id === logId) {
            return {
              ...employee,
              todayLog: { ...employee.todayLog, ...response.data.log }
            }
          }
          return employee
        })
      )

      toast.success('Лог успешно обновлен')
      console.log('✏️ Лог отредактирован:', logId)

      return response.data

    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Ошибка редактирования лога'
      toast.error(errorMessage)
      throw new Error(errorMessage)

    } finally {
      setIsLoading(false)
    }
  }, [apiClient])

  /**
   * Отключение сотрудника
   */
  const disableUser = useCallback(async (userId, reason = '') => {
    try {
      setIsLoading(true)

      const response = await apiClient.post(`/telegram-admin/users/${userId}/disable`, {
        reason
      })
      
      // Обновляем статус в списке сотрудников
      setEmployees(prevEmployees =>
        prevEmployees.map(employee =>
          employee.id === userId
            ? { ...employee, status: 'suspended' }
            : employee
        )
      )

      toast.success(response.data.message)
      console.log('🚫 Пользователь отключен:', userId)

      return response.data

    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Ошибка отключения пользователя'
      toast.error(errorMessage)
      throw new Error(errorMessage)

    } finally {
      setIsLoading(false)
    }
  }, [apiClient])

  /**
   * Включение сотрудника
   */
  const enableUser = useCallback(async (userId) => {
    try {
      setIsLoading(true)

      const response = await apiClient.post(`/telegram-admin/users/${userId}/enable`)
      
      // Обновляем статус в списке сотрудников
      setEmployees(prevEmployees =>
        prevEmployees.map(employee =>
          employee.id === userId
            ? { ...employee, status: 'active' }
            : employee
        )
      )

      toast.success(response.data.message)
      console.log('✅ Пользователь включен:', userId)

      return response.data

    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Ошибка включения пользователя'
      toast.error(errorMessage)
      throw new Error(errorMessage)

    } finally {
      setIsLoading(false)
    }
  }, [apiClient])

  /**
   * Удаление лога
   */
  const deleteLog = useCallback(async (logId) => {
    try {
      setIsLoading(true)

      await apiClient.delete(`/telegram-admin/logs/${logId}`)
      
      // Удаляем лог из списка
      setLogs(prevLogs => prevLogs.filter(log => log.id !== logId))

      // Обновляем список сотрудников
      setEmployees(prevEmployees =>
        prevEmployees.map(employee => {
          if (employee.todayLog?.id === logId) {
            return {
              ...employee,
              todayLog: null,
              workStatus: 'not_worked',
              statusText: 'Не отметился',
              statusColor: 'gray'
            }
          }
          return employee
        })
      )

      toast.success('Лог удален')
      console.log('🗑️ Лог удален:', logId)

    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Ошибка удаления лога'
      toast.error(errorMessage)
      throw new Error(errorMessage)

    } finally {
      setIsLoading(false)
    }
  }, [apiClient])

  /**
   * Обновление всех данных
   */
  const refreshAll = useCallback(async () => {
    try {
      await Promise.all([
        loadEmployees(),
        loadTodayLogs(),
        loadStats()
      ])
    } catch (error) {
      console.error('❌ Ошибка обновления данных:', error)
    }
  }, [loadEmployees, loadTodayLogs, loadStats])

  /**
   * Фильтрация сотрудников
   */
  const getFilteredEmployees = useCallback((filter = 'all') => {
    switch (filter) {
      case 'working':
        return employees.filter(emp => emp.workStatus === 'working')
      case 'worked':
        return employees.filter(emp => emp.workStatus === 'worked')
      case 'absent':
        return employees.filter(emp => emp.workStatus === 'absent')
      case 'not_worked':
        return employees.filter(emp => emp.workStatus === 'not_worked')
      case 'suspended':
        return employees.filter(emp => emp.status === 'suspended')
      case 'telegram':
        return employees.filter(emp => emp.telegram.createdVia)
      default:
        return employees
    }
  }, [employees])

  /**
   * Получение сводки
   */
  const getSummary = useCallback(() => {
    if (employees.length === 0) return null

    return {
      total: employees.length,
      working: employees.filter(emp => emp.workStatus === 'working').length,
      worked: employees.filter(emp => emp.workStatus === 'worked').length,
      absent: employees.filter(emp => emp.workStatus === 'absent').length,
      notWorked: employees.filter(emp => emp.workStatus === 'not_worked').length,
      suspended: employees.filter(emp => emp.status === 'suspended').length,
      telegram: employees.filter(emp => emp.telegram.createdVia).length
    }
  }, [employees])

  return {
    // Данные
    employees,
    logs,
    stats,
    
    // Состояние
    isLoading,
    error,
    
    // Основные функции
    loadEmployees,
    loadTodayLogs,
    loadStats,
    refreshAll,
    
    // Управление пользователями
    disableUser,
    enableUser,
    
    // Управление логами
    editLog,
    deleteLog,
    
    // Утилиты
    getFilteredEmployees,
    getSummary,
    clearError: () => setError(null)
  }
} 