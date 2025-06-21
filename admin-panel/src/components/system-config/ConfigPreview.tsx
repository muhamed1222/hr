import React, { useState } from 'react';
import { Eye, MessageCircle, Clock, Calendar, User } from 'lucide-react';
import { Card } from '../ui/Card';

const ConfigPreview = ({ configs, pendingChanges }) => {
  const [selectedTemplate, setSelectedTemplate] = useState('templates.reminder_message');

  // Получаем текущее значение (с учётом изменений)
  const getCurrentValue = (key) => {
    if (pendingChanges.has(key)) {
      return pendingChanges.get(key);
    }
    return configs[key]?.value || '';
  };

  // Примеры данных для подстановки
  const mockData = {
    'templates.reminder_message': {
      date: '15.12.2024',
      start_time: '09:00',
      end_time: '18:00'
    },
    'templates.late_warning': {
      actual_time: '09:25',
      expected_time: '09:00',
      late_minutes: '25'
    },
    'templates.absence_created': {
      employee_name: 'Анна Петрова',
      absence_type: 'Отпуск',
      start_date: '20.12.2024',
      end_date: '30.12.2024',
      reason: 'Ежегодный оплачиваемый отпуск'
    },
    'templates.absence_approved': {
      absence_type: 'Больничный',
      start_date: '16.12.2024',
      end_date: '18.12.2024',
      approver_name: 'Иван Сидоров'
    },
    'templates.absence_rejected': {
      absence_type: 'Отпуск',
      start_date: '25.12.2024',
      end_date: '10.01.2025',
      rejection_reason: 'Конфликт с рабочим графиком команды'
    }
  };

  // Форматируем шаблон с данными
  const formatTemplate = (template, data) => {
    let formatted = template;
    Object.keys(data).forEach(key => {
      const placeholder = `{${key}}`;
      formatted = formatted.replace(new RegExp(placeholder, 'g'), data[key]);
    });
    return formatted;
  };

  // Доступные шаблоны
  const availableTemplates = Object.keys(configs).filter(key => 
    key.startsWith('templates.')
  );

  // Информация о шаблонах
  const templateInfo = {
    'templates.reminder_message': {
      name: 'Напоминание о заполнении лога',
      icon: Clock,
      color: 'blue',
      description: 'Ежедневное напоминание сотрудникам'
    },
    'templates.late_warning': {
      name: 'Уведомление об опоздании',
      icon: MessageCircle,
      color: 'yellow',
      description: 'Автоматическое уведомление при фиксации опоздания'
    },
    'templates.absence_created': {
      name: 'Новая заявка на отсутствие',
      icon: Calendar,
      color: 'green',
      description: 'Уведомление менеджерам о новой заявке'
    },
    'templates.absence_approved': {
      name: 'Заявка одобрена',
      icon: User,
      color: 'green',
      description: 'Уведомление сотруднику об одобрении'
    },
    'templates.absence_rejected': {
      name: 'Заявка отклонена',
      icon: User,
      color: 'red',
      description: 'Уведомление сотруднику об отклонении'
    }
  };

  if (availableTemplates.length === 0) {
    return null;
  }

  const selectedTemplateValue = getCurrentValue(selectedTemplate);
  const selectedMockData = mockData[selectedTemplate] || {};
  const formattedMessage = formatTemplate(selectedTemplateValue, selectedMockData);
  const templateMeta = templateInfo[selectedTemplate];

  return (
    <Card>
      <div className="flex items-center space-x-3 mb-4">
        <Eye className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-medium text-gray-900">
          Предварительный просмотр шаблонов
        </h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Выбор шаблона */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Выберите шаблон для просмотра:
          </label>
          <div className="space-y-2">
            {availableTemplates.map(templateKey => {
              const meta = templateInfo[templateKey];
              const Icon = meta?.icon || MessageCircle;
              const isSelected = selectedTemplate === templateKey;
              
              return (
                <button
                  key={templateKey}
                  onClick={() => setSelectedTemplate(templateKey)}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg border text-left transition-colors ${
                    isSelected
                      ? 'border-blue-300 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {meta?.name || templateKey}
                    </p>
                    {meta?.description && (
                      <p className="text-xs text-gray-500 truncate">
                        {meta.description}
                      </p>
                    )}
                  </div>
                  {pendingChanges.has(templateKey) && (
                    <div className="w-2 h-2 bg-amber-400 rounded-full flex-shrink-0"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Предварительный просмотр */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Как будет выглядеть сообщение:
          </label>
          
          {/* Telegram-стиль превью */}
          <div className="bg-gray-50 rounded-lg p-4 border">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">TB</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">TimeBot</p>
                <p className="text-xs text-gray-500">сейчас</p>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-3 shadow-sm border">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                {formattedMessage || 'Шаблон пустой'}
              </pre>
            </div>
          </div>

          {/* Используемые переменные */}
          {Object.keys(selectedMockData).length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-gray-700 mb-2">
                Доступные переменные:
              </p>
              <div className="space-y-1">
                {Object.entries(selectedMockData).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-xs">
                    <span className="font-mono text-gray-600">{`{${key}}`}</span>
                    <span className="text-gray-500">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Предупреждение о несохранённых изменениях */}
          {pendingChanges.has(selectedTemplate) && (
            <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
              ⚠️ Отображается версия с несохранёнными изменениями
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default ConfigPreview; 