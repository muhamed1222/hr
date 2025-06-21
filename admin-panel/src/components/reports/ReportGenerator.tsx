import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { 
  FileText, 
  Download, 
  Calendar, 
  Users, 
  Filter, 
  Settings,
  BarChart3,
  Clock,
  TrendingUp,
  Building2,
  Home,
  Award
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ReportGenerator({ onGenerateReport, isGenerating }) {
  const [reportConfig, setReportConfig] = useState({
    // Основные параметры
    title: 'Отчёт по работе команды',
    dateRange: {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    },
    
    // Фильтры
    teams: [],
    employees: [],
    workModes: ['office', 'remote'],
    
    // Метрики для включения
    metrics: {
      reliability: true,
      punctuality: true,
      overtime: true,
      workModes: true,
      activity: true,
      absences: true
    },
    
    // Настройки экспорта
    format: 'excel', // 'excel', 'pdf', 'csv'
    includeCharts: true,
    includeRawData: false,
    groupBy: 'teams' // 'teams', 'employees', 'dates'
  });

  const [availableFilters, setAvailableFilters] = useState({
    teams: [
      { id: 1, name: 'Разработка' },
      { id: 2, name: 'Дизайн' },
      { id: 3, name: 'Маркетинг' },
      { id: 4, name: 'HR' }
    ],
    employees: [
      { id: 1, name: 'Иван Петров', team: 'Разработка' },
      { id: 2, name: 'Мария Сидорова', team: 'Дизайн' },
      { id: 3, name: 'Алексей Иванов', team: 'Маркетинг' }
    ]
  });

  const updateConfig = (path, value) => {
    setReportConfig(prev => {
      const newConfig = { ...prev };
      const keys = path.split('.');
      let current = newConfig;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newConfig;
    });
  };

  const handleGenerateReport = async () => {
    try {
      // Валидация
      if (!reportConfig.title.trim()) {
        toast.error('Укажите название отчёта');
        return;
      }
      
      if (new Date(reportConfig.dateRange.startDate) >= new Date(reportConfig.dateRange.endDate)) {
        toast.error('Неверный период дат');
        return;
      }

      // Проверяем, что выбрана хотя бы одна метрика
      const selectedMetrics = Object.values(reportConfig.metrics).filter(Boolean);
      if (selectedMetrics.length === 0) {
        toast.error('Выберите хотя бы одну метрику для отчёта');
        return;
      }

      await onGenerateReport(reportConfig);
      toast.success('Отчёт сгенерирован успешно!');
    } catch (error) {
      toast.error('Ошибка при генерации отчёта');
      console.error(error);
    }
  };

  const presetConfigs = [
    {
      name: 'Месячный отчёт для руководства',
      config: {
        ...reportConfig,
        title: 'Месячный отчёт по команде',
        metrics: {
          reliability: true,
          punctuality: true,
          overtime: true,
          workModes: true,
          activity: false,
          absences: true
        },
        format: 'pdf',
        includeCharts: true,
        groupBy: 'teams'
      }
    },
    {
      name: 'Детальная аналитика по сотрудникам',
      config: {
        ...reportConfig,
        title: 'Индивидуальная производительность',
        metrics: {
          reliability: true,
          punctuality: true,
          overtime: true,
          workModes: false,
          activity: true,
          absences: false
        },
        format: 'excel',
        includeRawData: true,
        groupBy: 'employees'
      }
    },
    {
      name: 'Отчёт по режимам работы',
      config: {
        ...reportConfig,
        title: 'Анализ офис/удалёнка',
        metrics: {
          reliability: false,
          punctuality: false,
          overtime: false,
          workModes: true,
          activity: true,
          absences: false
        },
        format: 'excel',
        includeCharts: true,
        groupBy: 'teams'
      }
    }
  ];

  const metricOptions = [
    { 
      key: 'reliability', 
      label: 'Надёжность сотрудников', 
      icon: Award,
      description: 'Общий рейтинг надёжности' 
    },
    { 
      key: 'punctuality', 
      label: 'Пунктуальность', 
      icon: Clock,
      description: 'Анализ опозданий и соблюдения расписания' 
    },
    { 
      key: 'overtime', 
      label: 'Переработки', 
      icon: TrendingUp,
      description: 'Статистика сверхурочной работы' 
    },
    { 
      key: 'workModes', 
      label: 'Режимы работы', 
      icon: Building2,
      description: 'Распределение офис/удалёнка' 
    },
    { 
      key: 'activity', 
      label: 'Активность', 
      icon: BarChart3,
      description: 'Тепловая карта активности' 
    },
    { 
      key: 'absences', 
      label: 'Отсутствия', 
      icon: Calendar,
      description: 'Отпуска, больничные, командировки' 
    }
  ];

  return (
    <div className="space-y-6">
      {/* Быстрые пресеты */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Быстрые настройки
          </CardTitle>
          <CardDescription>
            Готовые шаблоны отчётов для типовых задач
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {presetConfigs.map((preset, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-auto p-4 text-left"
                onClick={() => setReportConfig(preset.config)}
              >
                <div>
                  <div className="font-medium">{preset.name}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {preset.config.format.toUpperCase()} • {preset.config.groupBy === 'teams' ? 'По командам' : 'По сотрудникам'}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Основные настройки */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Параметры отчёта
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Название и период */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Название отчёта
              </label>
              <Input
                value={reportConfig.title}
                onChange={(e) => updateConfig('title', e.target.value)}
                placeholder="Введите название отчёта"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Начальная дата
              </label>
              <Input
                type="date"
                value={reportConfig.dateRange.startDate}
                onChange={(e) => updateConfig('dateRange.startDate', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Конечная дата
              </label>
              <Input
                type="date"
                value={reportConfig.dateRange.endDate}
                onChange={(e) => updateConfig('dateRange.endDate', e.target.value)}
              />
            </div>
          </div>

          {/* Фильтры */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              Фильтры данных
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">Команды</label>
                <select
                  multiple
                  className="w-full border border-gray-300 rounded-md p-2 text-sm"
                  value={reportConfig.teams}
                  onChange={(e) => updateConfig('teams', Array.from(e.target.selectedOptions, option => option.value))}
                >
                  {availableFilters.teams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Оставьте пустым для всех команд</p>
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 mb-2">Режимы работы</label>
                <div className="space-y-2">
                  {[
                    { value: 'office', label: 'Офис', icon: Building2 },
                    { value: 'remote', label: 'Удалённо', icon: Home }
                  ].map(mode => {
                    const IconComponent = mode.icon;
                    return (
                      <label key={mode.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={reportConfig.workModes.includes(mode.value)}
                          onChange={(e) => {
                            const newModes = e.target.checked
                              ? [...reportConfig.workModes, mode.value]
                              : reportConfig.workModes.filter(m => m !== mode.value);
                            updateConfig('workModes', newModes);
                          }}
                          className="mr-2"
                        />
                        <IconComponent className="h-4 w-4 mr-2" />
                        {mode.label}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Метрики */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              Включить в отчёт
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {metricOptions.map(metric => {
                const IconComponent = metric.icon;
                return (
                  <label key={metric.key} className="flex items-start p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reportConfig.metrics[metric.key]}
                      onChange={(e) => updateConfig(`metrics.${metric.key}`, e.target.checked)}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="flex items-center">
                        <IconComponent className="h-4 w-4 mr-2" />
                        <span className="font-medium text-gray-900">{metric.label}</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{metric.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Настройки экспорта */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <Download className="h-4 w-4 mr-2" />
              Настройки экспорта
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">Формат файла</label>
                <select
                  value={reportConfig.format}
                  onChange={(e) => updateConfig('format', e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm"
                >
                  <option value="excel">Excel (.xlsx)</option>
                  <option value="pdf">PDF (.pdf)</option>
                  <option value="csv">CSV (.csv)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 mb-2">Группировка</label>
                <select
                  value={reportConfig.groupBy}
                  onChange={(e) => updateConfig('groupBy', e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm"
                >
                  <option value="teams">По командам</option>
                  <option value="employees">По сотрудникам</option>
                  <option value="dates">По датам</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={reportConfig.includeCharts}
                    onChange={(e) => updateConfig('includeCharts', e.target.checked)}
                    className="mr-2"
                  />
                  Включить графики
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={reportConfig.includeRawData}
                    onChange={(e) => updateConfig('includeRawData', e.target.checked)}
                    className="mr-2"
                  />
                  Сырые данные
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Кнопка генерации */}
      <div className="flex justify-end">
        <Button
          onClick={handleGenerateReport}
          disabled={isGenerating}
          size="lg"
          className="flex items-center"
        >
          {isGenerating ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {isGenerating ? 'Генерация...' : 'Сгенерировать отчёт'}
        </Button>
      </div>
    </div>
  );
} 