import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Trophy, Clock, TrendingUp, AlertTriangle, Award, Star } from 'lucide-react';

export default function AdvancedRankingsChart({ data, isLoading }) {
  const [activeTab, setActiveTab] = useState('reliability');

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Рейтинги сотрудников</CardTitle>
          <CardDescription>Топ сотрудников по различным метрикам</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const tabs = [
    {
      id: 'reliability',
      label: 'Надёжность',
      icon: Trophy,
      description: 'Рейтинг по общей надёжности'
    },
    {
      id: 'punctuality',
      label: 'Пунктуальность',
      icon: Clock,
      description: 'Меньше всего опозданий'
    },
    {
      id: 'overtime',
      label: 'Переработки',
      icon: TrendingUp,
      description: 'Больше всего переработок'
    },
    {
      id: 'consistency',
      label: 'Стабильность',
      icon: Star,
      description: 'Стабильность работы'
    }
  ];

  const getTabData = (tabId) => {
    if (!data || !data[tabId]) return [];
    return data[tabId].slice(0, 10);
  };

  const getRankingIcon = (position) => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return `${position}`;
  };

  const getScoreBadge = (score, type) => {
    switch (type) {
      case 'reliability':
        if (score >= 95) return { color: 'bg-green-100 text-green-800', label: 'Отлично' };
        if (score >= 85) return { color: 'bg-blue-100 text-blue-800', label: 'Хорошо' };
        if (score >= 75) return { color: 'bg-yellow-100 text-yellow-800', label: 'Норма' };
        return { color: 'bg-red-100 text-red-800', label: 'Внимание' };
      
      case 'punctuality':
        if (score <= 2) return { color: 'bg-green-100 text-green-800', label: 'Отлично' };
        if (score <= 5) return { color: 'bg-blue-100 text-blue-800', label: 'Хорошо' };
        if (score <= 10) return { color: 'bg-yellow-100 text-yellow-800', label: 'Норма' };
        return { color: 'bg-red-100 text-red-800', label: 'Проблема' };
      
      case 'overtime':
        if (score >= 20) return { color: 'bg-purple-100 text-purple-800', label: 'Герой' };
        if (score >= 10) return { color: 'bg-blue-100 text-blue-800', label: 'Активный' };
        if (score >= 5) return { color: 'bg-green-100 text-green-800', label: 'Норма' };
        return { color: 'bg-gray-100 text-gray-800', label: 'Базовый' };
      
      case 'consistency':
        if (score >= 95) return { color: 'bg-green-100 text-green-800', label: 'Стабильный' };
        if (score >= 85) return { color: 'bg-blue-100 text-blue-800', label: 'Хороший' };
        if (score >= 75) return { color: 'bg-yellow-100 text-yellow-800', label: 'Средний' };
        return { color: 'bg-red-100 text-red-800', label: 'Нестабильный' };
      
      default:
        return { color: 'bg-gray-100 text-gray-800', label: 'N/A' };
    }
  };

  const formatScore = (score, type) => {
    switch (type) {
      case 'reliability':
      case 'consistency':
        return `${score}%`;
      case 'punctuality':
        return `${score} оп.`;
      case 'overtime':
        return `${score}ч`;
      default:
        return score;
    }
  };

  const activeTabData = getTabData(activeTab);
  const currentTab = tabs.find(tab => tab.id === activeTab);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Award className="h-5 w-5 mr-2" />
          Рейтинги сотрудников
        </CardTitle>
        <CardDescription>
          Детальная аналитика по различным аспектам работы
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Вкладки */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center"
              >
                <IconComponent className="h-4 w-4 mr-2" />
                {tab.label}
              </Button>
            );
          })}
        </div>

        {/* Описание текущей вкладки */}
        {currentTab && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">{currentTab.description}</p>
          </div>
        )}

        {/* Список рейтинга */}
        <div className="space-y-3">
          {activeTabData.length > 0 ? (
            activeTabData.map((item, index) => {
              const badge = getScoreBadge(item.score, activeTab);
              return (
                <div 
                  key={item.user.id} 
                  className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center">
                    {/* Позиция */}
                    <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-lg">
                        {getRankingIcon(index + 1)}
                      </span>
                    </div>
                    
                    {/* Информация о сотруднике */}
                    <div>
                      <p className="font-medium text-gray-900">{item.user.name}</p>
                      <p className="text-sm text-gray-500">@{item.user.username}</p>
                      {item.team && (
                        <p className="text-xs text-gray-400">{item.team}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Метрики */}
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        {formatScore(item.score, activeTab)}
                      </p>
                      {item.change !== undefined && (
                        <p className={`text-xs ${item.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.change >= 0 ? '+' : ''}{item.change}%
                        </p>
                      )}
                    </div>
                    
                    <Badge className={badge.color}>
                      {badge.label}
                    </Badge>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-500">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Нет данных для отображения рейтинга</p>
              <p className="text-sm mt-2">Попробуйте выбрать другой период или метрику</p>
            </div>
          )}
        </div>

        {/* Дополнительная статистика */}
        {activeTabData.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatScore(
                    Math.round(activeTabData.reduce((sum, item) => sum + item.score, 0) / activeTabData.length),
                    activeTab
                  )}
                </p>
                <p className="text-sm text-gray-500">Средний показатель</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {formatScore(Math.max(...activeTabData.map(item => item.score)), activeTab)}
                </p>
                <p className="text-sm text-gray-500">Лучший результат</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {formatScore(Math.min(...activeTabData.map(item => item.score)), activeTab)}
                </p>
                <p className="text-sm text-gray-500">Худший результат</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 