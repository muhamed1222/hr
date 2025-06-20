import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from '@/store/useAuthStore'
import { useIsTelegram } from '@/hooks/useIsTelegram'
import ProtectedRoute from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import LoginTelegram from '@/pages/LoginTelegram'
import Dashboard from '@/pages/Dashboard'
import TelegramAdmin from '@/pages/TelegramAdmin'
import TelegramDemo from '@/components/TelegramDemo'
import DeepLinkDemo from '@/components/DeepLinkDemo'
import DeepLinkTester from '@/components/DeepLinkTester'
import EmployeeProfile from '@/pages/EmployeeProfile'
import EmployeeList from '@/pages/EmployeeList'
import Analytics from '@/pages/Analytics'
import WorkLogs from '@/pages/WorkLogs'
import Absences from '@/pages/Absences'
import SystemConfig from '@/pages/SystemConfig'
import TelegramApp from '@/components/TelegramApp'
import TelegramDeepLink from '@/components/TelegramDeepLink'
import DevModeToggle, { DevModeFloatingToggle } from '@/components/DevModeToggle'
import NotInTelegramNotice from '@/components/NotInTelegramNotice'
import { WelcomeMessage } from '@/components/TelegramAuthStatus'
import TelegramAuthStatus from '@/components/TelegramAuthStatus'
import TelegramTestingLink from '@/components/TelegramTestingLink'
import { useEffect } from 'react'
import { initTelegramApp, isInsideTelegram } from '@/lib/telegram'
import { useTelegramStartParam } from '@/hooks/useTelegramStartParam'
import TelegramWebAppTesting from '@/pages/TelegramWebAppTesting'
import OrganizationSettings from './pages/OrganizationSettings'
import SystemMonitoring from './pages/SystemMonitoring'

// Создаём клиент React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  const { checkAuth, isAuthenticated, user } = useAuthStore()
  const { startParam, isLoading: isStartParamLoading } = useTelegramStartParam()
  const { isTelegram, isReady: isTelegramReady } = useIsTelegram()

  // Все хуки должны быть в начале компонента!
  useEffect(() => {
    // Инициализация Telegram WebApp
    initTelegramApp()
    
    // Проверка авторизации
    checkAuth()
  }, [checkAuth])

  // Обработка Telegram перенаправлений
  useEffect(() => {
    if (isInsideTelegram()) {
      // Перенаправление на Telegram login при входе
      if (!isAuthenticated && window.location.pathname === '/login') {
        window.location.replace('/login-telegram')
      }
      
      // Перенаправление админов на Telegram админку
      if (isAuthenticated && user?.role === 'admin' && window.location.pathname === '/') {
        window.location.replace('/telegram-admin')
      }
    }
  }, [isAuthenticated, user])

  // Обработка deep linking из Telegram
  useEffect(() => {
    if (!isAuthenticated || isStartParamLoading || !startParam) return

    console.log('🔗 Обработка deep link:', startParam)

    // Навигация на основе параметра запуска
    const { path, query } = startParam
    
    if (path && window.location.pathname !== path) {
      // Построение URL с query параметрами
      const searchParams = new URLSearchParams()
      Object.entries(query || {}).forEach(([key, value]) => {
        searchParams.set(key, value)
      })
      
      const fullPath = searchParams.toString() ? `${path}?${searchParams}` : path
      
      console.log('🚀 Перенаправление на:', fullPath)
      window.history.replaceState(null, '', fullPath)
      window.location.reload()
    }
  }, [isAuthenticated, isStartParamLoading, startParam])

  // Условные возвраты ПОСЛЕ всех хуков
  // Показываем загрузку пока инициализируется Telegram
  if (!isTelegramReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {process.env.NODE_ENV === 'development' ? 'Инициализация Telegram Mock...' : 'Загрузка...'}
          </p>
        </div>
      </div>
    )
  }

  // Если мы в Telegram WebApp и пользователь авторизован - показываем упрощенный интерфейс
  if (isTelegram && isAuthenticated && user?.role !== 'admin') {
    return (
      <QueryClientProvider client={queryClient}>
        <div className="App">
          <TelegramDeepLink />
          <TelegramApp />
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: 'var(--tg-theme-bg-color, #ffffff)',
                color: 'var(--tg-theme-text-color, #000000)',
                border: '1px solid var(--tg-theme-hint-color, #999999)',
              },
            }}
          />
        </div>
      </QueryClientProvider>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="App">
          {/* Telegram Deep Link обработка */}
          <TelegramDeepLink />
          
          {/* Уведомление для браузерных пользователей */}
          <NotInTelegramNotice />
          
          {/* Приветственное сообщение для новых пользователей */}
          <WelcomeMessage />
          
          <Routes>
            {/* Публичные роуты */}
            <Route 
              path="/login" 
              element={
                isAuthenticated ? <Navigate to="/" replace /> : <Login />
              } 
            />
            
            <Route 
              path="/login-telegram" 
              element={
                isAuthenticated ? <Navigate to="/" replace /> : <LoginTelegram />
              } 
            />
            
            {/* Защищённые роуты */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/users"
              element={
                <ProtectedRoute>
                  <Layout>
                    <EmployeeList />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Профиль сотрудника с deep linking */}
            <Route
              path="/employee/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <EmployeeProfile />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/user/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <EmployeeProfile />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Логи работы с deep linking */}
            <Route
              path="/logs"
              element={
                <ProtectedRoute>
                  <Layout>
                    <WorkLogs />
                  </Layout>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/employees"
              element={
                <ProtectedRoute>
                  <Layout>
                    <EmployeeList />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Analytics />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/absences"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Absences />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Системные настройки (только для админов) */}
                        <Route 
              path="/system-config" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <Layout>
                    <SystemConfig />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/organization-settings" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <Layout>
                    <OrganizationSettings />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/system-monitoring" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <Layout>
                    <SystemMonitoring />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Layout>
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">Настройки</h2>
                        <p className="text-gray-600 mt-2">Конфигурация системы и интеграций</p>
                      </div>
                      
                      {/* Профиль пользователя */}
                      <TelegramAuthStatus variant="profile" />
                      
                      {/* Ссылка на тестирование WebApp */}
                      <TelegramTestingLink />
                      
                      {/* Dev Mode Toggle для разработчиков */}
                      <DevModeToggle />
                      
                      <DeepLinkTester />
                      <DeepLinkDemo />
                      <TelegramDemo />
                    </div>
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/telegram-admin"
              element={
                <ProtectedRoute>
                  <TelegramAdmin />
                </ProtectedRoute>
              }
            />

            {/* Dev страница тестирования WebApp */}
            <Route
              path="/dev/test-telegram"
              element={
                <ProtectedRoute>
                  <TelegramWebAppTesting />
                </ProtectedRoute>
              }
            />

            {/* Перенаправление на главную */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
      
      {/* Уведомления */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            theme: {
              primary: 'green',
              secondary: 'black',
            },
          },
        }}
      />
      
      {/* Dev Mode Toggle для разработки */}
      <DevModeFloatingToggle />
    </QueryClientProvider>
  )
}

export default App 