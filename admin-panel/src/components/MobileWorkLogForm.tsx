import React, { useState } from 'react';
import { useTelegramMainButton, useTelegramBackButton, hapticFeedback, showTelegramAlert } from '../hooks/useTelegramUI';
import { useAuthStore } from '../store/useAuthStore';

const MobileWorkLogForm = ({ onBack, onSuccess }) => {
  const [formData, setFormData] = useState({
    description: '',
    hours: 8,
    project: '',
    status: 'completed'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { token } = useAuthStore();
  
  const isFormValid = formData.description.trim().length >= 10;
  
  // Главная кнопка для отправки
  useTelegramMainButton(
    'Сдать отчёт',
    async () => {
      if (!isFormValid || isSubmitting) return;
      
      hapticFeedback('medium');
      await handleSubmit();
    },
    isFormValid && !isSubmitting
  );
  
  // Кнопка назад
  useTelegramBackButton(() => {
    hapticFeedback('light');
    onBack();
  });

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/work-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          date: new Date().toISOString().split('T')[0],
          user_id: useAuthStore.getState().user?.id
        })
      });

      if (response.ok) {
        hapticFeedback('heavy');
        showTelegramAlert('✅ Отчёт успешно отправлен!', () => {
          onSuccess();
        });
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Ошибка отправки отчёта');
      }
    } catch (error) {
      console.error('Ошибка отправки отчёта:', error);
      showTelegramAlert(`❌ ${error.message || 'Ошибка отправки отчёта. Попробуйте ещё раз.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDescriptionChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, description: value }));
    
    // Обновляем состояние главной кнопки
    const tg = window.Telegram?.WebApp;
    if (tg?.MainButton) {
      if (value.trim().length >= 10) {
        tg.MainButton.enable();
        tg.MainButton.setParams({
          color: '#007aff',
          text_color: '#ffffff'
        });
      } else {
        tg.MainButton.disable();
        tg.MainButton.setParams({
          color: '#cccccc',
          text_color: '#ffffff'
        });
      }
    }
  };

  const quickActions = [
    { text: 'Работал над задачами проекта', hours: 8 },
    { text: 'Участвовал в совещаниях и планировании', hours: 4 },
    { text: 'Исправлял баги и тестировал функционал', hours: 6 },
    { text: 'Изучал документацию и новые технологии', hours: 2 }
  ];

  const handleQuickAction = (action) => {
    hapticFeedback('light');
    setFormData(prev => ({
      ...prev,
      description: action.text,
      hours: action.hours
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 telegram-safe-area">
      <div className="p-4 space-y-4">
        {/* Заголовок */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold telegram-text">📝 Отчёт о работе</h2>
          <p className="text-sm telegram-hint mt-1">
            {new Date().toLocaleDateString('ru-RU', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        {/* Быстрые действия */}
        <div className="mb-4">
          <p className="text-sm font-medium telegram-text mb-2">⚡ Быстрый выбор:</p>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleQuickAction(action)}
                className="p-3 text-xs text-left bg-white border border-gray-200 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <div className="font-medium telegram-text">{action.hours}ч</div>
                <div className="telegram-hint">{action.text}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Основная форма */}
        <div className="space-y-4">
          {/* Описание работы */}
          <div>
            <label className="block text-sm font-medium telegram-text mb-2">
              Что сделано за день? *
            </label>
            <textarea
              value={formData.description}
              onChange={handleDescriptionChange}
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              placeholder="Опишите выполненные задачи (минимум 10 символов)..."
              disabled={isSubmitting}
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs telegram-hint">
                {formData.description.length}/10 символов минимум
              </p>
              {formData.description.length >= 10 && (
                <span className="text-xs text-green-600">✓ Готово</span>
              )}
            </div>
          </div>

          {/* Часы работы */}
          <div>
            <label className="block text-sm font-medium telegram-text mb-2">
              Часов отработано
            </label>
            <div className="flex space-x-2">
              {[4, 6, 8, 10].map(hours => (
                <button
                  key={hours}
                  onClick={() => {
                    hapticFeedback('light');
                    setFormData(prev => ({ ...prev, hours }));
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg border transition-colors ${
                    formData.hours === hours
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white border-gray-300 telegram-text hover:bg-gray-50'
                  }`}
                  disabled={isSubmitting}
                >
                  {hours}ч
                </button>
              ))}
            </div>
            <input
              type="range"
              min="1"
              max="16"
              value={formData.hours}
              onChange={(e) => setFormData(prev => ({ ...prev, hours: parseInt(e.target.value) }))}
              className="w-full mt-2"
              disabled={isSubmitting}
            />
            <div className="flex justify-between text-xs telegram-hint mt-1">
              <span>1ч</span>
              <span className="font-medium">{formData.hours} часов</span>
              <span>16ч</span>
            </div>
          </div>

          {/* Проект */}
          <div>
            <label className="block text-sm font-medium telegram-text mb-2">
              Проект (опционально)
            </label>
            <input
              type="text"
              value={formData.project}
              onChange={(e) => setFormData(prev => ({ ...prev, project: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Название проекта или задачи"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Статус валидации */}
        {!isFormValid && formData.description.length > 0 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ Опишите подробнее выполненные задачи (минимум 10 символов)
            </p>
          </div>
        )}

        {/* Индикатор отправки */}
        {isSubmitting && (
          <div className="text-center py-4">
            <div className="inline-flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm telegram-text">Отправляем отчёт...</span>
            </div>
          </div>
        )}

        {/* Место для главной кнопки Telegram */}
        <div className="h-16"></div>
      </div>
    </div>
  );
};

export default MobileWorkLogForm; 