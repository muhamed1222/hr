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
 * Отправляет уведомление о пропущенной отметке времени
 * @param {Object} payload - Данные о пропуске
 */
async function notifyMissedWorklog(payload) {
  const { user, date, missedType, managerTelegramId } = payload;

  // Определяем тип пропуска
  const missedMessages = {
    arrival: "⏰ Не отметили приход на работу",
    departure: "🏃‍♂️ Не отметили уход с работы",
    report: "📝 Не сдали ежедневный отчёт",
    full_day: "🚫 Отсутствовали весь день",
  };

  const dateStr = new Date(date).toLocaleDateString("ru-RU");

  // Уведомление сотруднику
  if (user.telegramId && missedType !== "full_day") {
    const userMessage = `
⚠️ <b>Пропущена отметка времени</b>

📅 <b>Дата:</b> ${dateStr}
🔴 <b>Проблема:</b> ${missedMessages[missedType]}

💡 <b>Что делать:</b>
${missedType === "arrival" ? "• Отметьте приход сейчас или обратитесь к менеджеру" : ""}
${missedType === "departure" ? "• Отметьте уход или уведомите менеджера" : ""}
${missedType === "report" ? "• Заполните отчёт о проделанной работе" : ""}

⏱️ Не забывайте отмечать время для точного учёта рабочих часов.
${!canUseUrlInTelegram(WEB_APP_URL) ? "\n🔗 Веб-интерфейс будет доступен после настройки публичного URL." : ""}
    `.trim();

    const userOptions = {
      parse_mode: "HTML",
    };

    if (canUseUrlInTelegram(WEB_APP_URL)) {
      userOptions.reply_markup = {
        inline_keyboard: [
          [
            {
              text:
                missedType === "report"
                  ? "📝 Написать отчёт"
                  : "⏰ Отметить время",
              url:
                missedType === "report"
                  ? `${WEB_APP_URL}?page=report`
                  : `${WEB_APP_URL}?page=tracking`,
            },
          ],
        ],
      };
    }

    // Сообщение для менеджера
    const _managerMessage = `
🚨 <b>Пропущен рабочий лог</b>

👤 Сотрудник: ${user.firstName} ${user.lastName}
📅 Дата: ${dateStr}
⏰ Тип пропуска: ${missedMessages[missedType]}

🔗 <a href="${WEB_APP_URL}/admin/worklogs">Просмотреть в админке</a>
    `.trim();

    const managerOptions = {
      parse_mode: "HTML",
    };

    if (canUseUrlInTelegram(WEB_APP_URL)) {
      managerOptions.reply_markup = {
        inline_keyboard: [
          [
            {
              text: "👥 Управление командой",
              url: `${WEB_APP_URL}?page=team`,
            },
          ],
          [
            {
              text: "✏️ Редактировать лог",
              url: `${WEB_APP_URL}?page=employee&id=${user.id}`,
            },
          ],
        ],
      };
    }

    try {
      // Отправляем уведомление пользователю
      if (user.telegramId) {
        await _sendTelegramMessage(user.telegramId, userMessage, userOptions);
      }

      // Отправляем уведомление менеджеру
      if (managerTelegramId) {
        await _sendTelegramMessage(managerTelegramId, _managerMessage, managerOptions);
      }

      _info(
        `📱 Уведомления о пропуске отправлены: ${user.firstName} - ${dateStr}`,
      );
    } catch (error) {
      _error("❌ Ошибка отправки уведомлений о пропуске:", error);
    }
  }
}

module.exports = { notifyMissedWorklog };
