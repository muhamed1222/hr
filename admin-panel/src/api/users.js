import apiClient from './client'

export const usersAPI = {
  // Получить список всех пользователей
  getUsers: async (params = {}) => {
    const { search, role, status, teamId, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC' } = params
    const queryParams = new URLSearchParams()
    
    if (search) queryParams.append('search', search)
    if (role) queryParams.append('role', role)
    if (status) queryParams.append('status', status)
    if (teamId) queryParams.append('teamId', teamId)
    queryParams.append('page', page)
    queryParams.append('limit', limit)
    queryParams.append('sortBy', sortBy)
    queryParams.append('sortOrder', sortOrder)

    const response = await apiClient.get(`/users-management?${queryParams.toString()}`)
    return response.data
  },

  // Получить пользователя по ID
  getUser: async (id) => {
    const response = await apiClient.get(`/users-management/${id}`)
    return response.data
  },

  // Создать нового пользователя
  createUser: async (userData) => {
    const response = await apiClient.post('/users-management', userData)
    return response.data
  },

  // Обновить пользователя
  updateUser: async (id, userData) => {
    const response = await apiClient.put(`/users-management/${id}`, userData)
    return response.data
  },

  // Деактивировать пользователя
  deleteUser: async (id) => {
    const response = await apiClient.delete(`/users-management/${id}`)
    return response.data
  },

  // Активировать пользователя
  activateUser: async (id) => {
    const response = await apiClient.patch(`/users-management/${id}/activate`)
    return response.data
  },

  // Сменить пароль пользователя
  changePassword: async (id, passwordData) => {
    const response = await apiClient.patch(`/users-management/${id}/password`, passwordData)
    return response.data
  },

  // Добавить пользователя в команду
  addToTeam: async (userId, teamId, role = 'member') => {
    const response = await apiClient.post(`/users-management/${userId}/teams`, { teamId, role })
    return response.data
  },

  // Удалить пользователя из команды
  removeFromTeam: async (userId, teamId) => {
    const response = await apiClient.delete(`/users-management/${userId}/teams/${teamId}`)
    return response.data
  }
} 