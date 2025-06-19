import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatTime(timeString) {
  if (!timeString) return '-'
  return timeString.slice(0, 5) // HH:MM
}

export function formatMinutes(minutes) {
  if (!minutes) return '0ч 0м'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}ч ${mins}м`
}

export function getStatusColor(status) {
  switch (status) {
    case 'working':
      return 'bg-green-100 text-green-800'
    case 'lunch':
      return 'bg-yellow-100 text-yellow-800'
    case 'finished':
      return 'bg-gray-100 text-gray-800'
    case 'not_started':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function getStatusText(status) {
  switch (status) {
    case 'working':
      return 'Работает'
    case 'lunch':
      return 'Обед'
    case 'finished':
      return 'Закончил'
    case 'not_started':
      return 'Не начал'
    default:
      return 'Неизвестно'
  }
}

export function getRoleText(role) {
  switch (role) {
    case 'admin':
      return 'Администратор'
    case 'manager':
      return 'Менеджер'
    case 'employee':
      return 'Сотрудник'
    default:
      return role
  }
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString('ru-RU')
}

export function formatDateTime(date) {
  return new Date(date).toLocaleString('ru-RU')
}

export function isLateArrival(arrivedAt) {
  if (!arrivedAt) return false
  const [hours, minutes] = arrivedAt.split(':').map(Number)
  return hours > 9 || (hours === 9 && minutes > 0)
} 