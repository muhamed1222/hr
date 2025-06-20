import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  Upload, Download, Users, Settings, Palette, 
  FileText, Database, Monitor, AlertTriangle, CheckCircle
} from 'lucide-react';

import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { organizationApi } from '../api/organization';

const OrganizationSettings = () => {
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  // Состояния для различных секций
  const [generalSettings, setGeneralSettings] = useState({});
  const [brandingSettings, setBrandingSettings] = useState({});
  const [telegramSettings, setTelegramSettings] = useState({});
  const [importStatus, setImportStatus] = useState(null);

  const tabs = [
    { key: 'general', name: 'Основные', icon: Settings },
    { key: 'branding', name: 'Брендинг', icon: Palette },
    { key: 'telegram', name: 'Telegram', icon: MessageSquare },
    { key: 'import', name: 'Импорт', icon: Upload },
    { key: 'monitoring', name: 'Мониторинг', icon: Monitor }
  ];

  useEffect(() => {
    loadOrganization();
  }, []);

  const loadOrganization = async () => {
    try {
      setLoading(true);
      const data = await organizationApi.getCurrent();
      setOrganization(data);
      
      // Инициализируем настройки
      setGeneralSettings({
        name: data.name,
        description: data.description,
        timezone: data.timezone,
        locale: data.locale,
        maxUsers: data.maxUsers
      });

      setBrandingSettings(data.branding || {});
      setTelegramSettings({
        botToken: data.telegramBotToken,
        ...data.telegramSettings
      });
    } catch (error) {
      console.error('Ошибка загрузки организации:', error);
      toast.error('Ошибка загрузки данных организации');
    } finally {
      setLoading(false);
    }
  };

  const saveGeneralSettings = async () => {
    try {
      setSaving(true);
      await organizationApi.update(organization.id, generalSettings);
      toast.success('Основные настройки сохранены');
      await loadOrganization();
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      toast.error('Ошибка сохранения настроек');
    } finally {
      setSaving(false);
    }
  };

  const saveBrandingSettings = async () => {
    try {
      setSaving(true);
      await organizationApi.update(organization.id, {
        settings: brandingSettings
      });
      toast.success('Настройки брендинга сохранены');
      await loadOrganization();
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      toast.error('Ошибка сохранения брендинга');
    } finally {
      setSaving(false);
    }
  };

  const downloadImportTemplate = async (format) => {
    try {
      const blob = await organizationApi.downloadImportTemplate(organization.id, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `import_template.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(`Шаблон ${format.toUpperCase()} загружен`);
    } catch (error) {
      console.error('Ошибка загрузки шаблона:', error);
      toast.error('Ошибка загрузки шаблона');
    }
  };

  const handleFileImport = async (file) => {
    try {
      setImportStatus({ status: 'uploading', message: 'Загрузка файла...' });
      
      // Сначала валидируем файл
      const validation = await organizationApi.validateImport(organization.id, file);
      
      if (!validation.valid) {
        setImportStatus({
          status: 'error',
          message: 'Ошибки в файле',
          errors: validation.errors
        });
        return;
      }

      if (validation.warnings && validation.warnings.length > 0) {
        setImportStatus({
          status: 'warning',
          message: 'Файл содержит предупреждения',
          warnings: validation.warnings,
          preview: validation.preview
        });
        return;
      }

      setImportStatus({ status: 'importing', message: 'Импорт пользователей...' });
      
      // Выполняем импорт
      const result = await organizationApi.importUsers(organization.id, file, {
        generatePasswords: true,
        sendNotifications: false
      });

      setImportStatus({
        status: 'success',
        message: `Импорт завершён. Успешно: ${result.successful}, ошибок: ${result.failed}`,
        result
      });

      // Обновляем данные организации
      await loadOrganization();
    } catch (error) {
      console.error('Ошибка импорта:', error);
      setImportStatus({
        status: 'error',
        message: error.message || 'Ошибка импорта файла'
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Настройки организации</h1>
        <p className="mt-1 text-sm text-gray-500">
          Управление параметрами и внешним видом вашей организации
        </p>
      </div>

      {/* Информационная панель */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Settings className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{organization.name}</h3>
              <p className="text-sm text-gray-500">{organization.description}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Подписка</div>
            <div className="font-medium text-gray-900 capitalize">
              {organization.subscriptionType}
            </div>
            {organization.stats && (
              <div className="text-xs text-gray-400">
                {organization.stats.userCount} пользователей
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Навигация по вкладкам */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Контент вкладок */}
      {activeTab === 'general' && (
        <GeneralSettingsTab
          settings={generalSettings}
          onChange={setGeneralSettings}
          onSave={saveGeneralSettings}
          saving={saving}
          organization={organization}
        />
      )}

      {activeTab === 'branding' && (
        <BrandingSettingsTab
          settings={brandingSettings}
          onChange={setBrandingSettings}
          onSave={saveBrandingSettings}
          saving={saving}
        />
      )}

      {activeTab === 'telegram' && (
        <TelegramSettingsTab
          settings={telegramSettings}
          onChange={setTelegramSettings}
          organization={organization}
        />
      )}

      {activeTab === 'import' && (
        <ImportTab
          organization={organization}
          onDownloadTemplate={downloadImportTemplate}
          onImport={handleFileImport}
          importStatus={importStatus}
        />
      )}

      {activeTab === 'monitoring' && (
        <MonitoringTab
          organization={organization}
        />
      )}
    </div>
  );
};

// Компоненты вкладок
const GeneralSettingsTab = ({ settings, onChange, onSave, saving, organization }) => (
  <div className="space-y-6">
    <Card>
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Основная информация</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Название организации
            </label>
            <Input
              value={settings.name || ''}
              onChange={(e) => onChange({ ...settings, name: e.target.value })}
              placeholder="Название компании"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Часовой пояс
            </label>
            <select
              value={settings.timezone || ''}
              onChange={(e) => onChange({ ...settings, timezone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Europe/Moscow">Москва (UTC+3)</option>
              <option value="Europe/London">Лондон (UTC+0)</option>
              <option value="America/New_York">Нью-Йорк (UTC-5)</option>
              <option value="Asia/Tokyo">Токио (UTC+9)</option>
            </select>
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Описание
            </label>
            <textarea
              value={settings.description || ''}
              onChange={(e) => onChange({ ...settings, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Краткое описание вашей организации"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Максимум пользователей
            </label>
            <Input
              type="number"
              value={settings.maxUsers || ''}
              onChange={(e) => onChange({ ...settings, maxUsers: parseInt(e.target.value) })}
              placeholder="Без ограничений"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={onSave} loading={saving}>
            Сохранить изменения
          </Button>
        </div>
      </div>
    </Card>

    {/* Статистика */}
    {organization.stats && (
      <Card>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Статистика</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{organization.stats.userCount}</div>
            <div className="text-sm text-blue-500">Пользователей</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{organization.stats.teamCount}</div>
            <div className="text-sm text-green-500">Команд</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {organization.stats.usagePercent || 0}%
            </div>
            <div className="text-sm text-purple-500">Использование</div>
          </div>
        </div>
      </Card>
    )}
  </div>
);

const BrandingSettingsTab = ({ settings, onChange, onSave, saving }) => (
  <Card>
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Настройки брендинга</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Основной цвет
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={settings.primaryColor || '#3B82F6'}
              onChange={(e) => onChange({ ...settings, primaryColor: e.target.value })}
              className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
            />
            <Input
              value={settings.primaryColor || '#3B82F6'}
              onChange={(e) => onChange({ ...settings, primaryColor: e.target.value })}
              placeholder="#3B82F6"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Вторичный цвет
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={settings.secondaryColor || '#1F2937'}
              onChange={(e) => onChange({ ...settings, secondaryColor: e.target.value })}
              className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
            />
            <Input
              value={settings.secondaryColor || '#1F2937'}
              onChange={(e) => onChange({ ...settings, secondaryColor: e.target.value })}
              placeholder="#1F2937"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            URL логотипа
          </label>
          <Input
            value={settings.logo || ''}
            onChange={(e) => onChange({ ...settings, logo: e.target.value })}
            placeholder="https://example.com/logo.png"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Название компании
          </label>
          <Input
            value={settings.companyName || ''}
            onChange={(e) => onChange({ ...settings, companyName: e.target.value })}
            placeholder="Название для отображения"
          />
        </div>
      </div>

      {/* Предварительный просмотр */}
      <div className="mt-6 p-4 border border-gray-200 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Предварительный просмотр</h4>
        <div 
          className="p-4 rounded-lg text-white"
          style={{ backgroundColor: settings.primaryColor || '#3B82F6' }}
        >
          <div className="flex items-center space-x-3">
            {settings.logo && (
              <img src={settings.logo} alt="Logo" className="w-8 h-8 rounded" />
            )}
            <div>
              <div className="font-semibold">{settings.companyName || 'Ваша компания'}</div>
              <div className="text-sm opacity-90">TimeBot Admin Panel</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onSave} loading={saving}>
          Сохранить брендинг
        </Button>
      </div>
    </div>
  </Card>
);

const TelegramSettingsTab = ({ settings, onChange, organization }) => (
  <Card>
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Настройки Telegram бота</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bot Token
          </label>
          <Input
            type="password"
            value={settings.botToken || ''}
            onChange={(e) => onChange({ ...settings, botToken: e.target.value })}
            placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
          />
          <p className="text-xs text-gray-500 mt-1">
            Получите токен у @BotFather в Telegram
          </p>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Инструкция по настройке бота:</h4>
          <ol className="text-sm text-blue-700 space-y-1">
            <li>1. Откройте Telegram и найдите @BotFather</li>
            <li>2. Отправьте команду /newbot</li>
            <li>3. Следуйте инструкциям для создания бота</li>
            <li>4. Скопируйте полученный токен и вставьте выше</li>
            <li>5. Сохраните настройки</li>
          </ol>
        </div>
      </div>
    </div>
  </Card>
);

const ImportTab = ({ organization, onDownloadTemplate, onImport, importStatus }) => {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onImport(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      onImport(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Шаблоны */}
      <Card>
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Шаблоны для импорта</h3>
          <p className="text-sm text-gray-600">
            Скачайте шаблон, заполните данными сотрудников и загрузите обратно
          </p>
          
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => onDownloadTemplate('xlsx')}
            >
              <Download className="w-4 h-4 mr-2" />
              Excel (.xlsx)
            </Button>
            <Button
              variant="outline"
              onClick={() => onDownloadTemplate('csv')}
            >
              <Download className="w-4 h-4 mr-2" />
              CSV (.csv)
            </Button>
          </div>
        </div>
      </Card>

      {/* Загрузка файла */}
      <Card>
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Импорт сотрудников</h3>
          
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <div className="space-y-2">
              <p className="text-lg text-gray-600">
                Перетащите файл сюда или
              </p>
              <label className="cursor-pointer">
                <span className="text-blue-600 hover:text-blue-500 font-medium">
                  выберите файл
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleChange}
                />
              </label>
            </div>
            <p className="text-sm text-gray-400 mt-2">
              Поддерживаются CSV и Excel файлы (максимум 10MB)
            </p>
          </div>

          {/* Статус импорта */}
          {importStatus && (
            <ImportStatusDisplay status={importStatus} />
          )}
        </div>
      </Card>
    </div>
  );
};

const ImportStatusDisplay = ({ status }) => {
  const getStatusIcon = () => {
    switch (status.status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${getStatusColor()}`}>
      <div className="flex items-start space-x-3">
        {getStatusIcon()}
        <div className="flex-1">
          <p className="font-medium">{status.message}</p>
          
          {status.errors && status.errors.length > 0 && (
            <div className="mt-2">
              <p className="text-sm font-medium">Ошибки:</p>
              <ul className="text-sm list-disc list-inside mt-1">
                {status.errors.slice(0, 5).map((error, index) => (
                  <li key={index}>Строка {error.row}: {error.error}</li>
                ))}
                {status.errors.length > 5 && (
                  <li>И ещё {status.errors.length - 5} ошибок...</li>
                )}
              </ul>
            </div>
          )}

          {status.result && (
            <div className="mt-2 text-sm">
              <p>Успешно импортировано: {status.result.successful}</p>
              <p>Ошибок: {status.result.failed}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MonitoringTab = ({ organization }) => (
  <Card>
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Мониторинг и резервное копирование</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Автоматические backup'ы</h4>
          <p className="text-sm text-gray-600 mb-3">
            Система автоматически создаёт резервные копии каждый день в 3:00
          </p>
          <Button variant="outline" size="sm">
            <Database className="w-4 h-4 mr-2" />
            Создать backup сейчас
          </Button>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Мониторинг системы</h4>
          <p className="text-sm text-gray-600 mb-3">
            Отслеживание состояния системы и производительности
          </p>
          <Button variant="outline" size="sm">
            <Monitor className="w-4 h-4 mr-2" />
            Открыть мониторинг
          </Button>
        </div>
      </div>
    </div>
  </Card>
);

export default OrganizationSettings; 