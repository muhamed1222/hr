import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { usersAPI } from '@/api/users'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { X, Edit, Save, Loader2, User, Lock } from 'lucide-react'
import toast from 'react-hot-toast'

export default function EditUserModal({ isOpen, onClose, user, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    role: 'employee',
    status: 'active'
  })
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  })

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => usersAPI.updateUser(id, data),
    onSuccess: () => {
      toast.success('Пользователь обновлён успешно')
      onSuccess()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Ошибка обновления пользователя')
    }
  })

  const changePasswordMutation = useMutation({
    mutationFn: ({ id, data }) => usersAPI.changePassword(id, data),
    onSuccess: () => {
      toast.success('Пароль изменён успешно')
      setPasswordData({ newPassword: '', confirmPassword: '' })
      setShowPasswordForm(false)
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Ошибка изменения пароля')
    }
  })

  // Заполняем форму данными пользователя при открытии
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        username: user.username || '',
        role: user.role || 'employee',
        status: user.status || 'active'
      })
    }
  }, [user])

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.username.trim()) {
      toast.error('Заполните все обязательные поля')
      return
    }

    updateUserMutation.mutate({
      id: user.id,
      data: formData
    })
  }

  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    
    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Заполните все поля пароля')
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Пароли не совпадают')
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Пароль должен содержать минимум 6 символов')
      return
    }

    changePasswordMutation.mutate({
      id: user.id,
      data: { newPassword: passwordData.newPassword }
    })
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handlePasswordChange = (field, value) => {
    setPasswordData(prev => ({ ...prev, [field]: value }))
  }

  if (!isOpen || !user) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Заголовок */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <Edit className="h-6 w-6 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              Редактировать сотрудника
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={updateUserMutation.isLoading || changePasswordMutation.isLoading}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Основная форма */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Имя */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Полное имя *
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Иван Петров"
              required
              disabled={updateUserMutation.isLoading}
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username *
            </label>
            <Input
              type="text"
              value={formData.username}
              onChange={(e) => handleChange('username', e.target.value.toLowerCase())}
              placeholder="ivan.petrov"
              required
              disabled={updateUserMutation.isLoading}
            />
          </div>

          {/* Роль */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Роль
            </label>
            <select
              value={formData.role}
              onChange={(e) => handleChange('role', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={updateUserMutation.isLoading}
            >
              <option value="employee">Сотрудник</option>
              <option value="manager">Менеджер</option>
              <option value="admin">Администратор</option>
            </select>
          </div>

          {/* Статус */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Статус
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={updateUserMutation.isLoading}
            >
              <option value="active">Активен</option>
              <option value="inactive">Неактивен</option>
              <option value="suspended">Заблокирован</option>
            </select>
          </div>

          {/* Кнопки основной формы */}
          <div className="flex items-center justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={updateUserMutation.isLoading}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={updateUserMutation.isLoading}
            >
              {updateUserMutation.isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Сохранить
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Разделитель */}
        <div className="border-t border-gray-200"></div>

        {/* Секция изменения пароля */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-medium text-gray-900 flex items-center">
              <Lock className="h-4 w-4 mr-2" />
              Изменение пароля
            </h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              disabled={changePasswordMutation.isLoading}
            >
              {showPasswordForm ? 'Скрыть' : 'Изменить пароль'}
            </Button>
          </div>

          {showPasswordForm && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Новый пароль
                </label>
                <Input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                  placeholder="Введите новый пароль"
                  disabled={changePasswordMutation.isLoading}
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Подтвердите пароль
                </label>
                <Input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                  placeholder="Повторите новый пароль"
                  disabled={changePasswordMutation.isLoading}
                  minLength={6}
                />
              </div>

              <div className="flex items-center justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPasswordData({ newPassword: '', confirmPassword: '' })
                    setShowPasswordForm(false)
                  }}
                  disabled={changePasswordMutation.isLoading}
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={changePasswordMutation.isLoading}
                >
                  {changePasswordMutation.isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Сохранение...
                    </>
                  ) : (
                    'Изменить пароль'
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Информация о пользователе */}
        {user.telegramId && (
          <div className="px-6 pb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                📱 Telegram ID: {user.telegramId}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 