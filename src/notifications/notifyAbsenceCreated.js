const { User, Team, UserTeam } = require('../models');
const sendTelegramMessage = require('../utils/sendTelegramMessage');

/**
 * Уведомление о новой заявке на отсутствие
 */
async function notifyAbsenceCreated({ absence, user, timestamp }) {
  // // console.log(`📝 Новая заявка на отсутствие от ${user.name}`);

  try {
    // Получаем менеджеров команды пользователя
    const managers = await getTeamManagers(user.id);
    
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

    // Уведомляем менеджеров
    for (const manager of managers) {
      if (manager.telegramId) {
        const webAppUrl = process.env.WEB_APP_URL || 'https://your-domain.com';
        
        const message = 
          `📝 *Новая заявка на отсутствие*\n\n` +
          `👤 Сотрудник: ${user.name}\n` +
          `${typeEmoji} Тип: ${typeText}\n` +
          `📅 Период: ${formatDate(absence.startDate)} - ${formatDate(absence.endDate)}\n` +
          `📊 Дней: ${absence.daysCount}\n` +
          `💬 Причина: ${absence.reason || 'Не указана'}\n\n` +
          `⏰ Подана: ${formatDate(timestamp)}\n\n` +
          `🔗 [Рассмотреть заявку](${webAppUrl}/absences?absence=${absence.id})`;

        const keyboard = {
          inline_keyboard: [
            [
              { text: '✅ Одобрить', callback_data: `approve_absence_${absence.id}` },
              { text: '❌ Отклонить', callback_data: `reject_absence_${absence.id}` }
            ],
            [
              { text: '📋 Все заявки', url: `${webAppUrl}/absences` }
            ]
          ]
        };

        await sendTelegramMessage(manager.telegramId, message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
          disable_web_page_preview: true
        });
      }
    }

    // // console.log(`✅ Уведомления о новой заявке отправлены ${managers.length} менеджерам`);
  } catch (error) {
    console.error('❌ Ошибка отправки уведомлений о новой заявке:', error);
  }
}

/**
 * Получение менеджеров команды пользователя
 */
async function getTeamManagers(userId) {
  try {
    const userTeams = await UserTeam.findAll({
      where: { userId },
      include: [{
        model: Team,
        as: 'team',
        include: [{
          model: User,
          as: 'manager',
          attributes: ['id', 'name', 'telegramId'],
          where: { role: 'manager' }
        }]
      }]
    });

    const managers = [];
    userTeams.forEach(userTeam => {
      if (userTeam.team && userTeam.team.manager) {
        managers.push(userTeam.team.manager);
      }
    });

    // Убираем дубликаты
    const uniqueManagers = managers.filter((manager, index, self) => 
      self.findIndex(m => m.id === manager.id) === index
    );

    return uniqueManagers;
  } catch (error) {
    console.error('Ошибка получения менеджеров команды:', error);
    return [];
  }
}

module.exports = notifyAbsenceCreated; 