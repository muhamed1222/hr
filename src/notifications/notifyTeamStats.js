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
    managers,
  } = statsData;

  const dateStr = new Date(date).toLocaleDateString("ru-RU");
  const attendanceRate = Math.round(
    (presentEmployees / totalEmployees) * LIMITS.MAX_PAGE_SIZE,
  );
  const reportRate = Math.round(
    (reportsSubmitted / presentEmployees) * LIMITS.MAX_PAGE_SIZE,
  );

  // Формируем краткий обзор
  const summary = `
📊 <b>Ежедневная статистика готова</b>

📅 <b>Дата:</b> ${dateStr}
⏰ <b>Время создания:</b> ${new Date().toLocaleTimeString("ru-RU")}

<b>📈 Основные показатели:</b>
👥 Всего сотрудников: ${totalEmployees}
✅ Присутствовали: ${presentEmployees} (${attendanceRate}%)
❌ Отсутствовали: ${absentEmployees}
📝 Отчёты сданы: ${reportsSubmitted}/${presentEmployees} (${reportRate}%)
⏱️ Ср. раб. время: ${averageWorkHours} ч.

${
  attendanceRate >= 90
    ? "🎉 Отличная посещаемость!"
    : attendanceRate >= 75
      ? "👍 Хорошая посещаемость"
      : "⚠️ Низкая посещаемость - требует внимания"
}

💡 Нажмите ниже для подробного анализа.
${!canUseUrlInTelegram(WEB_APP_URL) ? "\n🔗 Веб-отчёты будут доступны после настройки публичного URL." : ""}
  `.trim();

  const options = {
    parse_mode: "HTML",
  };

  if (canUseUrlInTelegram(WEB_APP_URL)) {
    options.reply_markup = {
      inline_keyboard: [
        [
          {
            text: "📊 Открыть полный отчёт",
            url: `${WEB_APP_URL}?page=stats&date=${date}`,
          },
        ],
        [
          {
            text: "📅 Статистика за сегодня",
            url: `${WEB_APP_URL}?page=logs&filter=today`,
          },
          {
            text: "👥 Управление командой",
            url: `${WEB_APP_URL}?page=team`,
          },
        ],
        [
          {
            text: "📈 Экспорт данных",
            url: `${WEB_APP_URL}?page=reports`,
          },
        ],
      ],
    };
  }

  // Отправляем всем менеджерам и администраторам
  const recipients = managers || [];

  for (const manager of recipients) {
    if (manager.telegramId) {
      try {
        await _sendTelegramMessage(manager.telegramId, summary, options);

        _info(
          `📊 Статистика отправлена менеджеру: ${manager.firstName} (${manager.telegramId})`,
        );
      } catch (err) {
        _error(
          `❌ Ошибка отправки статистики менеджеру ${manager.firstName}:`,
          err,
        );
      }
    }
  }

  // Сводка для администраторов
  const _adminSummary = `
📊 <b>Ежедневная сводка по команде</b>

📅 Дата: ${date}
👥 Всего сотрудников: ${totalEmployees}
✅ Присутствуют: ${presentEmployees}
❌ Отсутствуют: ${absentEmployees}
📝 Отчёты сданы: ${reportsSubmitted}
⏱ Среднее время работы: ${averageWorkHours}ч

🔗 <a href="${WEB_APP_URL}/admin/analytics">Подробная аналитика</a>
  `.trim();

  // Отправляем уведомления менеджерам
  for (const manager of managers) {
    try {
      await _sendTelegramMessage(manager.telegramId, _adminSummary, {
        parse_mode: "HTML",
        disable_web_page_preview: true,
      });
    } catch (error) {
      _error(`❌ Ошибка отправки сводки менеджеру ${manager.firstName}:`, error);
    }
  }

  // Здесь можно добавить отправку администраторам
  _info(
    `📊 Ежедневная статистика сформирована: ${dateStr} - ${attendanceRate}% посещаемость`,
  );
}

module.exports = { notifyTeamStats }; 