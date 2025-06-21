"use strict";

const { _info, _error, _warn, _debug } = require("../utils/logger");

const { _sendTelegramMessage } = require("../utils/sendTelegramMessage");

const WEB_APP_URL = process.env.WEB_APP_URL || "http://localhost:5173";

/**
 * Проверяет можно ли использовать URL в Telegram кнопках
 */
function canUseUrlInTelegram(url) {
  // Telegram не принимает localhost и требует HTTPS для production
  return (
    !url.includes("localhost") &&
    (url.startsWith("https://") || process.env.NODE_ENV === "development")
  );
}

/**
 * Отправляет приветственное уведомление новому пользователю
 * @param {Object} userData - Данные пользователя
 */
async function notifyNewUser(userData) {
  const { telegramId, firstName, lastName, role } = userData;

  const roleText = {
    employee: "сотрудник",
    manager: "менеджер",
    admin: "администратор",
  };

  const message = `
🎉 <b>Добро пожаловать в TimeBot!</b>

👋 Привет, ${firstName} ${lastName || ""}!

🔐 <b>Ваша роль:</b> ${roleText[role] || role}
📱 Теперь вы можете отмечать рабочее время и создавать отчёты прямо из Telegram!

<b>Что можно делать:</b>
${
  role === "manager" || role === "admin"
    ? "• 👥 Управлять командой\n• 📊 Просматривать отчёты\n• ⚙️ Редактировать логи сотрудников\n"
    : ""
}• ⏰ Отмечать приход и уход
• 📝 Писать ежедневные отчёты
• 📈 Просматривать свою статистику

💡 <b>Совет:</b> Используйте команды бота для быстрого доступа к функциям.
${!canUseUrlInTelegram(WEB_APP_URL) ? "\n🔗 Веб-интерфейс будет доступен после настройки публичного URL." : ""}
  `.trim();

  // Отправляем кнопки только если URL валиден для Telegram
  const options = {
    parse_mode: "HTML",
  };

  if (canUseUrlInTelegram(WEB_APP_URL)) {
    options.reply_markup = {
      inline_keyboard: [
        [
          {
            text: "🚀 Открыть TimeBot",
            url: `${WEB_APP_URL}?welcome=true`,
          },
        ],
        [
          {
            text:
              role === "manager" || role === "admin"
                ? "👥 Управление командой"
                : "📊 Моя статистика",
            url:
              role === "manager" || role === "admin"
                ? `${WEB_APP_URL}?page=team`
                : `${WEB_APP_URL}?page=stats`,
          },
        ],
      ],
    };
  }

  try {
    const result = await _sendTelegramMessage(telegramId, message, options);

    if (result) {
      _info(
        `✅ Приветственное сообщение отправлено пользователю ${firstName} (${telegramId})`,
      );
    }

    return result;
  } catch (err) {
    _error("❌ Ошибка отправки приветственного сообщения:", err);
    throw err;
  }
}

module.exports = { notifyNewUser };
