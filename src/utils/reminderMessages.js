"use strict";

const { info: _info, error: _error, warn: _warn, debug: _debug } = require("./logger");

const { sendTelegramMessage: _sendTelegramMessage } = require("./sendTelegramMessage");

const { LIMITS } = require("../constants");

const REMINDER_THRESHOLDS = {
  LATE_ARRIVAL: 30, // минут после 9:00
  EARLY_LEAVE: 60,  // минут до 18:00
};

/**
 * Отправляет утреннее напоминание о приходе на работу
 */
async function sendMorningReminder(userTelegramId, userName) {
  const message = `
🌅 <b>Доброе утро, ${userName}!</b>

⏰ Уже <b>09:LIMITS.DEFAULT_PAGE_SIZE</b> - рабочий день начался!

🔔 Не забудьте отметить приход:
• 🏢 В офисе 
• 🏠 Удалённо

💡 Просто напишите боту или используйте кнопки меню.
  `.trim();

  return await _sendTelegramMessage(userTelegramId, message);
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

  return await _sendTelegramMessage(userTelegramId, message);
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

  return await _sendTelegramMessage(userTelegramId, message);
}

/**
 * Отправляет вечернее напоминание о сдаче отчёта
 */
async function sendEveningReminder(userTelegramId, userName) {
  const message = `
🌆 <b>День подходит к концу, ${userName}!</b>

⏰ Уже <b>17:LIMITS.DEFAULT_PAGE_SIZE</b> - время подводить итоги!

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

  return await _sendTelegramMessage(userTelegramId, message);
}

/**
 * Отправляет мотивационное сообщение
 */
async function sendMotivationalReminder(
  userTelegramId,
  userName,
  reminderType,
) {
  const messages = {
    morning: `☀️ Отличного дня, ${userName}! Сегодня будет продуктивно! 💪`,
    lunch: `🍽 Хорошего обеда, ${userName}! Заряжайтесь энергией! ⚡`,
    evening: `🏆 Отличная работа сегодня, ${userName}! Заслуженный отдых! 🎉`,
  };

  const message = messages[reminderType] || `👋 Удачного дня, ${userName}!`;
  return await _sendTelegramMessage(userTelegramId, message);
}

/**
 * Отправляет напоминание руководителю о статистике
 */
async function sendManagerDailyStats(managerTelegramId, stats) {
  const completionRate =
    stats.total > 0
      ? Math.round((stats.completed / stats.total) * LIMITS.MAX_PAGE_SIZE)
      : 0;

  const message = `
📊 <b>Ежедневная сводка по команде</b>

📅 Дата: ${stats.date}
👥 Всего сотрудников: ${stats.total}
✅ Завершили день: ${stats.completed}
⏳ Ещё работают: ${stats.pending}
📈 Процент завершения: ${completionRate}%

${
  completionRate >= REMINDER_THRESHOLDS.LATE_ARRIVAL
    ? "🎉 Отличные результаты!"
    : completionRate >= REMINDER_THRESHOLDS.EARLY_LEAVE
      ? "👍 Хорошая работа команды!"
      : "⚠️ Есть над чем поработать"
}

🔗 Подробная статистика доступна в админ-панели.
  `.trim();

  return await _sendTelegramMessage(managerTelegramId, message);
}

/**
 * Отправляет персонализированное напоминание с учётом истории
 */
async function sendPersonalizedReminder(user, reminderType, _workLog = null) {
  const { telegramId, name } = user;

  try {
    switch (reminderType) {
      case "morning":
        return await sendMorningReminder(telegramId, name);

      case "lunch_start":
        return await sendLunchStartReminder(telegramId, name);

      case "lunch_end":
        return await sendLunchEndReminder(telegramId, name);

      case "evening":
        return await sendEveningReminder(telegramId, name);

      default:
        _warn(`⚠️ Неизвестный тип напоминания: ${reminderType}`);
        return null;
    }
  } catch (error) {
    _error(
      `❌ Ошибка отправки напоминания ${reminderType} пользователю ${name}:`,
      error,
    );
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
  sendPersonalizedReminder,
};
