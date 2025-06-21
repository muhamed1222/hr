"use strict";

const { _info, _error, _warn, _debug } = require("../utils/logger");

const { _sendTelegramMessage } = require("../utils/sendTelegramMessage");

const WEB_APP_URL = process.env.WEB_APP_URL || "http://localhost:5173";

/**
 * Проверяет можно ли использовать URL в Telegram кнопках
 */
function canUseUrlInTelegram(url) {
  return (
    !url.includes("localhost") &&
    (url.startsWith("https://") || process.env.NODE_ENV === "development")
  );
}

/**
 * Отправляет уведомление о повышении роли пользователя
 * @param {Object} userData - Данные пользователя
 */
async function notifyUserPromoted(userData) {
  const { telegramId, firstName, lastName, oldRole, newRole, promotedBy } =
    userData;

  const roleNames = {
    employee: "Сотрудник",
    manager: "Менеджер",
    admin: "Администратор",
  };

  const roleDescriptions = {
    manager: `
<b>Ваши новые возможности:</b>
• 👥 Управление командой сотрудников
• 📊 Просмотр отчётов и статистики
• ✏️ Редактирование рабочих логов
• 📈 Экспорт данных и аналитика
• 🔔 Получение уведомлений о пропусках`,
    admin: `
<b>Ваши новые возможности:</b>
• 👑 Полное администрирование системы
• 👥 Управление всеми пользователями
• 🔧 Настройка системы и команд
• 📊 Доступ ко всей аналитике
• 🛡️ Безопасность и аудит действий`,
  };

  const message = `
🎉 <b>Поздравляем с повышением!</b>

👋 ${firstName} ${lastName || ""}!

🔥 <b>Ваша роль изменена:</b>
• Было: ${roleNames[oldRole] || oldRole}
• Стало: <b>${roleNames[newRole] || newRole}</b>

👤 <b>Назначил:</b> ${promotedBy.firstName} ${promotedBy.lastName || ""}

${roleDescriptions[newRole] || ""}

🚀 <b>Что делать дальше:</b>
• Изучите новые функции в панели управления
• Познакомьтесь с расширенными возможностями
• При вопросах обращайтесь к администратору

💡 <b>Совет:</b> Все функции доступны через команды бота.
${!canUseUrlInTelegram(WEB_APP_URL) ? "\n🔗 Веб-панель будет доступна после настройки публичного URL." : ""}
  `.trim();

  const options = {
    parse_mode: "HTML",
  };

  if (canUseUrlInTelegram(WEB_APP_URL)) {
    options.reply_markup = {
      inline_keyboard: [
        [
          {
            text: "🚀 Открыть панель управления",
            url:
              newRole === "admin"
                ? `${WEB_APP_URL}?page=admin`
                : `${WEB_APP_URL}?page=manager`,
          },
        ],
        [
          {
            text:
              newRole === "admin" ? "👑 Управление системой" : "👥 Моя команда",
            url:
              newRole === "admin"
                ? `${WEB_APP_URL}?page=settings`
                : `${WEB_APP_URL}?page=team`,
          },
        ],
        [
          {
            text: "📊 Отчёты и аналитика",
            url: `${WEB_APP_URL}?page=analytics`,
          },
          {
            text: "❓ Помощь",
            url: `${WEB_APP_URL}?page=help&role=${newRole}`,
          },
        ],
      ],
    };
  }

  try {
    const result = await _sendTelegramMessage(telegramId, message, options);

    if (result) {
      _info(
        `🎉 Уведомление о повышении отправлено: ${firstName} ${oldRole} → ${newRole}`,
      );
    }

    return result;
  } catch (err) {
    _error("❌ Ошибка отправки уведомления о повышении:", err);
    throw err;
  }
}

module.exports = { notifyUserPromoted };
