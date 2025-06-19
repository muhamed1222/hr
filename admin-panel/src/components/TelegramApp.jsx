import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useTelegramUI, useTelegramMainButton, useTelegramBackButton, hapticFeedback, showTelegramAlert, showTelegramConfirm } from '../hooks/useTelegramUI';
import { useIsTelegram, getTelegramUser } from '../hooks/useIsTelegram';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import MobileWorkLogForm from './MobileWorkLogForm';

const TelegramApp = () => {
  const [currentView, setCurrentView] = useState('main');
  const [workLogData, setWorkLogData] = useState({
    description: '',
    hours: 8,
    project: ''
  });
  
  const { user } = useAuthStore();
  
  // Инициализация Telegram WebApp
  useTelegramUI();
  
  // Главная кнопка
  const isFormValid = workLogData.description.trim().length > 0;
  
  useTelegramMainButton(
    currentView === 'worklog' ? 'Сдать отчёт' : null,
    () => {
      if (currentView === 'worklog' && isFormValid) {
        hapticFeedback('medium');
        handleSubmitWorkLog();
      }
    },
    currentView === 'worklog' && isFormValid
  );
  
  // Кнопка назад
  useTelegramBackButton(
    currentView !== 'main' ? () => {
      hapticFeedback('light');
      setCurrentView('main');
    } : null
  );

  const handleSubmitWorkLog = async () => {
    try {
      hapticFeedback('heavy');
      
      const response = await fetch('/api/work-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`
        },
        body: JSON.stringify({
          ...workLogData,
          date: new Date().toISOString().split('T')[0]
        })
      });

      if (response.ok) {
        showTelegramAlert('✅ Отчёт успешно отправлен!', () => {
          setCurrentView('main');
          setWorkLogData({ description: '', hours: 8, project: '' });
        });
      } else {
        throw new Error('Ошибка отправки отчёта');
      }
    } catch (error) {
      showTelegramAlert('❌ Ошибка отправки отчёта. Попробуйте ещё раз.');
    }
  };

  const openWorkLog = () => {
    hapticFeedback('light');
    setCurrentView('worklog');
  };

  const openStats = () => {
    hapticFeedback('light');
    setCurrentView('stats');
  };

  const openAbsence = () => {
    hapticFeedback('light');
    showTelegramConfirm('Хотите подать заявку на отсутствие?', (confirmed) => {
      if (confirmed) {
        setCurrentView('absence');
      }
    });
  };

  // Главный экран
  if (currentView === 'main') {
    return (
      <div className="min-h-screen bg-gray-50 telegram-safe-area">
        <div className="p-4">
          {/* Приветствие */}
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold telegram-text mb-2">
              Привет, {user?.name || 'Коллега'}! 👋
            </h1>
            <p className="telegram-hint">
              Что будем делать сегодня?
            </p>
          </div>

          {/* Основные действия */}
          <div className="space-y-3">
            <Card 
              className="p-4 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={openWorkLog}
            >
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xl">📝</span>
                </div>
                <div>
                  <h3 className="font-semibold telegram-text">Сдать отчёт</h3>
                  <p className="text-sm telegram-hint">Рабочий день завершён</p>
                </div>
              </div>
            </Card>

            <Card 
              className="p-4 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={openStats}
            >
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xl">📊</span>
                </div>
                <div>
                  <h3 className="font-semibold telegram-text">Статистика</h3>
                  <p className="text-sm telegram-hint">Мои рабочие часы</p>
                </div>
              </div>
            </Card>

            <Card 
              className="p-4 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={openAbsence}
            >
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xl">🏖️</span>
                </div>
                <div>
                  <h3 className="font-semibold telegram-text">Отсутствие</h3>
                  <p className="text-sm telegram-hint">Отпуск или больничный</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Информация о пользователе */}
          <div className="mt-8 p-4 bg-white rounded-lg">
            <div className="text-center">
              <p className="text-sm telegram-hint mb-1">Ваша роль</p>
              <p className="font-semibold telegram-text">
                {user?.role === 'admin' ? '👑 Администратор' : 
                 user?.role === 'manager' ? '🎯 Менеджер' : '👤 Сотрудник'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Форма отчёта
  if (currentView === 'worklog') {
    return (
      <MobileWorkLogForm 
        onBack={() => setCurrentView('main')}
        onSuccess={() => {
          setCurrentView('main');
          setWorkLogData({ description: '', hours: 8, project: '' });
        }}
      />
    );
  }

  // Статистика
  if (currentView === 'stats') {
    return (
      <div className="min-h-screen bg-gray-50 telegram-safe-area">
        <div className="p-4">
          <h2 className="text-xl font-bold telegram-text mb-6">📊 Моя статистика</h2>
          
          <div className="space-y-4">
            <Card className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">40</p>
                <p className="text-sm telegram-hint">Часов на этой неделе</p>
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">160</p>
                <p className="text-sm telegram-hint">Часов в этом месяце</p>
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">98%</p>
                <p className="text-sm telegram-hint">Успеваемость</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Заявка на отсутствие
  if (currentView === 'absence') {
    return (
      <div className="min-h-screen bg-gray-50 telegram-safe-area">
        <div className="p-4">
          <h2 className="text-xl font-bold telegram-text mb-6">🏖️ Заявка на отсутствие</h2>
          
          <div className="space-y-4">
            <Card className="p-4">
              <p className="telegram-text">
                Функция скоро будет доступна! 
              </p>
              <p className="text-sm telegram-hint mt-2">
                Пока обращайтесь к HR или своему менеджеру
              </p>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default TelegramApp; 