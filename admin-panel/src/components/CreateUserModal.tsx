import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { usersAPI } from '@/api/users'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { X, User, UserPlus, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function CreateUserModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    role: 'employee',
    sendInvite: true
  })

  const createUserMutation = useMutation({
    mutationFn: usersAPI.createUser,
    onSuccess: (data) => {
      toast.success('Пользователь создан успешно')
      if (data.tempPassword) {
        toast.success(`Временный пароль: ${data.tempPassword}`)
      }
      setFormData({ name: '', username: '', role: 'employee', sendInvite: true })
      onSuccess()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Ошибка создания пользователя')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.username.trim()) {
      toast.error('Заполните все обязательные поля')
      return
    }

    createUserMutation.mutate(formData)
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Заголовок */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <UserPlus className="h-6 w-6 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              Добавить сотрудника
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={createUserMutation.isLoading}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Форма */}
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
              disabled={createUserMutation.isLoading}
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
              disabled={createUserMutation.isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Будет использоваться для входа в систему
            </p>
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
              disabled={createUserMutation.isLoading}
            >
              <option value="employee">Сотрудник</option>
              <option value="manager">Менеджер</option>
              <option value="admin">Администратор</option>
            </select>
          </div>

          {/* Отправить приглашение */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="sendInvite"
              checked={formData.sendInvite}
              onChange={(e) => handleChange('sendInvite', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={createUserMutation.isLoading}
            />
            <label htmlFor="sendInvite" className="ml-2 block text-sm text-gray-700">
              Отправить приглашение в Telegram (если доступно)
            </label>
          </div>

          {/* Кнопки */}
          <div className="flex items-center justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createUserMutation.isLoading}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={createUserMutation.isLoading}
            >
              {createUserMutation.isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Создание...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Создать
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Информация */}
        <div className="px-6 pb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-800">
              💡 Будет сгенерирован временный пароль для первого входа.
              Пользователь сможет изменить его после авторизации.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 