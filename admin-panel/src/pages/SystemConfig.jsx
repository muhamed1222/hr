import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  Clock, Bell, MessageSquare, Settings, Shield, Link, BarChart,
  Save, RotateCcw, AlertTriangle, Info, CheckCircle
} from 'lucide-react';

import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import ConfigCategory from '../components/system-config/ConfigCategory';
import ConfigPreview from '../components/system-config/ConfigPreview';
import { systemConfigApi } from '../api/systemConfig';

const SystemConfig = () => {
  const [configs, setConfigs] = useState({});
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('work_schedule');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(new Map());

  // Иконки для категорий
  const categoryIcons = {
    work_schedule: Clock,
    notifications: Bell,
    message_templates: MessageSquare,
    system: Settings,
    access_control: Shield,
    integrations: Link,
    analytics: BarChart
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [configsData, categoriesData] = await Promise.all([
        systemConfigApi.getAllConfigs(),
        systemConfigApi.getCategories()
      ]);

      setConfigs(configsData);
      setCategories(categoriesData);

      // Устанавливаем первую доступную категорию как активную
      if (categoriesData.length > 0 && !configsData[activeCategory]) {
        setActiveCategory(categoriesData[0].key);
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек:', error);
      toast.error('Ошибка загрузки настроек');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (key, value) => {
    const newChanges = new Map(pendingChanges);
    newChanges.set(key, value);
    setPendingChanges(newChanges);
    setHasChanges(true);
  };

  const saveChanges = async () => {
    if (pendingChanges.size === 0) return;

    try {
      setSaving(true);
      
      const updates = Array.from(pendingChanges.entries()).map(([key, value]) => ({
        key,
        value
      }));

      const result = await systemConfigApi.bulkUpdate(updates);

      if (result.errors && result.errors.length > 0) {
        // Показываем ошибки
        result.errors.forEach(error => {
          toast.error(`${error.key}: ${error.error}`);
        });
      }

      if (result.updated && result.updated.length > 0) {
        toast.success(`Сохранено ${result.updated.length} настроек`);
        
        // Обновляем конфигурацию
        const newConfigs = { ...configs };
        result.updated.forEach(update => {
          const categoryConfigs = newConfigs[activeCategory];
          if (categoryConfigs && categoryConfigs[update.key]) {
            categoryConfigs[update.key].value = update.newValue;
          }
        });
        setConfigs(newConfigs);
      }

      setPendingChanges(new Map());
      setHasChanges(false);
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      toast.error('Ошибка сохранения настроек');
    } finally {
      setSaving(false);
    }
  };

  const resetChanges = () => {
    setPendingChanges(new Map());
    setHasChanges(false);
    toast.success('Изменения отменены');
  };

  const resetToDefault = async (key) => {
    try {
      await systemConfigApi.resetToDefault(key);
      toast.success('Настройка сброшена к значению по умолчанию');
      
      // Обновляем данные
      loadData();
      
      // Убираем из pending changes
      const newChanges = new Map(pendingChanges);
      newChanges.delete(key);
      setPendingChanges(newChanges);
      setHasChanges(newChanges.size > 0);
    } catch (error) {
      console.error('Ошибка сброса настройки:', error);
      toast.error('Ошибка сброса настройки');
    }
  };

  const getCurrentValue = (key, originalValue) => {
    return pendingChanges.has(key) ? pendingChanges.get(key) : originalValue;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="h-96 bg-gray-200 rounded"></div>
            <div className="lg:col-span-3 h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const currentCategoryData = configs[activeCategory] || {};
  const currentCategoryInfo = categories.find(cat => cat.key === activeCategory);

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Системные настройки</h1>
          <p className="mt-1 text-sm text-gray-500">
            Централизованное управление поведением системы
          </p>
        </div>

        {/* Кнопки управления */}
        {hasChanges && (
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={resetChanges}
              disabled={saving}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Отменить
            </Button>
            <Button
              onClick={saveChanges}
              disabled={saving}
              loading={saving}
            >
              <Save className="w-4 h-4 mr-2" />
              Сохранить изменения ({pendingChanges.size})
            </Button>
          </div>
        )}
      </div>

      {/* Предупреждение о несохранённых изменениях */}
      {hasChanges && (
        <Card className="border-amber-200 bg-amber-50">
          <div className="flex items-center space-x-3 text-amber-800">
            <AlertTriangle className="w-5 h-5" />
            <div>
              <p className="font-medium">У вас есть несохранённые изменения</p>
              <p className="text-sm">Не забудьте сохранить изменения перед переходом к другой категории.</p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Боковая панель с категориями */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
            Категории
          </h3>
          {categories.map((category) => {
            const Icon = categoryIcons[category.key] || Settings;
            const isActive = activeCategory === category.key;
            const categoryHasChanges = Object.keys(currentCategoryData).some(key => 
              pendingChanges.has(key)
            );

            return (
              <button
                key={category.key}
                onClick={() => setActiveCategory(category.key)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{category.name}</p>
                  <p className="text-xs text-gray-500 truncate">{category.description}</p>
                </div>
                {categoryHasChanges && (
                  <div className="w-2 h-2 bg-amber-400 rounded-full flex-shrink-0"></div>
                )}
              </button>
            );
          })}
        </div>

        {/* Основной контент */}
        <div className="lg:col-span-3 space-y-6">
          {/* Информация о категории */}
          {currentCategoryInfo && (
            <Card>
              <div className="flex items-center space-x-3">
                {(() => {
                  const Icon = categoryIcons[currentCategoryInfo.key] || Settings;
                  return <Icon className="w-6 h-6 text-blue-600" />;
                })()}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {currentCategoryInfo.name}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {currentCategoryInfo.description}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Настройки категории */}
          {Object.keys(currentCategoryData).length > 0 ? (
            <ConfigCategory
              configs={currentCategoryData}
              onChange={handleConfigChange}
              onReset={resetToDefault}
              getCurrentValue={getCurrentValue}
              pendingChanges={pendingChanges}
            />
          ) : (
            <Card>
              <div className="text-center py-8">
                <Info className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Настройки не найдены
                </h3>
                <p className="text-gray-500">
                  В этой категории пока нет доступных настроек.
                </p>
              </div>
            </Card>
          )}

          {/* Предварительный просмотр (для шаблонов сообщений) */}
          {activeCategory === 'message_templates' && (
            <ConfigPreview
              configs={currentCategoryData}
              pendingChanges={pendingChanges}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemConfig; 