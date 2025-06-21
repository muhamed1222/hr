import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { BarChart3, RefreshCw, TrendingUp, Clock } from 'lucide-react'
import { formatMinutes } from '@/lib/utils'

export default function WorkAnalyticsChart({ data, isLoading }) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Аналитика времени работы
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Аналитика времени работы
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Нет данных для отображения
          </div>
        </CardContent>
      </Card>
    )
  }

  // Находим максимальное значение для масштабирования
  const maxTotalMinutes = Math.max(...data.map(item => parseFloat(item.totalMinutes) || 0))
  const maxAvgMinutes = Math.max(...data.map(item => parseFloat(item.avgMinutes) || 0))
  const maxValue = Math.max(maxTotalMinutes, maxAvgMinutes)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart3 className="h-5 w-5 mr-2" />
          Аналитика времени работы
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Легенда */}
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
              <span>Общее время</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
              <span>Среднее время</span>
            </div>
            <div className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              <span>Рабочих дней</span>
            </div>
          </div>

          {/* График */}
          <div className="space-y-3">
            {data.slice(0, 10).map((item, index) => {
              const totalMinutes = parseFloat(item.totalMinutes) || 0
              const avgMinutes = parseFloat(item.avgMinutes) || 0
              const workDays = parseInt(item.workDays) || 0
              
              const totalWidth = maxValue > 0 ? (totalMinutes / maxValue) * 100 : 0
              const avgWidth = maxValue > 0 ? (avgMinutes / maxValue) * 100 : 0
              
              return (
                <div key={item.userId} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="font-medium text-sm text-gray-900 min-w-0 flex-1">
                      {item.user?.name || `Пользователь ${item.userId}`}
                    </div>
                    <div className="text-xs text-gray-500 ml-2">
                      {workDays} дн.
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    {/* Общее время */}
                    <div className="flex items-center">
                      <div className="w-16 text-xs text-gray-600">Общее:</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${totalWidth}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-900 w-16 text-right">
                        {formatMinutes(totalMinutes)}
                      </div>
                    </div>
                    
                    {/* Среднее время */}
                    <div className="flex items-center">
                      <div className="w-16 text-xs text-gray-600">Средн.:</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${avgWidth}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-900 w-16 text-right">
                        {formatMinutes(avgMinutes)}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Сводка */}
          <div className="border-t pt-4 mt-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {data.length}
                </div>
                <div className="text-xs text-gray-500">Сотрудников</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-blue-600">
                  {formatMinutes(data.reduce((sum, item) => sum + (parseFloat(item.totalMinutes) || 0), 0))}
                </div>
                <div className="text-xs text-gray-500">Общее время</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-green-600">
                  {data.length > 0 ? formatMinutes(
                    data.reduce((sum, item) => sum + (parseFloat(item.avgMinutes) || 0), 0) / data.length
                  ) : '0ч 0м'}
                </div>
                <div className="text-xs text-gray-500">Ср. время</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 