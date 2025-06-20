const sendTelegramMessage = require('../utils/sendTelegramMessage');

/**
 * Уведомление о принятом решении по заявке
 */
async function notifyAbsenceDecision({ absence, user, decision, reason, approver, timestamp }) {
  // // console.log(`📋 Решение по заявке пользователя ${user.name}: ${decision}`);

  try {
    if (!user.telegramId) {
      // // console.log('У пользователя нет Telegram ID, уведомление не отправлено');
      return;
    }

    const typeEmoji = {
      'vacation': '🌴',
      'sick': '🤒',
      'business_trip': '🧳',
      'day_off': '🏠'
    }[absence.type];

    const typeText = {
      'vacation': 'отпуск',
      'sick': 'больничный',
      'business_trip': 'командировку',
      'day_off': 'отгул'
    }[absence.type];

    const formatDate = (date) => {
      return new Date(date).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    };

    const isApproved = decision === 'approved';
    const statusEmoji = isApproved ? '✅' : '❌';
    const statusText = isApproved ? 'ОДОБРЕНА' : 'ОТКЛОНЕНА';

    let message = 
      `${statusEmoji} *Заявка ${statusText}*\n\n` +
      `${typeEmoji} Тип: ${typeText}\n` +
      `📅 Период: ${formatDate(absence.startDate)} - ${formatDate(absence.endDate)}\n` +
      `📊 Дней: ${absence.daysCount}\n` +
      `👤 Рассмотрел: ${approver.name}\n` +
      `⏰ Время решения: ${formatDate(timestamp)}`;

    if (!isApproved && reason) {
      message += `\n\n💬 Причина отклонения:\n_${reason}_`;
    }

    if (isApproved) {
      message += 
        `\n\n🎉 Ваша заявка одобрена!\n` +
        `📝 Дни автоматически добавлены в рабочий календарь`;
    } else {
      message += 
        `\n\n💡 Вы можете подать новую заявку через /absence`;
    }

    const webAppUrl = process.env.WEB_APP_URL || 'https://your-domain.com';
    const keyboard = {
      inline_keyboard: [
        [
          { text: '📋 Мои заявки', url: `${webAppUrl}/absences?user=${user.id}` }
        ]
      ]
    };

    await sendTelegramMessage(user.telegramId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
      disable_web_page_preview: true
    });

    // // console.log(`✅ Уведомление о решении отправлено пользователю ${user.name}`);
  } catch (error) {
    console.error('❌ Ошибка отправки уведомления о решении:', error);
  }
}

module.exports = notifyAbsenceDecision; 