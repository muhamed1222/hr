const { sendTelegramMessage } = require('../utils/sendTelegramMessage');
const { info, error } = require('../utils/logger');

const WEB_APP_URL = process.env.WEB_APP_URL || 'http://localhost:5173';

/**
 * Проверяет можно ли использовать URL в Telegram кнопках
 */
function canUseUrlInTelegram(url) {
  return !url.includes('localhost') && (url.startsWith('https://') || process.env.NODE_ENV === 'development');
}

/**
 * Отправляет уведомление о готовности статистики команды
 * @param {Object} statsData - Данные статистики
 */
async function notifyTeamStats(statsData) {
  const { 
    date, 
    totalEmployees, 
    presentEmployees, 
    absentEmployees, 
    reportsSubmitted,
    averageWorkHours,
    managers 
  } = statsData;

  const dateStr = new Date(date).toLocaleDateString('ru-RU');
  const attendanceRate = Math.round((presentEmployees / totalEmployees) * 100);
  const reportRate = Math.round((reportsSubmitted / presentEmployees) * 100);

  // Формируем краткий обзор
  const summary = `
📊 <b>Ежедневная статистика готова</b>

📅 <b>Дата:</b> ${dateStr}
⏰ <b>Время создания:</b> ${new Date().toLocaleTimeString('ru-RU')}

<b>📈 Основные показатели:</b>
👥 Всего сотрудников: ${totalEmployees}
✅ Присутствовали: ${presentEmployees} (${attendanceRate}%)
❌ Отсутствовали: ${absentEmployees}
📝 Отчёты сданы: ${reportsSubmitted}/${presentEmployees} (${reportRate}%)
⏱️ Ср. раб. время: ${averageWorkHours} ч.

${attendanceRate >= 90 ? '🎉 Отличная посещаемость!' : 
  attendanceRate >= 75 ? '👍 Хорошая посещаемость' : 
  '⚠️ Низкая посещаемость - требует внимания'}

💡 Нажмите ниже для подробного анализа.
${!canUseUrlInTelegram(WEB_APP_URL) ? '\n🔗 Веб-отчёты будут доступны после настройки публичного URL.' : ''}
  `.trim();

  const options = {
    parse_mode: 'HTML'
  };

  if (canUseUrlInTelegram(WEB_APP_URL)) {
    options.reply_markup = {
      inline_keyboard: [
        [
          { 
            text: '📊 Открыть полный отчёт', 
            url: `${WEB_APP_URL}?page=stats&date=${date}` 
          }
        ],
        [
          {
            text: '📅 Статистика за сегодня',
            url: `${WEB_APP_URL}?page=logs&filter=today`
          },
          {
            text: '👥 Управление командой',
            url: `${WEB_APP_URL}?page=team`
          }
        ],
        [
          {
            text: '📈 Экспорт данных',
            url: `${WEB_APP_URL}?page=reports`
          }
        ]
      ]
    };
  }

  // Отправляем всем менеджерам и администраторам
  const recipients = managers || [];
  
  for (const manager of recipients) {
    if (manager.telegramId) {
      try {
        await sendTelegramMessage(manager.telegramId, summary, options);

        info(`📊 Статистика отправлена менеджеру: ${manager.firstName} (${manager.telegramId})`);
      } catch (err) {
        error(`❌ Ошибка отправки статистики менеджеру ${manager.firstName}:`, err);
      }
    }
  }

  // Дополнительно отправляем администраторам детальную информацию
  const adminSummary = `
📊 <b>Детальная статистика команды</b>

📅 <b>Дата:</b> ${dateStr}

<b>🔍 Анализ присутствия:</b>
• Процент посещаемости: ${attendanceRate}%
• Процент сданных отчётов: ${reportRate}%
• Среднее время работы: ${averageWorkHours} часов

<b>🚨 Требует внимания:</b>
${absentEmployees > 0 ? `• ${absentEmployees} сотрудников отсутствовали` : '• Все сотрудники присутствовали'}
${reportRate < 100 ? `• ${presentEmployees - reportsSubmitted} сотрудников не сдали отчёты` : '• Все отчёты сданы вовремя'}

<b>📋 Рекомендации:</b>
${attendanceRate < 75 ? '• Проверить причины частых отсутствий\n' : ''}${reportRate < 80 ? '• Напомнить о важности ежедневных отчётов\n' : ''}${averageWorkHours < 7 ? '• Обратить внимание на продолжительность рабочего дня' : ''}

💼 Система готова к дальнейшему анализу данных.
  `.trim();

  // Здесь можно добавить отправку администраторам
  info(`📊 Ежедневная статистика сформирована: ${dateStr} - ${attendanceRate}% посещаемость`);
}

module.exports = { notifyTeamStats }; 