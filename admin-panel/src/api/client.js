import axios from 'axios'
import toast from 'react-hot-toast'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// Создаём экземпляр axios
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Интерсептор запросов - добавляем токен
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Интерсептор ответов - обработка ошибок
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Проверяем тип ошибки и показываем соответствующее сообщение
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK' || !error.response) {
      toast.error('❌ Сервер API недоступен. Бэкенд не развёрнут.', {
        duration: 6000,
        style: {
          background: '#fef3c7',
          color: '#92400e',
          border: '1px solid #fbbf24'
        }
      })
      console.warn('🔗 API недоступен:', API_BASE_URL)
    } else if (error.response?.status === 404) {
      toast.error('🔍 Эндпоинт API не найден', {
        duration: 4000,
        style: {
          background: '#fef3c7',
          color: '#92400e'
        }
      })
    } else if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
      toast.error('Сессия истекла. Войдите заново.')
    } else if (error.response?.status >= 500) {
      toast.error('Ошибка сервера. Попробуйте позже.')
    } else if (error.response?.data?.message) {
      toast.error(error.response.data.message)
    } else if (error.message) {
      toast.error(error.message)
    } else {
      toast.error('Произошла неизвестная ошибка')
    }
    
    return Promise.reject(error)
  }
)

export default apiClient 