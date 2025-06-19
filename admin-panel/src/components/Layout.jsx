import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { Button } from '@/components/ui/Button'
import { cn, getRoleText } from '@/lib/utils'
import { isInsideTelegram, getTelegramUser } from '@/lib/telegram'
import TelegramAuthStatus from '@/components/TelegramAuthStatus'
import { 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut, 
  Menu,
  X
} from 'lucide-react'

const navigation = [
  { name: 'Дашборд', href: '/', icon: LayoutDashboard },
  { name: 'Сотрудники', href: '/users', icon: Users },
  { name: 'Аналитика', href: '/analytics', icon: BarChart3 },
  { name: 'Настройки', href: '/settings', icon: Settings },
]

// Telegram админка только для админов в Telegram
const telegramAdminNav = { 
  name: '📱 Telegram Админка', 
  href: '/telegram-admin', 
  icon: LayoutDashboard 
}

export default function Layout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout, isManager } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // Telegram данные
  const isTelegram = isInsideTelegram()
  const tgUser = getTelegramUser()
  
  // Подготавливаем навигацию с учетом Telegram админки
  const allNavigation = [
    ...navigation,
    ...(user?.role === 'admin' ? [telegramAdminNav] : [])
  ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Мобильное меню */}
      {sidebarOpen && (
        <div className="fixed inset-0 flex z-40 md:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            <Sidebar />
          </div>
        </div>
      )}

      {/* Десктопное меню */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <Sidebar />
        </div>
      </div>

      {/* Основной контент */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Заголовок */}
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
          <button
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex-1 px-4 flex justify-between">
            <div className="flex-1 flex">
              <div className="w-full flex md:ml-0">
                <div className="relative w-full text-gray-400 focus-within:text-gray-600">
                  <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
                    <span className="text-sm font-medium text-gray-900">
                      Outcast TimeBot Admin
                    </span>
                    {isTelegram && (
                      <span className="ml-3 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        📱 Telegram
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="ml-4 flex items-center md:ml-6">
              <div className="flex items-center space-x-4">
                {/* Новый компонент статуса авторизации */}
                <TelegramAuthStatus variant="header" />
                
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Выйти
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Контент */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )

  function Sidebar() {
    return (
      <div className="flex flex-col h-0 flex-1 border-r border-gray-200 bg-white">
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
              <LayoutDashboard className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="ml-2 text-lg font-medium text-gray-900">
              TimeBot
            </span>
          </div>
          
          <nav className="mt-5 flex-1 px-2 space-y-1">
            {allNavigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'group flex items-center px-2 py-2 text-sm font-medium rounded-md',
                    isActive
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <item.icon
                    className={cn(
                      'mr-3 flex-shrink-0 h-5 w-5',
                      isActive ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500'
                    )}
                  />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
        
        <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
          <div className="flex-shrink-0 w-full group block">
            <div className="flex items-center">
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                  {user?.name || 'Администратор'}
                </p>
                <p className="text-xs font-medium text-gray-500 group-hover:text-gray-700">
                  {getRoleText(user?.role)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
} 