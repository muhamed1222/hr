import { useState, useEffect } from 'react'
import { tg, isTelegramWebApp } from '@/lib/telegram'

/**
 * Хук для обработки параметров запуска Telegram WebApp
 * Поддерживает deep linking для прямых переходов на конкретные страницы
 * 
 * Примеры параметров:
 * - employee_123 → { type: 'employee', id: '123' }
 * - logs_today → { type: 'logs', filter: 'today' }
 * - settings → { type: 'settings' }
 * - user_456_edit → { type: 'user', id: '456', action: 'edit' }
 */
export function useTelegramStartParam() {
  const [startParam, setStartParam] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const parseStartParam = () => {
      if (!isTelegramWebApp()) {
        setIsLoading(false)
        return
      }

      const rawParam = tg?.initDataUnsafe?.start_param
      
      if (!rawParam) {
        setIsLoading(false)
        return
      }

      console.log('🔗 Получен start_param:', rawParam)

      // Парсинг различных форматов параметров
      const parsed = parseStartParamString(rawParam)
      
      console.log('📊 Распарсенный параметр:', parsed)
      setStartParam(parsed)
      setIsLoading(false)
    }

    parseStartParam()
  }, [])

  return { startParam, isLoading }
}

/**
 * Парсит строку параметра в объект
 * @param {string} paramString - строка параметра из Telegram
 * @returns {object|null} - объект с типом и дополнительными данными
 */
function parseStartParamString(paramString) {
  if (!paramString || typeof paramString !== 'string') {
    return null
  }

  // Разделяем по underscore
  const parts = paramString.split('_')
  const type = parts[0]

  switch (type) {
    case 'employee':
    case 'user': {
      const id = parts[1]
      const action = parts[2] || 'view'
      
      if (!id) return null
      
      return {
        type,
        id,
        action,
        path: `/${type}/${id}`,
        query: action !== 'view' ? { action } : {}
      }
    }

    case 'logs': {
      const filter = parts[1] || 'all'
      
      return {
        type: 'logs',
        filter,
        path: '/logs',
        query: { filter }
      }
    }

    case 'settings': {
      const section = parts[1] || 'general'
      
      return {
        type: 'settings',
        section,
        path: '/settings',
        query: section !== 'general' ? { section } : {}
      }
    }

    case 'analytics': {
      const period = parts[1] || 'week'
      
      return {
        type: 'analytics',
        period,
        path: '/analytics',
        query: { period }
      }
    }

    case 'team': {
      const teamId = parts[1]
      const action = parts[2] || 'view'
      
      if (!teamId) return null
      
      return {
        type: 'team',
        id: teamId,
        action,
        path: `/team/${teamId}`,
        query: action !== 'view' ? { action } : {}
      }
    }

    case 'report': {
      const reportType = parts[1] || 'weekly'
      
      return {
        type: 'report',
        reportType,
        path: '/analytics',
        query: { report: reportType }
      }
    }

    case 'create': {
      const entityType = parts[1] || 'worklog'
      
      return {
        type: 'create',
        entityType,
        path: `/create/${entityType}`,
        query: {}
      }
    }

    default: {
      // Неизвестный тип - возвращаем как есть
      return {
        type: 'unknown',
        raw: paramString,
        path: '/',
        query: { startParam: paramString }
      }
    }
  }
}

/**
 * Хук для генерации deep links
 */
export function useTelegramDeepLink() {
  const generateDeepLink = (paramString, botUsername = null) => {
    if (!paramString) return null
    
    // Если ботнейм не указан, используем переменную окружения или дефолт
    const username = botUsername || import.meta.env.VITE_BOT_USERNAME || 'your_bot'
    
    const encodedParam = encodeURIComponent(paramString)
    return `https://t.me/${username}?startapp=${encodedParam}`
  }

  const generateEmployeeLink = (employeeId, action = 'view') => {
    const param = action === 'view' ? `employee_${employeeId}` : `employee_${employeeId}_${action}`
    return generateDeepLink(param)
  }

  const generateLogsLink = (filter = 'today') => {
    return generateDeepLink(`logs_${filter}`)
  }

  const generateSettingsLink = (section = 'general') => {
    const param = section === 'general' ? 'settings' : `settings_${section}`
    return generateDeepLink(param)
  }

  const generateAnalyticsLink = (period = 'week') => {
    return generateDeepLink(`analytics_${period}`)
  }

  const generateTeamLink = (teamId, action = 'view') => {
    const param = action === 'view' ? `team_${teamId}` : `team_${teamId}_${action}`
    return generateDeepLink(param)
  }

  const generateReportLink = (reportType = 'weekly') => {
    return generateDeepLink(`report_${reportType}`)
  }

  const generateCreateLink = (entityType = 'worklog') => {
    return generateDeepLink(`create_${entityType}`)
  }

  return {
    generateDeepLink,
    generateEmployeeLink,
    generateLogsLink,
    generateSettingsLink,
    generateAnalyticsLink,
    generateTeamLink,
    generateReportLink,
    generateCreateLink
  }
} 