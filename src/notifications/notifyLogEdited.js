const { sendTelegramMessage } = require('../utils/sendTelegramMessage');
const { info } = require('../utils/logger');

const WEB_APP_URL = process.env.WEB_APP_URL || 'http://localhost:5173';

/**
 * Проверяет можно ли использовать URL в Telegram кнопках
 */
function canUseUrlInTelegram(url) {
  return !url.includes('localhost') && (url.startsWith('https://') || process.env.NODE_ENV === 'development');
}

/**
 * Отправляет уведомление о редактировании рабочего лога
 * @param {Object} payload - Данные о редактировании
 */
async function notifyLogEdited(payload) {
  const { workLog, editedBy, user, changes } = payload;

  const dateStr = new Date(workLog.workDate).toLocaleDateString('ru-RU');
  
  // Формируем список изменений
  const changesList = Object.keys(changes).map(field => {
    const fieldNames = {
      arrivedAt: 'Время прихода',
      leftAt: 'Время ухода',
      lunchStart: 'Начало обеда',
      lunchEnd: 'Окончание обеда',
      workMode: 'Режим работы',
      dailyReport: 'Отчёт о работе',
      problems: 'Проблемы'
    };
    
    const fieldName = fieldNames[field] || field;
    const oldValue = changes[field].old || 'не указано';
    const newValue = changes[field].new || 'не указано';
    
    return `• <b>${fieldName}:</b>\n  Было: ${oldValue}\n  Стало: ${newValue}`;
  }).join('\n\n');

  // Уведомление сотруднику
  if (user.telegramId) {
    const userMessage = `
✏️ <b>Ваш рабочий день отредактирован</b>

📅 <b>Дата:</b> ${dateStr}
👤 <b>Редактировал:</b> ${editedBy.firstName} ${editedBy.lastName || ''} (${editedBy.role})

<b>Изменения:</b>
${changesList}

ℹ️ Если у вас есть вопросы по изменениям, обратитесь к своему менеджеру.
${!canUseUrlInTelegram(WEB_APP_URL) ? '\n🔗 Веб-интерфейс будет доступен после настройки публичного URL.' : ''}
    `.trim();

    const userOptions = {
      parse_mode: 'HTML'
    };

    if (canUseUrlInTelegram(WEB_APP_URL)) {
      userOptions.reply_markup = {
        inline_keyboard: [
          [
            { 
              text: '📊 Посмотреть мои логи', 
              url: `${WEB_APP_URL}?page=logs` 
            }
          ],
          [
            {
              text: '📅 Этот день',
              url: `${WEB_APP_URL}?page=logs&date=${workLog.workDate}`
            }
          ]
        ]
      };
    }

    await sendTelegramMessage(user.telegramId, userMessage, userOptions);
  }

  // Уведомление другим менеджерам (если редактировал не менеджер сотрудника)
  if (editedBy.role === 'admin') {
    // Найдем менеджера сотрудника для уведомления
    const managerMessage = `
📝 <b>Лог сотрудника отредактирован администратором</b>

👤 <b>Сотрудник:</b> ${user.firstName} ${user.lastName || ''}
📅 <b>Дата:</b> ${dateStr}
👑 <b>Редактировал:</b> ${editedBy.firstName} ${editedBy.lastName || ''} (Администратор)

<b>Изменения:</b>
${changesList}

ℹ️ Администратор внёс корректировки в рабочий лог.
    `.trim();

    // Здесь можно добавить логику поиска менеджера команды
    info(`📝 Лог отредактирован администратором: ${user.firstName} - ${dateStr}`);
  }

  info(`✏️ Уведомление о редактировании отправлено: ${user.firstName} - ${dateStr}`);
}

module.exports = { notifyLogEdited }; 