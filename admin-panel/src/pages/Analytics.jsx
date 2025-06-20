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
  Activity
} from 'lucide-react'
import toast from 'react-hot-toast'
import ReliabilityChart from '@/components/ReliabilityChart'
import WorkAnalyticsChart from '@/components/WorkAnalyticsChart'
import TopEmployeesCard from '@/components/TopEmployeesCard'
import ExportModal from '@/components/ExportModal'
// Новые BI компоненты
import ActivityHeatmap from '@/components/charts/ActivityHeatmap'
import AdvancedRankingsChart from '@/components/charts/AdvancedRankingsChart'
import WorkModeDistribution from '@/components/charts/WorkModeDistribution'
import ReportGenerator from '@/components/reports/ReportGenerator'

export default function Analytics() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 дней назад
    endDate: new Date().toISOString().split('T')[0] // сегодня
  })
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('overview') // overview, rankings, distribution, reports
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)

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

  // Новые запросы для BI компонентов
  const { data: activityHeatmap, isLoading: isHeatmapLoading, refetch: refetchHeatmap } = useQuery({
    queryKey: ['activity-heatmap', dateRange],
    queryFn: () => analyticsAPI.getActivityHeatmap(dateRange),
    staleTime: 5 * 60 * 1000,
    enabled: activeTab === 'overview' || activeTab === 'distribution'
  })

  const { data: advancedRankings, isLoading: isAdvancedRankingsLoading, refetch: refetchAdvancedRankings } = useQuery({
    queryKey: ['advanced-rankings', dateRange],
    queryFn: () => analyticsAPI.getAdvancedRankings({ ...dateRange, limit: 15 }),
    staleTime: 5 * 60 * 1000,
    enabled: activeTab === 'rankings'
  })

  const { data: workModeDistribution, isLoading: isWorkModeLoading, refetch: refetchWorkMode } = useQuery({
    queryKey: ['work-mode-distribution', dateRange],
    queryFn: () => analyticsAPI.getWorkModeDistribution(dateRange),
    staleTime: 5 * 60 * 1000,
    enabled: activeTab === 'distribution'
  })

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({ ...prev, [field]: value }))
  }

  const handleRefreshAll = () => {
    refetchWorkAnalytics()
    refetchRanking()
    refetchOverview()
    refetchStats()
    refetchHeatmap()
    refetchAdvancedRankings()
    refetchWorkMode()
    toast.success('Данные обновлены')
  }

  const handleGenerateReport = async (reportConfig) => {
    try {
      setIsGeneratingReport(true)
      const response = await analyticsAPI.generateReport(reportConfig)
      
      // Обработка ответа в зависимости от формата
      if (reportConfig.format === 'json') {
        console.log('Отчёт сгенерирован:', response.data)
      } else {
        // Для файлов создаём ссылку для скачивания
        const blob = new Blob([response.data])
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${reportConfig.title}.${reportConfig.format}`
        link.click()
        window.URL.revokeObjectURL(url)
      }
      
      toast.success('Отчёт успешно сгенерирован!')
    } catch (error) {
      console.error('Ошибка генерации отчёта:', error)
      toast.error('Ошибка при генерации отчёта')
    } finally {
      setIsGeneratingReport(false)
    }
  }

  const getReliabilityBadge = (score) => {
    if (score >= 90) return { color: 'text-green-600 bg-green-100', label: 'Отлично', icon: Trophy }
    if (score >= 80) return { color: 'text-blue-600 bg-blue-100', label: 'Хорошо', icon: Medal }
    if (score >= 70) return { color: 'text-yellow-600 bg-yellow-100', label: 'Удовлетворительно', icon: Star }
    return { color: 'text-red-600 bg-red-100', label: 'Требует внимания', icon: Target }
  }

  const isLoading = isWorkAnalyticsLoading || isRankingLoading || isOverviewLoading || isStatsLoading

  const tabs = [
    { id: 'overview', label: 'Обзор', icon: BarChart3 },
    { id: 'rankings', label: 'Рейтинги', icon: Trophy },
    { id: 'distribution', label: 'Распределение', icon: Activity },
    { id: 'reports', label: 'Отчёты', icon: FileText }
  ]

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">BI Mini-Platform</h1>
          <p className="text-gray-600">
            Продвинутая аналитика и бизнес-интеллект за период {formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)}
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
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setDateRange({
                  startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  endDate: new Date().toISOString().split('T')[0]
                })}
              >
                7 дней
              </Button>
              <Button
                variant="outline"
                onClick={() => setDateRange({
                  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  endDate: new Date().toISOString().split('T')[0]
                })}
              >
                30 дней
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Вкладки навигации */}
      <div className="flex space-x-2 border-b border-gray-200">
        {tabs.map((tab) => {
          const IconComponent = tab.icon
          return (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center"
            >
              <IconComponent className="h-4 w-4 mr-2" />
              {tab.label}
            </Button>
          )
        })}
      </div>

      {/* Контент вкладок */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Общая статистика */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Всего сотрудников</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{usersOverview?.data?.total || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Активных: {usersOverview?.data?.active || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Рабочих дней</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{workLogsStats?.data?.totalDays || 0}</div>
                <p className="text-xs text-muted-foreground">
                  За выбранный период
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Среднее время</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{workLogsStats?.data?.averageWorkHours || 0}ч</div>
                <p className="text-xs text-muted-foreground">
                  В день на сотрудника
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Опоздания</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{workLogsStats?.data?.lateArrivals || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Случаев за период
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Основные графики */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WorkAnalyticsChart 
              data={workAnalytics?.data || []} 
              isLoading={isWorkAnalyticsLoading}
            />
            <ReliabilityChart 
              data={reliabilityRanking?.data || []} 
              isLoading={isRankingLoading}
            />
          </div>

          {/* Тепловая карта активности */}
          <ActivityHeatmap
            data={activityHeatmap?.data || []}
            isLoading={isHeatmapLoading}
          />

          {/* Топ сотрудников */}
          <TopEmployeesCard 
            workAnalytics={workAnalytics?.data || []}
            reliabilityRanking={reliabilityRanking?.data || []}
            isLoading={isWorkAnalyticsLoading || isRankingLoading}
          />
        </div>
      )}

      {activeTab === 'rankings' && (
        <div className="space-y-6">
          <AdvancedRankingsChart
            data={advancedRankings?.data || {}}
            isLoading={isAdvancedRankingsLoading}
          />
        </div>
      )}

      {activeTab === 'distribution' && (
        <div className="space-y-6">
          <WorkModeDistribution
            data={workModeDistribution?.data || {}}
            isLoading={isWorkModeLoading}
          />
          
          {/* Дополнительная тепловая карта для этой вкладки */}
          <ActivityHeatmap
            data={activityHeatmap?.data || []}
            isLoading={isHeatmapLoading}
          />
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-6">
          <ReportGenerator
            onGenerateReport={handleGenerateReport}
            isGenerating={isGeneratingReport}
          />
        </div>
      )}

      {/* Модальное окно экспорта */}
      <ExportModal 
        isOpen={isExportModalOpen} 
        onClose={() => setIsExportModalOpen(false)} 
      />
    </div>
  )
} 