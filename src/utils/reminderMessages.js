const { sendTelegramMessage } = require('./sendTelegramMessage');

/**
 * Отправляет утреннее напоминание о приходе на работу
 */
async function sendMorningReminder(userTelegramId, userName) {
  const message = `
🌅 <b>Доброе утро, ${userName}!</b>

⏰ Уже <b>09:50</b> - рабочий день начался!

🔔 Не забудьте отметить приход:
• 🏢 В офисе 
• 🏠 Удалённо

💡 Просто напишите боту или используйте кнопки меню.
  `.trim();

  return await sendTelegramMessage(userTelegramId, message);
}

/**
 * Отправляет напоминание о начале обеда
 */
async function sendLunchStartReminder(userTelegramId, userName) {
  const message = `
🍱 <b>Время обеда, ${userName}!</b>

⏰ Сейчас <b>14:00</b> - время перерыва!

🥪 Не забудьте отметить начало обеда, чтобы:
• ⏱ Правильно считалось рабочее время
• 📊 Статистика была точной
• 🎯 Соблюдать баланс работы и отдыха

Приятного аппетита! 😋
  `.trim();

  return await sendTelegramMessage(userTelegramId, message);
}

/**
 * Отправляет напоминание об окончании обеда
 */
async function sendLunchEndReminder(userTelegramId, userName) {
  const message = `
🔙 <b>Время возвращаться, ${userName}!</b>

⏰ Прошёл уже <b>час обеда</b>!

🚀 Пора отметить возвращение с обеда:
• ✅ Нажмите "Вернулся с обеда"
• 📈 Время будет корректно засчитано
• 💪 Продуктивная вторая половина дня ждёт!

Удачной работы! 🎯
  `.trim();

  return await sendTelegramMessage(userTelegramId, message);
}

/**
 * Отправляет вечернее напоминание о сдаче отчёта
 */
async function sendEveningReminder(userTelegramId, userName) {
  const message = `
🌆 <b>День подходит к концу, ${userName}!</b>

⏰ Уже <b>17:50</b> - время подводить итоги!

📋 Не забудьте:
• ✅ Отметить уход с работы
• 📝 Сдать отчёт о проделанной работе
• 💭 Указать проблемы (если были)

🎯 <b>Качественный отчёт помогает:</b>
• Планировать следующий день
• Показать ваши достижения
• Улучшить рабочие процессы

Удачного вечера! 🌟
  `.trim();

  return await sendTelegramMessage(userTelegramId, message);
}

/**
 * Отправляет мотивационное сообщение
 */
async function sendMotivationalReminder(userTelegramId, userName, reminderType) {
  const messages = {
    morning: `☀️ Отличного дня, ${userName}! Сегодня будет продуктивно! 💪`,
    lunch: `🍽 Хорошего обеда, ${userName}! Заряжайтесь энергией! ⚡`,
    evening: `🏆 Отличная работа сегодня, ${userName}! Заслуженный отдых! 🎉`
  };

  const message = messages[reminderType] || `👋 Удачного дня, ${userName}!`;
  return await sendTelegramMessage(userTelegramId, message);
}

/**
 * Отправляет напоминание руководителю о статистике
 */
async function sendManagerDailyStats(managerTelegramId, stats) {
  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  
  const message = `
📊 <b>Ежедневная сводка по команде</b>

📅 Дата: ${stats.date}
👥 Всего сотрудников: ${stats.total}
✅ Завершили день: ${stats.completed}
⏳ Ещё работают: ${stats.pending}
📈 Процент завершения: ${completionRate}%

${completionRate >= 90 ? '🎉 Отличные результаты!' : 
  completionRate >= 70 ? '👍 Хорошая работа команды!' : 
  '⚠️ Есть над чем поработать'}

🔗 Подробная статистика доступна в админ-панели.
  `.trim();

  return await sendTelegramMessage(managerTelegramId, message);
}

/**
 * Отправляет персонализированное напоминание с учётом истории
 */
async function sendPersonalizedReminder(user, reminderType, workLog = null) {
  const { telegramId, name } = user;
  
  try {
    switch (reminderType) {
      case 'morning':
        return await sendMorningReminder(telegramId, name);
      
      case 'lunch_start':
        return await sendLunchStartReminder(telegramId, name);
      
      case 'lunch_end':
        return await sendLunchEndReminder(telegramId, name);
      
      case 'evening':
        return await sendEveningReminder(telegramId, name);
      
      default:
        console.warn(`⚠️ Неизвестный тип напоминания: ${reminderType}`);
        return null;
    }
  } catch (error) {
    console.error(`❌ Ошибка отправки напоминания ${reminderType} пользователю ${name}:`, error);
    return null;
  }
}

module.exports = {
  sendMorningReminder,
  sendLunchStartReminder,
  sendLunchEndReminder,
  sendEveningReminder,
  sendMotivationalReminder,
  sendManagerDailyStats,
  sendPersonalizedReminder
}; 