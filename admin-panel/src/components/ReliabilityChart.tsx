import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Award, RefreshCw, Trophy, Medal, Star, Target } from 'lucide-react'

export default function ReliabilityChart({ data, isLoading }) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Award className="h-5 w-5 mr-2" />
            Рейтинг надёжности
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
            <Award className="h-5 w-5 mr-2" />
            Рейтинг надёжности
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

  const getScoreColor = (score) => {
    if (score >= 90) return 'bg-green-500'
    if (score >= 80) return 'bg-blue-500'
    if (score >= 70) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getScoreIcon = (score) => {
    if (score >= 90) return Trophy
    if (score >= 80) return Medal
    if (score >= 70) return Star
    return Target
  }

  const getScoreLabel = (score) => {
    if (score >= 90) return 'Отлично'
    if (score >= 80) return 'Хорошо'
    if (score >= 70) return 'Удовлетворительно'
    return 'Требует внимания'
  }

  // Группируем по категориям
  const categories = {
    excellent: data.filter(item => item.reliabilityScore >= 90),
    good: data.filter(item => item.reliabilityScore >= 80 && item.reliabilityScore < 90),
    satisfactory: data.filter(item => item.reliabilityScore >= 70 && item.reliabilityScore < 80),
    needsAttention: data.filter(item => item.reliabilityScore < 70)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Award className="h-5 w-5 mr-2" />
          Рейтинг надёжности
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Статистика по категориям */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Trophy className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-xl font-bold text-green-600">{categories.excellent.length}</div>
              <div className="text-xs text-green-700">Отлично (90+)</div>
            </div>
            
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Medal className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-xl font-bold text-blue-600">{categories.good.length}</div>
              <div className="text-xs text-blue-700">Хорошо (80-89)</div>
            </div>
            
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Star className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="text-xl font-bold text-yellow-600">{categories.satisfactory.length}</div>
              <div className="text-xs text-yellow-700">Удовлетворительно (70-79)</div>
            </div>
            
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Target className="h-5 w-5 text-red-600" />
              </div>
              <div className="text-xl font-bold text-red-600">{categories.needsAttention.length}</div>
                             <div className="text-xs text-red-700">Требует внимания (менее 70)</div>
            </div>
          </div>

          {/* График */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Топ 8 сотрудников</h4>
            {data.slice(0, 8).map((item, index) => {
              const IconComponent = getScoreIcon(item.reliabilityScore)
              const scoreColor = getScoreColor(item.reliabilityScore)
              const scoreLabel = getScoreLabel(item.reliabilityScore)
              
              return (
                <div key={item.user.id} className="flex items-center space-x-3">
                  {/* Позиция */}
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                    <span className="text-xs font-semibold text-gray-600">
                      {index + 1}
                    </span>
                  </div>
                  
                  {/* Имя */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {item.user.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      @{item.user.username}
                    </div>
                  </div>
                  
                  {/* Прогресс бар */}
                  <div className="flex-1 max-w-24">
                    <div className="bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${scoreColor} transition-all duration-300`}
                        style={{ width: `${item.reliabilityScore}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Балл и значок */}
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <span className="text-sm font-semibold text-gray-900">
                      {item.reliabilityScore}
                    </span>
                    <IconComponent className="h-4 w-4 text-gray-600" />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Детали расчёта */}
          <div className="border-t pt-4">
            <div className="text-xs text-gray-500 space-y-1">
              <p><strong>Расчёт рейтинга:</strong></p>
              <p>• Базовый балл: 100</p>
              <p>• Штраф за опоздания: до -30</p>
              <p>• Штраф за отсутствие отчётов: до -25</p>
              <p>• Бонус за переработку (&gt;8ч): до +15</p>
              <p>• Штраф за недоработку (&lt;7ч): до -20</p>
            </div>
          </div>

          {/* Средний балл */}
          <div className="border-t pt-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {data.length > 0 ? 
                  Math.round(data.reduce((sum, item) => sum + item.reliabilityScore, 0) / data.length) 
                  : 0
                }
              </div>
              <div className="text-xs text-gray-500">Средний рейтинг команды</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 