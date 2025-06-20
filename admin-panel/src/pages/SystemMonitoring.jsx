import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  Monitor, Database, AlertTriangle, CheckCircle, Activity,
  Server, HardDrive, Cpu, Wifi, Download, RefreshCw
} from 'lucide-react';

import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { monitoringApi } from '../api/organization';

const SystemMonitoring = () => {
  const [health, setHealth] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [systemInfo, setSystemInfo] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAllData();
    
    // Автоматическое обновление каждые 30 секунд
    const interval = setInterval(loadAllData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      
      const [healthData, metricsData, systemData, alertsData, logsData] = await Promise.all([
        monitoringApi.getHealth(true),
        monitoringApi.getMetrics(),
        monitoringApi.getSystemInfo(),
        monitoringApi.getAlerts(),
        monitoringApi.getLogs('all', 50)
      ]);

      setHealth(healthData.data.health);
      setMetrics(healthData.data.metrics);
      setSystemInfo(systemData);
      setAlerts(alertsData.alerts);
      setLogs(logsData.logs);
    } catch (error) {
      console.error('Ошибка загрузки данных мониторинга:', error);
      toast.error('Ошибка загрузки данных мониторинга');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
    toast.success('Данные обновлены');
  };

  const createBackup = async () => {
    try {
      const result = await monitoringApi.createBackup();
      toast.success(`Backup создан: ${(result.size / 1024 / 1024).toFixed(2)} MB`);
    } catch (error) {
      console.error('Ошибка создания backup:', error);
      toast.error('Ошибка создания backup');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'unhealthy':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5" />;
      case 'warning':
      case 'unhealthy':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <Monitor className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Системный мониторинг</h1>
          <p className="mt-1 text-sm text-gray-500">
            Состояние системы и производительность
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={refreshData}
            loading={refreshing}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Обновить
          </Button>
          <Button onClick={createBackup}>
            <Database className="w-4 h-4 mr-2" />
            Создать backup
          </Button>
        </div>
      </div>

      {/* Общий статус */}
      {health && (
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-full ${getStatusColor(health.status)}`}>
                {getStatusIcon(health.status)}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Система {health.status === 'healthy' ? 'работает нормально' : 
                          health.status === 'warning' ? 'имеет предупреждения' : 'имеет проблемы'}
                </h3>
                <p className="text-sm text-gray-500">
                  Последняя проверка: {new Date(health.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Время работы</div>
              <div className="font-medium text-gray-900">
                {Math.floor(health.uptime / 3600)}ч {Math.floor((health.uptime % 3600) / 60)}м
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Метрики */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Запросов</div>
                <div className="text-lg font-semibold text-gray-900">{metrics.requests}</div>
                <div className="text-xs text-gray-400">
                  {metrics.requestsPerMinute.toFixed(1)}/мин
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Ошибок</div>
                <div className="text-lg font-semibold text-gray-900">{metrics.errors}</div>
                <div className="text-xs text-gray-400">
                  {metrics.errorRate}%
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded">
                <Server className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Время работы</div>
                <div className="text-lg font-semibold text-gray-900">
                  {Math.floor(metrics.uptime / 3600)}ч
                </div>
                <div className="text-xs text-gray-400">
                  {Math.floor((metrics.uptime % 3600) / 60)}м
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded">
                <Database className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Последний backup</div>
                <div className="text-lg font-semibold text-gray-900">
                  {metrics.lastBackup ? 
                    new Date(metrics.lastBackup).toLocaleDateString() : 
                    'Нет'
                  }
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Алерты */}
      {alerts && alerts.length > 0 && (
        <Card>
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Активные алерты</h3>
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    alert.level === 'critical' 
                      ? 'bg-red-50 border-red-200'
                      : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                      alert.level === 'critical' ? 'text-red-500' : 'text-yellow-500'
                    }`} />
                    <div>
                      <div className={`font-medium ${
                        alert.level === 'critical' ? 'text-red-800' : 'text-yellow-800'
                      }`}>
                        {alert.message}
                      </div>
                      {alert.details && (
                        <div className={`text-sm mt-1 ${
                          alert.level === 'critical' ? 'text-red-600' : 'text-yellow-600'
                        }`}>
                          {JSON.stringify(alert.details, null, 2)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Детальные проверки здоровья */}
      {health && health.checks && (
        <Card>
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Проверки системы</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(health.checks).map(([key, check]) => (
                <div key={key} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-gray-900">{check.name}</div>
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${getStatusColor(check.status)}`}>
                      {getStatusIcon(check.status)}
                      <span className="capitalize">{check.status}</span>
                    </div>
                  </div>
                  
                  {check.details && (
                    <div className="text-sm text-gray-600">
                      {typeof check.details === 'object' ? (
                        <ul className="space-y-1">
                          {Object.entries(check.details).map(([detailKey, value]) => (
                            <li key={detailKey} className="flex justify-between">
                              <span className="capitalize">{detailKey}:</span>
                              <span className="font-mono">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span>{check.details}</span>
                      )}
                    </div>
                  )}
                  
                  {check.error && (
                    <div className="text-sm text-red-600 mt-2">
                      Ошибка: {check.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Системная информация */}
      {systemInfo && (
        <Card>
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Системная информация</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-gray-700 flex items-center">
                  <Server className="w-4 h-4 mr-2" />
                  Процесс
                </h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>PID: {systemInfo.process.pid}</div>
                  <div>Node.js: {systemInfo.process.version}</div>
                  <div>Платформа: {systemInfo.process.platform}</div>
                  <div>Архитектура: {systemInfo.process.arch}</div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-gray-700 flex items-center">
                  <Cpu className="w-4 h-4 mr-2" />
                  Память
                </h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>RSS: {systemInfo.memory.rss} MB</div>
                  <div>Heap Total: {systemInfo.memory.heapTotal} MB</div>
                  <div>Heap Used: {systemInfo.memory.heapUsed} MB</div>
                  <div>External: {systemInfo.memory.external} MB</div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-gray-700 flex items-center">
                  <HardDrive className="w-4 h-4 mr-2" />
                  Окружение
                </h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>NODE_ENV: {systemInfo.environment.nodeEnv}</div>
                  <div>Порт: {systemInfo.environment.port}</div>
                  <div>Часовой пояс: {systemInfo.environment.timezone}</div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Логи */}
      {logs && logs.length > 0 && (
        <Card>
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Последние логи</h3>
            <div className="max-h-96 overflow-y-auto">
              <div className="space-y-2">
                {logs.slice(0, 20).map((log, index) => (
                  <div key={index} className="text-sm font-mono bg-gray-50 p-2 rounded border-l-4 border-gray-300">
                    <div className="flex items-start space-x-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        log.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {log.type}
                      </span>
                      <span className="text-gray-500 text-xs">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-1 text-gray-700 whitespace-pre-wrap">
                      {log.message}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default SystemMonitoring; 