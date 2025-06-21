import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersAPI } from '@/api/users'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { formatDate, getRoleText } from '@/lib/utils'
import { 
  Users, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  UserCheck, 
  UserX,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Settings,
  Mail,
  Phone
} from 'lucide-react'
import toast from 'react-hot-toast'
import CreateUserModal from '@/components/CreateUserModal'
import EditUserModal from '@/components/EditUserModal'

export default function EmployeeList() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  const queryClient = useQueryClient()

  // Запрос списка пользователей
  const { data: usersData, isLoading, refetch } = useQuery({
    queryKey: ['users', { search: searchTerm, role: selectedRole, status: selectedStatus, page: currentPage }],
    queryFn: () => usersAPI.getUsers({
      search: searchTerm,
      role: selectedRole,
      status: selectedStatus,
      page: currentPage,
      limit: 20
    }),
    keepPreviousData: true
  })

  // Мутация для деактивации пользователя
  const deleteUserMutation = useMutation({
    mutationFn: usersAPI.deleteUser,
    onSuccess: () => {
      toast.success('Пользователь деактивирован')
      queryClient.invalidateQueries(['users'])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Ошибка деактивации пользователя')
    }
  })

  // Мутация для активации пользователя
  const activateUserMutation = useMutation({
    mutationFn: usersAPI.activateUser,
    onSuccess: () => {
      toast.success('Пользователь активирован')
      queryClient.invalidateQueries(['users'])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Ошибка активации пользователя')
    }
  })

  const users = usersData?.data || []
  const pagination = usersData?.pagination || { page: 1, pages: 1, total: 0 }

  // Фильтры
  const roleOptions = [
    { value: '', label: 'Все роли' },
    { value: 'admin', label: 'Администраторы' },
    { value: 'manager', label: 'Менеджеры' },
    { value: 'employee', label: 'Сотрудники' }
  ]

  const statusOptions = [
    { value: '', label: 'Все статусы' },
    { value: 'active', label: 'Активные' },
    { value: 'inactive', label: 'Неактивные' },
    { value: 'suspended', label: 'Заблокированные' }
  ]

  const handleDeleteUser = async (user) => {
    if (confirm(`Вы уверены, что хотите деактивировать пользователя "${user.name}"?`)) {
      deleteUserMutation.mutate(user.id)
    }
  }

  const handleActivateUser = async (user) => {
    activateUserMutation.mutate(user.id)
  }

  const handleEditUser = (user) => {
    setSelectedUser(user)
    setIsEditModalOpen(true)
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setSelectedUser(null)
  }

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800'
    }
    
    const labels = {
      active: 'Активен',
      inactive: 'Неактивен',
      suspended: 'Заблокирован'
    }

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${styles[status] || styles.inactive}`}>
        {labels[status] || status}
      </span>
    )
  }

  const getRoleBadge = (role) => {
    const styles = {
      admin: 'bg-purple-100 text-purple-800',
      manager: 'bg-blue-100 text-blue-800',
      employee: 'bg-gray-100 text-gray-800'
    }

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${styles[role] || styles.employee}`}>
        {getRoleText(role)}
      </span>
    )
  }

  if (isLoading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Загрузка сотрудников...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Управление сотрудниками</h1>
          <p className="text-gray-600">
            Список всех сотрудников компании ({pagination.total})
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Обновить
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить сотрудника
          </Button>
        </div>
      </div>

      {/* Фильтры и поиск */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Фильтры и поиск
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Поиск */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Поиск по имени или username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Фильтр по роли */}
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {roleOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Фильтр по статусу */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Сброс фильтров */}
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('')
                setSelectedRole('')
                setSelectedStatus('')
                setCurrentPage(1)
              }}
            >
              Сброс
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Список сотрудников */}
      <Card>
        <CardHeader>
          <CardTitle>Сотрудники</CardTitle>
          <CardDescription>
            Страница {pagination.page} из {pagination.pages}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Сотрудники не найдены</h3>
              <p className="text-gray-600 mb-4">
                Попробуйте изменить параметры поиска или добавить нового сотрудника
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Добавить сотрудника
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Сотрудник</th>
                    <th className="text-left py-3 px-4 font-medium">Роль</th>
                    <th className="text-left py-3 px-4 font-medium">Статус</th>
                    <th className="text-left py-3 px-4 font-medium">Команды</th>
                    <th className="text-left py-3 px-4 font-medium">Дата создания</th>
                    <th className="text-left py-3 px-4 font-medium">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-blue-600 font-semibold">
                              {user.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">@{user.username}</div>
                            {user.telegramId && (
                              <div className="text-xs text-blue-600">Telegram: {user.telegramId}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {getRoleBadge(user.role)}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(user.status)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          {user.teams && user.teams.length > 0 ? (
                            user.teams.map(team => (
                              <div key={team.id} className="mb-1">
                                <span className="text-gray-900">{team.name}</span>
                                <span className="text-gray-500 ml-1">({team.UserTeam?.role || 'member'})</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-gray-500">Нет команд</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Редактировать
                          </Button>
                          
                          {user.status === 'active' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteUser(user)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <UserX className="h-3 w-3 mr-1" />
                              Деактивировать
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleActivateUser(user)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <UserCheck className="h-3 w-3 mr-1" />
                              Активировать
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Пагинация */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-500">
                Показаны {(pagination.page - 1) * 20 + 1}-{Math.min(pagination.page * 20, pagination.total)} из {pagination.total} записей
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Назад
                </Button>
                
                <span className="px-3 py-1 text-sm">
                  Страница {pagination.page} из {pagination.pages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
                  disabled={pagination.page === pagination.pages}
                >
                  Вперёд
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Модальные окна */}
      <CreateUserModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false)
          queryClient.invalidateQueries(['users'])
        }}
      />

      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        user={selectedUser}
        onSuccess={() => {
          handleCloseEditModal()
          queryClient.invalidateQueries(['users'])
        }}
      />
    </div>
  )
} 