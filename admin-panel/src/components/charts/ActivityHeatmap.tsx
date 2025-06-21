import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';

export default function ActivityHeatmap({ data, isLoading }) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Тепловая карта активности</CardTitle>
          <CardDescription>Распределение активности по часам и дням недели</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  
  // Подготавливаем данные для heatmap
  const heatmapData = {};
  days.forEach(day => {
    heatmapData[day] = {};
    hours.forEach(hour => {
      heatmapData[day][hour] = 0;
    });
  });

  // Заполняем данные из API
  if (data && Array.isArray(data)) {
    data.forEach(item => {
      if (item.day && item.hour !== undefined && item.activity !== undefined) {
        heatmapData[item.day][item.hour] = item.activity;
      }
    });
  }

  // Находим максимальное значение для нормализации
  const maxActivity = Math.max(
    ...Object.values(heatmapData).flatMap(dayData => 
      Object.values(dayData)
    )
  );

  const getIntensityColor = (value) => {
    if (maxActivity === 0) return 'bg-gray-100';
    
    const intensity = value / maxActivity;
    if (intensity === 0) return 'bg-gray-100';
    if (intensity <= 0.25) return 'bg-green-200';
    if (intensity <= 0.5) return 'bg-green-300';
    if (intensity <= 0.75) return 'bg-green-400';
    return 'bg-green-500';
  };

  const getTooltipText = (day, hour, value) => {
    return `${day}, ${hour}:00 - ${value} активности`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Тепловая карта активности</CardTitle>
        <CardDescription>
          Распределение активности сотрудников по часам и дням недели
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Заголовки часов */}
            <div className="flex mb-2">
              <div className="w-8"></div> {/* Пустая ячейка для дней */}
              {hours.map(hour => (
                <div 
                  key={hour} 
                  className="w-6 h-6 text-xs flex items-center justify-center text-gray-600"
                  style={{ fontSize: '10px' }}
                >
                  {hour}
                </div>
              ))}
            </div>
            
            {/* Строки для каждого дня */}
            {days.map(day => (
              <div key={day} className="flex mb-1">
                <div className="w-8 h-6 text-xs flex items-center justify-center text-gray-700 font-medium">
                  {day}
                </div>
                {hours.map(hour => {
                  const value = heatmapData[day][hour];
                  return (
                    <div
                      key={`${day}-${hour}`}
                      className={`w-6 h-6 border border-gray-200 cursor-pointer transition-all duration-200 hover:border-gray-400 ${getIntensityColor(value)}`}
                      title={getTooltipText(day, hour, value)}
                    />
                  );
                })}
              </div>
            ))}
            
            {/* Легенда */}
            <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
              <span>Меньше активности</span>
              <div className="flex space-x-1">
                <div className="w-3 h-3 bg-gray-100 border border-gray-200"></div>
                <div className="w-3 h-3 bg-green-200 border border-gray-200"></div>
                <div className="w-3 h-3 bg-green-300 border border-gray-200"></div>
                <div className="w-3 h-3 bg-green-400 border border-gray-200"></div>
                <div className="w-3 h-3 bg-green-500 border border-gray-200"></div>
              </div>
              <span>Больше активности</span>
            </div>
          </div>
        </div>
        
        {!data || data.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Нет данных для отображения тепловой карты
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
} 