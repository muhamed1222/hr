import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { workLogsAPI } from '@/api/workLogs'
import { X, Save, Clock, Users, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function EditWorkLogModal({ isOpen, onClose, workLog, onSave }) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    arrivedAt: '',
    leftAt: '',
    lunchStart: '',
    lunchEnd: '',
    dailyReport: '',
    problems: '',
    workMode: 'office'
  })

  // Заполняем форму при открытии модалки
  useEffect(() => {
    if (workLog && isOpen) {
      setFormData({
        arrivedAt: workLog.arrivedAt ? workLog.arrivedAt.slice(0, 5) : '',
        leftAt: workLog.leftAt ? workLog.leftAt.slice(0, 5) : '',
        lunchStart: workLog.lunchStart ? workLog.lunchStart.slice(0, 5) : '',
        lunchEnd: workLog.lunchEnd ? workLog.lunchEnd.slice(0, 5) : '',
        dailyReport: workLog.dailyReport || '',
        problems: workLog.problems || '',
        workMode: workLog.workMode || 'office'
      })
    }
  }, [workLog, isOpen])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const validateTimes = () => {
    const { arrivedAt, leftAt, lunchStart, lunchEnd } = formData
    
    // Проверяем логику времён
    if (arrivedAt && leftAt && arrivedAt >= leftAt) {
      toast.error('Время ухода должно быть позже времени прихода')
      return false
    }
    
    if (lunchStart && lunchEnd && lunchStart >= lunchEnd) {
      toast.error('Окончание обеда должно быть позже начала')
      return false
    }
    
    if (lunchStart && arrivedAt && lunchStart <= arrivedAt) {
      toast.error('Обед не может начаться раньше прихода')
      return false
    }
    
    if (lunchEnd && leftAt && lunchEnd >= leftAt) {
      toast.error('Обед должен закончиться до ухода')
      return false
    }
    
    return true
  }

  const handleSave = async () => {
    if (!validateTimes()) return
    
    setIsLoading(true)
    try {
      // Подготавливаем данные для отправки  
      const updateData = { ...formData }
      
      // Преобразуем время в полный формат для backend, если есть значения
      if (updateData.arrivedAt) {
        updateData.arrivedAt = `${updateData.arrivedAt}:00`
      }
      if (updateData.leftAt) {
        updateData.leftAt = `${updateData.leftAt}:00`
      }
      if (updateData.lunchStart) {
        updateData.lunchStart = `${updateData.lunchStart}:00`
      }
      if (updateData.lunchEnd) {
        updateData.lunchEnd = `${updateData.lunchEnd}:00`
      }

      await workLogsAPI.updateWorkLog(workLog.id, updateData)
      
      toast.success('Запись обновлена!')
      onSave() // Обновляем данные в родительском компоненте
      onClose()
    } catch (error) {
      toast.error('Ошибка при обновлении записи')
      console.error('Update error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen || !workLog) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Редактирование записи</span>
              </CardTitle>
                             <CardDescription>
                 {workLog.user?.name || 'Неизвестный'} • {workLog.workDate}
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
            {/* Предупреждение */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">
                  Внимание
                </span>
              </div>
              <p className="text-sm text-amber-700 mt-1">
                Изменения будут записаны в аудит-лог. Указывайте время в формате ЧЧ:ММ.
              </p>
            </div>

            {/* Время прихода и ухода */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Время прихода
                </label>
                                 <Input
                   type="time"
                   name="arrivedAt"
                   value={formData.arrivedAt}
                   onChange={handleChange}
                 />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Время ухода
                </label>
                                 <Input
                   type="time"
                   name="leftAt"
                   value={formData.leftAt}
                   onChange={handleChange}
                 />
              </div>
            </div>

            {/* Обед */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Начало обеда
                </label>
                                 <Input
                   type="time"
                   name="lunchStart"
                   value={formData.lunchStart}
                   onChange={handleChange}
                 />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Окончание обеда
                </label>
                                 <Input
                   type="time"
                   name="lunchEnd"
                   value={formData.lunchEnd}
                   onChange={handleChange}
                 />
              </div>
            </div>

            {/* Режим работы */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Режим работы
              </label>
                             <select
                 name="workMode"
                 value={formData.workMode}
                 onChange={handleChange}
                 className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
               >
                <option value="office">В офисе</option>
                <option value="remote">Удалённо</option>
                <option value="hybrid">Гибрид</option>
              </select>
            </div>

            {/* Отчёт о работе */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Отчёт о работе
              </label>
                             <textarea
                 name="dailyReport"
                 value={formData.dailyReport}
                 onChange={handleChange}
                 rows={3}
                 className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                 placeholder="Что было сделано за день..."
               />
            </div>

            {/* Проблемы */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Проблемы и замечания
              </label>
              <textarea
                name="problems"
                value={formData.problems}
                onChange={handleChange}
                rows={2}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                placeholder="Возникшие проблемы или замечания..."
              />
            </div>

            {/* Кнопки */}
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Отмена
              </Button>
              <Button
                onClick={handleSave}
                disabled={isLoading}
              >
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 