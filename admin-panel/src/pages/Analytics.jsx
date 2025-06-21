import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { analyticsAPI } from '@/api/analytics'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { formatDate, formatMinutes, getRoleText } from '@/lib/utils'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock, 
  Award,
  RefreshCw,
  Calendar,
  Filter,
  Download,
  Target,
  Star,
  Medal,
  Trophy,
  FileText,
  Activity,
  AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'
import ReliabilityChart from '@/components/ReliabilityChart'
import WorkAnalyticsChart from '@/components/WorkAnalyticsChart'
import TopEmployeesCard from '@/components/TopEmployeesCard'
import ExportModal from '@/components/ExportModal'

export default function Analytics() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 дней назад
    endDate: new Date().toISOString().split('T')[0] // сегодня
  })
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)

  // Существующие запросы данных
  const { data: workAnalytics, isLoading: isWorkAnalyticsLoading, refetch: refetchWorkAnalytics } = useQuery({
    queryKey: ['work-analytics', dateRange],
    queryFn: () => analyticsAPI.getWorkAnalytics(dateRange),
    staleTime: 5 * 60 * 1000 // 5 минут
  })

  const { data: reliabilityRanking, isLoading: isRankingLoading, refetch: refetchRanking } = useQuery({
    queryKey: ['reliability-ranking', dateRange],
    queryFn: () => analyticsAPI.getReliabilityRanking({ ...dateRange, limit: 20 }),
    staleTime: 5 * 60 * 1000
  })

  const { data: usersOverview, isLoading: isOverviewLoading, refetch: refetchOverview } = useQuery({
    queryKey: ['users-overview'],
    queryFn: analyticsAPI.getUsersOverview,
    staleTime: 10 * 60 * 1000 // 10 минут
  })

  const { data: workLogsStats, isLoading: isStatsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['work-logs-stats', dateRange],
    queryFn: () => analyticsAPI.getWorkLogsStats(dateRange),
    staleTime: 5 * 60 * 1000
  })

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({ ...prev, [field]: value }))
  }

  const handleRefreshAll = () => {
    refetchWorkAnalytics()
    refetchRanking()
    refetchOverview()
    refetchStats()
    toast.success('Данные обновлены')
  }

  const getReliabilityBadge = (score) => {
    if (score >= 90) return { color: 'text-green-600 bg-green-100', label: 'Отлично', icon: Trophy }
    if (score >= 80) return { color: 'text-blue-600 bg-blue-100', label: 'Хорошо', icon: Medal }
    if (score >= 70) return { color: 'text-yellow-600 bg-yellow-100', label: 'Удовлетворительно', icon: Star }
    return { color: 'text-red-600 bg-red-100', label: 'Требует внимания', icon: Target }
  }

  const isLoading = isWorkAnalyticsLoading || isRankingLoading || isOverviewLoading || isStatsLoading

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Аналитика</h1>
          <p className="text-gray-600">
            Основная аналитика за период {formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={handleRefreshAll} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
          <Button variant="outline" onClick={() => setIsExportModalOpen(true)}>
            <Download className="h-4 w-4 mr-2" />
            Экспорт
          </Button>
        </div>
      </div>

      {/* Уведомление о недоступности расширенной аналитики */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <div>
              <h3 className="font-medium text-yellow-800">Расширенная аналитика временно недоступна</h3>
              <p className="text-sm text-yellow-700">
                Тепловые карты, продвинутые рейтинги и распределение режимов работы находятся в разработке и будут доступны в ближайшее время.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Фильтры даты */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Период анализа
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Начальная дата
              </label>
              <Input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Конечная дата
              </label>
              <Input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
              />
            </div>
            <div>
              <Button onClick={handleRefreshAll} disabled={isLoading} className="w-full">
                <Calendar className="h-4 w-4 mr-2" />
                Применить
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Основные метрики */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего сотрудников</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usersOverview?.totalUsers || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {usersOverview?.activeUsers || 0} активных
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Работают сегодня</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usersOverview?.workingToday || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {usersOverview?.onLunch || 0} на обеде
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Средняя надёжность</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workLogsStats?.avgReliability || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              За последние 30 дней
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Общее время работы</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMinutes(workLogsStats?.totalMinutes || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              За выбранный период
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Графики */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Аналитика работы</CardTitle>
            <CardDescription>
              Статистика по дням недели и часам
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WorkAnalyticsChart data={workAnalytics} isLoading={isWorkAnalyticsLoading} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Надёжность сотрудников</CardTitle>
            <CardDescription>
              Рейтинг по пунктуальности
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReliabilityChart data={reliabilityRanking} isLoading={isRankingLoading} />
          </CardContent>
        </Card>
      </div>

      {/* Топ сотрудников */}
      <Card>
        <CardHeader>
          <CardTitle>Топ сотрудников</CardTitle>
          <CardDescription>
            Лучшие по надёжности и производительности
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TopEmployeesCard data={reliabilityRanking} isLoading={isRankingLoading} />
        </CardContent>
      </Card>

      {/* Модальное окно экспорта */}
      <ExportModal 
        isOpen={isExportModalOpen} 
        onClose={() => setIsExportModalOpen(false)}
        dateRange={dateRange}
      />
    </div>
  )
} 