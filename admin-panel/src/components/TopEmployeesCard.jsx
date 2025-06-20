import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Trophy, Clock, Award, TrendingUp, RefreshCw } from 'lucide-react'
import { formatMinutes } from '@/lib/utils'

export default function TopEmployeesCard({ workAnalytics, reliabilityRanking, isLoading }) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="h-5 w-5 mr-2" />
            Лучшие сотрудники
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

  // Топ по общему времени работы
  const topByTotalTime = workAnalytics
    .sort((a, b) => (parseFloat(b.totalMinutes) || 0) - (parseFloat(a.totalMinutes) || 0))
    .slice(0, 5)

  // Топ по надёжности
  const topByReliability = reliabilityRanking
    .sort((a, b) => b.reliabilityScore - a.reliabilityScore)
    .slice(0, 5)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Trophy className="h-5 w-5 mr-2" />
          Лучшие сотрудники
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Топ по времени работы */}
          <div>
            <h4 className="flex items-center text-sm font-medium text-gray-700 mb-4">
              <Clock className="h-4 w-4 mr-1" />
              По общему времени работы
            </h4>
            {topByTotalTime.length > 0 ? (
              <div className="space-y-3">
                {topByTotalTime.map((item, index) => (
                  <div key={item.userId} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center mr-3">
                        <span className="text-xs font-semibold text-blue-700">
                          {index + 1}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-sm text-gray-900">
                          {item.user?.name || `Пользователь ${item.userId}`}
                        </div>
                        <div className="text-xs text-gray-500">
                          {parseInt(item.workDays) || 0} рабочих дней
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-blue-600">
                        {formatMinutes(parseFloat(item.totalMinutes) || 0)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Ср: {formatMinutes(parseFloat(item.avgMinutes) || 0)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                Нет данных
              </div>
            )}
          </div>

          {/* Топ по надёжности */}
          <div>
            <h4 className="flex items-center text-sm font-medium text-gray-700 mb-4">
              <Award className="h-4 w-4 mr-1" />
              По рейтингу надёжности
            </h4>
            {topByReliability.length > 0 ? (
              <div className="space-y-3">
                {topByReliability.map((item, index) => {
                  const getScoreColor = (score) => {
                    if (score >= 90) return 'text-green-600 bg-green-50'
                    if (score >= 80) return 'text-blue-600 bg-blue-50'
                    if (score >= 70) return 'text-yellow-600 bg-yellow-50'
                    return 'text-red-600 bg-red-50'
                  }

                  const scoreColor = getScoreColor(item.reliabilityScore)
                  
                  return (
                    <div key={item.user.id} className={`flex items-center justify-between p-3 rounded-lg ${scoreColor.split(' ')[1]}`}>
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mr-3 ${scoreColor.split(' ')[1].replace('50', '200')}`}>
                          <span className={`text-xs font-semibold ${scoreColor.split(' ')[0].replace('600', '700')}`}>
                            {index + 1}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-sm text-gray-900">
                            {item.user.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            @{item.user.username}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-semibold ${scoreColor.split(' ')[0]}`}>
                          {item.reliabilityScore}
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.stats?.totalDays || 0} дн.
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                Нет данных
              </div>
            )}
          </div>
        </div>

        {/* Итоговая статистика */}
        <div className="border-t mt-6 pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {workAnalytics.length}
              </div>
              <div className="text-xs text-gray-500">Активных сотрудников</div>
            </div>
            
            <div>
              <div className="text-lg font-semibold text-blue-600">
                {workAnalytics.length > 0 ? 
                  formatMinutes(workAnalytics.reduce((sum, item) => sum + (parseFloat(item.totalMinutes) || 0), 0))
                  : '0ч 0м'
                }
              </div>
              <div className="text-xs text-gray-500">Общее время</div>
            </div>
            
            <div>
              <div className="text-lg font-semibold text-green-600">
                {reliabilityRanking.length > 0 ? 
                  Math.round(reliabilityRanking.reduce((sum, item) => sum + item.reliabilityScore, 0) / reliabilityRanking.length)
                  : 0
                }
              </div>
              <div className="text-xs text-gray-500">Ср. рейтинг</div>
            </div>
            
            <div>
              <div className="text-lg font-semibold text-purple-600">
                {reliabilityRanking.filter(item => item.reliabilityScore >= 90).length}
              </div>
              <div className="text-xs text-gray-500">Отличников</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 