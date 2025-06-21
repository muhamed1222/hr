import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      checkAuth()
    }
  }, [checkAuth, isAuthenticated, isLoading])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Загрузка...</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
} 