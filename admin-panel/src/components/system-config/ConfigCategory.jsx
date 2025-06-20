import React from 'react';
import { RotateCcw, AlertTriangle, Lock, Info } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

const ConfigCategory = ({ 
  configs, 
  onChange, 
  onReset, 
  getCurrentValue, 
  pendingChanges 
}) => {
  const renderConfigInput = (key, config) => {
    const currentValue = getCurrentValue(key, config.value);
    const hasChanges = pendingChanges.has(key);
    const isSystem = config.isSystem;
    const isEditable = config.isEditable;

    const handleChange = (value) => {
      if (!isEditable) return;
      onChange(key, value);
    };

    const inputProps = {
      value: currentValue || '',
      onChange: (e) => handleChange(e.target.value),
      disabled: !isEditable,
      className: hasChanges ? 'border-amber-300 bg-amber-50' : ''
    };

    switch (config.type) {
      case 'boolean':
        return (
          <div className="flex items-center space-x-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={currentValue === true || currentValue === 'true'}
                onChange={(e) => handleChange(e.target.checked)}
                disabled={!isEditable}
                className="sr-only"
              />
              <div className={`relative w-11 h-6 rounded-full transition-colors ${
                !isEditable 
                  ? 'bg-gray-300 cursor-not-allowed' 
                  : (currentValue === true || currentValue === 'true')
                    ? 'bg-blue-600'
                    : 'bg-gray-200'
              }`}>
                <div
                  className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform ${
                    (currentValue === true || currentValue === 'true') ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </div>
            </label>
            <span className="text-sm text-gray-600">
              {(currentValue === true || currentValue === 'true') ? 'Включено' : 'Отключено'}
            </span>
          </div>
        );

      case 'number':
        return (
          <Input
            type="number"
            {...inputProps}
            onChange={(e) => handleChange(parseFloat(e.target.value) || 0)}
            min={config.validation?.min}
            max={config.validation?.max}
            step={config.validation?.step || 1}
          />
        );

      case 'time':
        return (
          <Input
            type="time"
            {...inputProps}
            pattern="[0-9]{2}:[0-9]{2}"
          />
        );

      case 'date':
        return (
          <Input
            type="date"
            {...inputProps}
          />
        );

      case 'string':
      default:
        // Для длинных текстов используем textarea
        if (config.description?.includes('шаблон') || config.description?.includes('сообщен')) {
          return (
            <textarea
              {...inputProps}
              rows={4}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                hasChanges ? 'border-amber-300 bg-amber-50' : ''
              } ${!isEditable ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              placeholder={config.defaultValue}
            />
          );
        }

        return (
          <Input
            type="text"
            {...inputProps}
            placeholder={config.defaultValue}
          />
        );
    }
  };

  const renderValidationInfo = (config) => {
    if (!config.validation) return null;

    const validation = config.validation;
    const rules = [];

    if (validation.min !== undefined) {
      rules.push(`Минимум: ${validation.min}`);
    }
    if (validation.max !== undefined) {
      rules.push(`Максимум: ${validation.max}`);
    }
    if (validation.pattern) {
      rules.push('Требуется специальный формат');
    }
    if (validation.minLength) {
      rules.push(`Мин. длина: ${validation.minLength}`);
    }
    if (validation.maxLength) {
      rules.push(`Макс. длина: ${validation.maxLength}`);
    }

    if (rules.length === 0) return null;

    return (
      <div className="flex items-start space-x-2 mt-2">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-blue-600">
          {rules.join(' • ')}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {Object.entries(configs).map(([key, config]) => {
        const hasChanges = pendingChanges.has(key);
        const isSystem = config.isSystem;
        const isEditable = config.isEditable;

        return (
          <Card key={key}>
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                {/* Заголовок настройки */}
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="text-sm font-medium text-gray-900">
                    {config.title}
                  </h3>
                  
                  {/* Индикаторы */}
                  <div className="flex items-center space-x-1">
                    {isSystem && (
                      <div className="flex items-center space-x-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                        <Lock className="w-3 h-3" />
                        <span>Системная</span>
                      </div>
                    )}
                    
                    {!isEditable && (
                      <div className="flex items-center space-x-1 px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                        <Lock className="w-3 h-3" />
                        <span>Только чтение</span>
                      </div>
                    )}

                    {hasChanges && (
                      <div className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">
                        Изменено
                      </div>
                    )}
                  </div>
                </div>

                {/* Описание */}
                {config.description && (
                  <p className="text-sm text-gray-500 mb-3">
                    {config.description}
                  </p>
                )}

                {/* Ключ настройки */}
                <div className="text-xs text-gray-400 mb-3 font-mono">
                  {key}
                </div>

                {/* Поле ввода */}
                <div className="mb-3">
                  {renderConfigInput(key, config)}
                </div>

                {/* Информация о валидации */}
                {renderValidationInfo(config)}

                {/* Предупреждение для системных настроек */}
                {isSystem && isEditable && (
                  <div className="flex items-start space-x-2 mt-2 p-2 bg-red-50 rounded">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-red-700">
                      <strong>Осторожно:</strong> Эта настройка влияет на работу системы. 
                      Неправильное значение может нарушить функциональность.
                    </div>
                  </div>
                )}
              </div>

              {/* Кнопка сброса */}
              {isEditable && config.defaultValue && (
                <div className="ml-4 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onReset(key)}
                    className="text-gray-500 hover:text-gray-700"
                    title="Сбросить к значению по умолчанию"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Дополнительная информация */}
            <div className="flex justify-between items-center text-xs text-gray-400 mt-3 pt-3 border-t">
              <div>
                Тип: <span className="font-mono">{config.type}</span>
              </div>
              {config.updatedAt && (
                <div>
                  Обновлено: {new Date(config.updatedAt).toLocaleString('ru-RU')}
                </div>
              )}
            </div>

            {/* Информация об обновившем пользователе */}
            {config.updater && (
              <div className="text-xs text-gray-400 mt-1">
                Обновил: {config.updater.name || config.updater.username}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default ConfigCategory; 