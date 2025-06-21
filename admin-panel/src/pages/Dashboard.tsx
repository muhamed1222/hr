import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { workLogsAPI } from '@/api/workLogs'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatTime, formatMinutes, getStatusColor, getStatusText, isLateArrival } from '@/lib/utils'
import { 
  Users, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Download,
  RefreshCw,
  Calendar,
  Edit,
  FileSpreadsheet
} from 'lucide-react'
import toast from 'react-hot-toast'
import ExportModal from '@/components/ExportModal'
import EditWorkLogModal from '@/components/EditWorkLogModal'

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedWorkLog, setSelectedWorkLog] = useState(null)

  // Запрос данных команды
  const { data: teamData, isLoading, refetch } = useQuery({
    queryKey: ['team-today'],
    queryFn: workLogsAPI.getTeamToday,
    refetchInterval: 30000, // Обновление каждые 30 секунд
  })

  // Статистика
  const stats = teamData?.data ? calculateStats(teamData.data) : {
    total: 0,
    working: 0,
    late: 0,
    noReport: 0
  }

  const handleExport = () => {
    setIsExportModalOpen(true)
  }

  const handleEditWorkLog = (workLog) => {
    setSelectedWorkLog(workLog)
    setIsEditModalOpen(true)
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setSelectedWorkLog(null)
  }

  const handleSaveWorkLog = () => {
    refetch()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Загрузка данных...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Дашборд</h1>
          <p className="text-gray-600">
            Сводка команды на {new Date().toLocaleDateString('ru-RU')}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Обновить
          </Button>
          <Button onClick={handleExport}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Экспорт отчёта
          </Button>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего сотрудников</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Работают</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.working}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Опоздания</CardTitle>
            <Clock className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.late}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Без отчёта</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.noReport}</div>
          </CardContent>
        </Card>
      </div>

      {/* Таблица команды */}
      <Card>
        <CardHeader>
          <CardTitle>Статус команды</CardTitle>
          <CardDescription>
            Текущий статус всех сотрудников на сегодня
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Сотрудник</th>
                  <th className="text-left py-3 px-4 font-medium">Статус</th>
                  <th className="text-left py-3 px-4 font-medium">Пришёл</th>
                  <th className="text-left py-3 px-4 font-medium">Обед</th>
                  <th className="text-left py-3 px-4 font-medium">Ушёл</th>
                  <th className="text-left py-3 px-4 font-medium">Всего</th>
                  <th className="text-left py-3 px-4 font-medium">Отчёт</th>
                  <th className="text-left py-3 px-4 font-medium">Действия</th>
                </tr>
              </thead>
              <tbody>
                {teamData?.data?.map((item) => (
                  <tr key={item.user.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium">{item.user.name}</div>
                        <div className="text-sm text-gray-600">@{item.user.username || 'N/A'}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                        {getStatusText(item.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        {formatTime(item.workLog?.arrivedAt)}
                        {item.workLog?.arrivedAt && isLateArrival(item.workLog.arrivedAt) && (
                          <AlertCircle className="h-4 w-4 text-red-500 ml-1" />
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {item.workLog?.lunchStart ? (
                        <span>
                          {formatTime(item.workLog.lunchStart)} - {formatTime(item.workLog.lunchEnd)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {formatTime(item.workLog?.leftAt)}
                    </td>
                    <td className="py-3 px-4">
                      {formatMinutes(item.workLog?.totalMinutes)}
                    </td>
                    <td className="py-3 px-4">
                      {item.workLog?.dailyReport ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {item.workLog && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditWorkLog(item.workLog)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Редактировать
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {!teamData?.data?.length && (
              <div className="text-center py-8 text-gray-500">
                Нет данных для отображения
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Модальные окна */}
      <ExportModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />

      <EditWorkLogModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        workLog={selectedWorkLog}
        onSave={handleSaveWorkLog}
      />
    </div>
  )
}

function calculateStats(teamData) {
  return {
    total: teamData.length,
    working: teamData.filter(item => 
      item.status === 'working' || item.status === 'lunch'
    ).length,
    late: teamData.filter(item => 
      item.workLog?.arrivedAt && isLateArrival(item.workLog.arrivedAt)
    ).length,
    noReport: teamData.filter(item => 
      item.workLog && !item.workLog.dailyReport
    ).length
  }
} 