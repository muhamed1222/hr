import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Building2, Home, Calendar, TrendingUp, Users, BarChart3 } from 'lucide-react';

export default function WorkModeDistribution({ data, isLoading }) {
  const [viewMode, setViewMode] = useState('overview');

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Распределение режимов работы</CardTitle>
          <CardDescription>Анализ офис/удалёнка по командам и времени</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const viewModes = [
    { id: 'overview', label: 'Обзор', icon: BarChart3 },
    { id: 'teams', label: 'По командам', icon: Users },
    { id: 'trends', label: 'Тренды', icon: TrendingUp }
  ];

  const workModes = [
    { 
      id: 'office', 
      label: 'Офис', 
      icon: Building2, 
      color: 'bg-blue-500',
      lightColor: 'bg-blue-100',
      textColor: 'text-blue-700'
    },
    { 
      id: 'remote', 
      label: 'Удалённо', 
      icon: Home, 
      color: 'bg-green-500',
      lightColor: 'bg-green-100',
      textColor: 'text-green-700'
    },
    { 
      id: 'hybrid', 
      label: 'Гибрид', 
      icon: Calendar, 
      color: 'bg-purple-500',
      lightColor: 'bg-purple-100',
      textColor: 'text-purple-700'
    }
  ];

  const getTotalDays = () => {
    if (!data || !data.overview) return 0;
    return Object.values(data.overview).reduce((sum, count) => sum + count, 0);
  };

  const getPercentage = (count, total) => {
    return total > 0 ? ((count / total) * 100).toFixed(1) : 0;
  };

  const renderOverview = () => {
    const totalDays = getTotalDays();
    
    return (
      <div className="space-y-6">
        {/* Круговая диаграмма имитация */}
        <div className="flex justify-center">
          <div className="relative w-48 h-48">
            <svg viewBox="0 0 42 42" className="w-48 h-48">
              <circle
                cx="21"
                cy="21"
                r="15.915"
                fill="transparent"
                stroke="#e5e7eb"
                strokeWidth="3"
              />
              {workModes.map((mode, index) => {
                const count = data?.overview?.[mode.id] || 0;
                const percentage = (count / totalDays) * 100;
                const strokeDasharray = `${percentage} ${100 - percentage}`;
                const strokeDashoffset = workModes
                  .slice(0, index)
                  .reduce((offset, prevMode) => {
                    const prevCount = data?.overview?.[prevMode.id] || 0;
                    return offset - (prevCount / totalDays) * 100;
                  }, 0);
                
                return (
                  <circle
                    key={mode.id}
                    cx="21"
                    cy="21"
                    r="15.915"
                    fill="transparent"
                    stroke={mode.color.replace('bg-', '#')}
                    strokeWidth="3"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    transform="rotate(-90 21 21)"
                  />
                );
              })}
            </svg>
            
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{totalDays}</div>
                <div className="text-sm text-gray-500">дней</div>
              </div>
            </div>
          </div>
        </div>

        {/* Легенда */}
        <div className="grid grid-cols-1 gap-4">
          {workModes.map((mode) => {
            const IconComponent = mode.icon;
            const count = data?.overview?.[mode.id] || 0;
            const percentage = getPercentage(count, totalDays);
            
            return (
              <div key={mode.id} className={`p-4 rounded-lg ${mode.lightColor}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <IconComponent className={`h-5 w-5 mr-3 ${mode.textColor}`} />
                    <span className={`font-medium ${mode.textColor}`}>{mode.label}</span>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${mode.textColor}`}>{count}</div>
                    <div className="text-sm text-gray-600">{percentage}%</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTeams = () => {
    if (!data?.teams || data.teams.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          Нет данных по командам
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {data.teams.map((team) => {
          const totalTeamDays = Object.values(team.modes).reduce((sum, count) => sum + count, 0);
          
          return (
            <div key={team.id} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">{team.name}</h4>
                <span className="text-sm text-gray-500">{totalTeamDays} дней</span>
              </div>
              
              {/* Прогресс бар */}
              <div className="flex h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                {workModes.map((mode) => {
                  const count = team.modes[mode.id] || 0;
                  const width = totalTeamDays > 0 ? (count / totalTeamDays) * 100 : 0;
                  
                  return (
                    <div
                      key={mode.id}
                      className={mode.color}
                      style={{ width: `${width}%` }}
                    />
                  );
                })}
              </div>
              
              {/* Детали */}
              <div className="grid grid-cols-3 gap-2 text-sm">
                {workModes.map((mode) => {
                  const count = team.modes[mode.id] || 0;
                  const percentage = getPercentage(count, totalTeamDays);
                  
                  return (
                    <div key={mode.id} className="text-center">
                      <div className="font-medium">{count}</div>
                      <div className="text-gray-500">{mode.label} ({percentage}%)</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTrends = () => {
    if (!data?.trends || data.trends.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          Нет данных по трендам
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* График трендов */}
        <div className="h-64 flex items-end justify-between border-l border-b border-gray-200 pl-4 pb-4">
          {data.trends.map((point, index) => {
            const maxValue = Math.max(...data.trends.map(p => p.office + p.remote));
            const totalHeight = 200;
            
            const officeHeight = (point.office / maxValue) * totalHeight;
            const remoteHeight = (point.remote / maxValue) * totalHeight;
            
            return (
              <div key={index} className="flex flex-col items-center space-y-2">
                <div className="flex flex-col">
                  <div 
                    className="w-8 bg-blue-500 rounded-t"
                    style={{ height: `${officeHeight}px` }}
                  />
                  <div 
                    className="w-8 bg-green-500 rounded-b"
                    style={{ height: `${remoteHeight}px` }}
                  />
                </div>
                <span className="text-xs text-gray-500 transform -rotate-45">
                  {point.date}
                </span>
              </div>
            );
          })}
        </div>

        {/* Статистика изменений */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center">
              <Building2 className="h-5 w-5 text-blue-600 mr-2" />
              <span className="font-medium text-blue-700">Офисная работа</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-blue-900">
                {data.trends[data.trends.length - 1]?.office || 0}%
              </div>
              <div className="text-sm text-blue-600">
                {data.trendsChange?.office >= 0 ? '+' : ''}{data.trendsChange?.office || 0}% к прошлому периоду
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center">
              <Home className="h-5 w-5 text-green-600 mr-2" />
              <span className="font-medium text-green-700">Удалённая работа</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-green-900">
                {data.trends[data.trends.length - 1]?.remote || 0}%
              </div>
              <div className="text-sm text-green-600">
                {data.trendsChange?.remote >= 0 ? '+' : ''}{data.trendsChange?.remote || 0}% к прошлому периоду
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart3 className="h-5 w-5 mr-2" />
          Распределение режимов работы
        </CardTitle>
        <CardDescription>
          Детальный анализ офис/удалёнка по командам и периодам
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Переключатель режимов просмотра */}
        <div className="flex space-x-2 mb-6">
          {viewModes.map((mode) => {
            const IconComponent = mode.icon;
            return (
              <Button
                key={mode.id}
                variant={viewMode === mode.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode(mode.id)}
                className="flex items-center"
              >
                <IconComponent className="h-4 w-4 mr-2" />
                {mode.label}
              </Button>
            );
          })}
        </div>

        {/* Контент в зависимости от режима */}
        {viewMode === 'overview' && renderOverview()}
        {viewMode === 'teams' && renderTeams()}
        {viewMode === 'trends' && renderTrends()}
      </CardContent>
    </Card>
  );
} 