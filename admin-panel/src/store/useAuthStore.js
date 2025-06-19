import { create } from 'zustand'
import { authAPI } from '../api/auth'

export const useAuthStore = create((set, get) => ({
  // Состояние
  user: null,
  isAuthenticated: false,
  isLoading: true,

  // Действия
  login: async (credentials) => {
    try {
      const data = await authAPI.login(credentials)
      
      if (data.success && data.token) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        
        set({
          user: data.user,
          isAuthenticated: true,
          isLoading: false,
        })
        
        return { success: true }
      } else {
        throw new Error(data.message || 'Ошибка авторизации')
      }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      }
    }
  },

  logout: () => {
    authAPI.logout()
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    })
  },

  checkAuth: async () => {
    try {
      const token = localStorage.getItem('token')
      const userData = localStorage.getItem('user')
      
      if (!token || !userData) {
        set({ isLoading: false })
        return
      }

      // Проверяем токен на сервере
      const response = await authAPI.verify()
      
      if (response.success) {
        set({
          user: JSON.parse(userData),
          isAuthenticated: true,
          isLoading: false,
        })
      } else {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        set({ isLoading: false })
      }
    } catch (error) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      set({ isLoading: false })
    }
  },

  // Геттеры
  isAdmin: () => {
    const { user } = get()
    return user?.role === 'admin'
  },

  isManager: () => {
    const { user } = get()
    return user?.role === 'manager' || user?.role === 'admin'
  },
})) 