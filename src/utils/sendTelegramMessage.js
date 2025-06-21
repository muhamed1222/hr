"use strict";

const _axios = require("axios");
const { info, error, debug } = require("./logger");

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const MAX_TELEGRAM_ID = 9999999999; // Максимальный Telegram ID

/**
 * Проверяет валидность Telegram chat ID
 */
function isValidTelegramId(chatId) {
  // Telegram chat ID должен быть числом от 1 до 9999999999
  const id = parseInt(chatId);
  return !isNaN(id) && id > 0 && id <= MAX_TELEGRAM_ID;
}

/**
 * Отправляет сообщение в Telegram
 * @param {string|number} chatId - ID чата или пользователя в Telegram
 * @param {string} message - Текст сообщения
 * @param {Object} options - Дополнительные опции
 * @returns {Object|null} Результат отправки или null при ошибке
 */
async function sendTelegramMessage(chatId, message, options = {}) {
  try {
    // Проверяем наличие токена
    if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN === "placeholder") {
      debug("[Telegram] Token не настроен - уведомления отключены");
      return null;
    }

    // Тестовый режим - логируем но не отправляем
    if (TELEGRAM_BOT_TOKEN === "test_mode") {
      info("[Telegram] ТЕСТ режим", { chatId, messageLength: message.length });
      return { ok: true, test_mode: true };
    }

    // Валидация chat ID
    if (!isValidTelegramId(chatId)) {
      debug("[Telegram] Невалидный chat ID", { chatId });
      return null;
    }

    const payload = {
      chat_id: chatId,
      text: message,
      parse_mode: options.parseMode || "HTML",
      disable_web_page_preview: options.disablePreview || true,
      disable_notification: options.silent || false,
      ...options,
    };

    debug("[Telegram] Отправка сообщения", {
      chatId,
      messageLength: message.length,
    });

    const response = await axios.post(TELEGRAM_API_URL, payload, {
      timeout: LIMITS.MAX_PAGE_SIZE00, // 10 секунд таймаут
    });

    info("[Telegram] Сообщение доставлено", {
      chatId,
      messageId: response.data.result?.message_id,
    });
    return response.data;
  } catch (err) {
    // Обрабатываем разные типы ошибок
    if (err.response?.data?.error_code === HTTP_STATUS_CODES.BAD_REQUEST) {
      const description = err.response.data.description;

      if (description.includes("chat not found")) {
        debug("[Telegram] Пользователь не найден", { chatId });
        return null; // Тихо игнорируем - это нормально для тестов
      }

      if (description.includes("blocked")) {
        info("[Telegram] Пользователь заблокировал бота", { chatId });
        return null;
      }
    }

    // Логируем только серьёзные ошибки
    error("[Telegram] Критическая ошибка отправки", {
      chatId,
      error: err.response?.data || err.message,
      status: err.response?.status,
    });

    return null;
  }
}

/**
 * Отправляет уведомление об изменении рабочего лога
 */
async function notifyWorkLogEdited(
  userTelegramId,
  workDate,
  managerName,
  changes,
) {
  const changesText = Object.keys(changes)
    .map((key) => {
      return `• ${getFieldName(key)}: ${changes[key]}`;
    })
    .join("\n");

  const message = `
📝 <b>Ваш рабочий день отредактирован</b>

🗓 <b>Дата:</b> ${workDate}
👤 <b>Менеджер:</b> ${managerName}

<b>Изменения:</b>
${changesText}

ℹ️ Проверьте обновленную информацию в системе.
  `.trim();

  return await sendTelegramMessage(userTelegramId, message);
}

/**
 * Отправляет уведомление о новом экспорте отчёта
 */
async function notifyReportExported(managerTelegramId, reportType, period) {
  const message = `
📊 <b>Отчёт сгенерирован</b>

📈 <b>Тип:</b> ${reportType}
🗓 <b>Период:</b> ${period}
⏰ <b>Время:</b> ${new Date().toLocaleString("ru-RU")}

✅ Файл готов к скачиванию в админ-панели.
  `.trim();

  return await sendTelegramMessage(managerTelegramId, message);
}

/**
 * Отправляет тестовое сообщение
 */
async function sendTestMessage(chatId) {
  const message = `
🤖 <b>Тест уведомлений TimeBot</b>

✅ Система уведомлений работает корректно!

⏰ Время: ${new Date().toLocaleString("ru-RU")}
🚀 Статус: Активна
  `.trim();

  return await sendTelegramMessage(chatId, message);
}

/**
 * Получает читаемое название поля
 */
function getFieldName(field) {
  const fieldNames = {
    arrivedAt: "Время прихода",
    leftAt: "Время ухода",
    lunchStart: "Начало обеда",
    lunchEnd: "Окончание обеда",
    workMode: "Режим работы",
    dailyReport: "Отчёт о работе",
    problems: "Проблемы",
  };

  return fieldNames[field] || field;
}

module.exports = {
  sendTelegramMessage,
  notifyWorkLogEdited,
  notifyReportExported,
  sendTestMessage,
};
