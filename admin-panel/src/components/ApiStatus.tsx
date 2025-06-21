import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, X } from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export default function ApiStatus({ className = '' }) {
  const [status, setStatus] = useState('checking') // checking, online, offline
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    checkApiStatus()
  }, [])

  const checkApiStatus = async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(`${API_BASE_URL}/../health`, {
        signal: controller.signal,
        mode: 'cors',
        cache: 'no-cache'
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        setStatus('online')
        setShowBanner(false)
      } else {
        setStatus('offline')
        setShowBanner(true)
      }
    } catch (error) {
      setStatus('offline')
      setShowBanner(true)
    }
  }

  if (!showBanner) return null

  return (
    <div className={`bg-yellow-50 border-l-4 border-yellow-400 p-4 ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-yellow-400" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            API сервер недоступен
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>
              Бэкенд API пока не развёрнут. Некоторые функции могут не работать.
              <br />
              <span className="font-mono text-xs">URL: {API_BASE_URL}</span>
            </p>
          </div>
        </div>
        <div className="ml-auto pl-3">
          <div className="-mx-1.5 -my-1.5">
            <button
              type="button"
              onClick={() => setShowBanner(false)}
              className="inline-flex rounded-md bg-yellow-50 p-1.5 text-yellow-500 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-yellow-600 focus:ring-offset-2 focus:ring-offset-yellow-50"
            >
              <span className="sr-only">Закрыть</span>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 