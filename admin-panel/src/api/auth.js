import apiClient from './client'

export const authAPI = {
  // Авторизация
  login: async (credentials) => {
    const response = await apiClient.post('/auth/login', credentials)
    return response.data
  },

  // Проверка токена
  verify: async () => {
    const response = await apiClient.get('/auth/verify')
    return response.data
  },

  // Выход
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
  },
} 