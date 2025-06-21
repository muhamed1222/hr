import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { reportsAPI } from '@/api/reports'
import { X, Download, FileSpreadsheet, FileText, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ExportModal({ isOpen, onClose }) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    format: 'detailed', // detailed или summary
    userId: '', // если нужен конкретный пользователь
  })

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const downloadFile = (blob, filename) => {
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const handleExportExcel = async () => {
    setIsLoading(true)
    try {
      const response = await reportsAPI.exportExcel(formData)
      
      const filename = `timebot_report_${formData.startDate}_${formData.endDate}.xlsx`
      downloadFile(response.data, filename)
      
      toast.success('Excel отчёт скачан!')
      onClose()
    } catch (error) {
      toast.error('Ошибка экспорта Excel')
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportPDF = async () => {
    setIsLoading(true)
    try {
      const response = await reportsAPI.exportPDF(formData)
      
      const filename = `timebot_report_${formData.startDate}_${formData.endDate}.pdf`
      downloadFile(response.data, filename)
      
      toast.success('PDF отчёт скачан!')
      onClose()
    } catch (error) {
      toast.error('Ошибка экспорта PDF')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Экспорт отчёта</CardTitle>
              <CardDescription>
                Выберите параметры для генерации отчёта
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Выбор периода */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <h3 className="text-sm font-medium">Период</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Дата начала
                  </label>
                  <Input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Дата окончания
                  </label>
                  <Input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Тип отчёта */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Тип отчёта
              </label>
              <select
                name="format"
                value={formData.format}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="detailed">Детальный отчёт</option>
                <option value="summary">Сводный отчёт</option>
              </select>
            </div>

            {/* ID пользователя (опционально) */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                ID сотрудника (опционально)
              </label>
              <Input
                type="number"
                name="userId"
                placeholder="Оставьте пустым для всех сотрудников"
                value={formData.userId}
                onChange={handleChange}
              />
            </div>

            {/* Кнопки экспорта */}
            <div className="flex flex-col space-y-3 pt-4">
              <Button
                onClick={handleExportExcel}
                disabled={isLoading}
                className="w-full"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                {isLoading ? 'Генерация...' : 'Скачать Excel'}
              </Button>
              
              <Button
                variant="outline"
                onClick={handleExportPDF}
                disabled={isLoading}
                className="w-full"
              >
                <FileText className="h-4 w-4 mr-2" />
                {isLoading ? 'Генерация...' : 'Скачать PDF'}
              </Button>
            </div>

            <div className="text-xs text-gray-500 text-center">
              Отчёт будет содержать данные за выбранный период
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 