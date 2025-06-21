"use strict";

const { _info, _error, _warn, _debug } = require("../utils/logger");

const _express = require("express");
const router = _express.Router();
const { emitEvent } = require("../events/notifyOnEvent");
const { _notifyNewUser } = require("../notifications/notifyNewUser");
const { _notifyUserPromoted } = require("../notifications/notifyUserPromoted");
const { _notifyMissedWorklog } = require("../notifications/notifyMissedWorklog");
const { _notifyTeamStats } = require("../notifications/notifyTeamStats");

/**
 * Тестирование события создания пользователя
 */
router.post("/user-created", async (req, res) => {
  try {
    const testUserData = {
      telegramId: req.body.telegramId || "123456789",
      firstName: req.body.firstName || "Тестовый",
      lastName: req.body.lastName || "Пользователь",
      role: req.body.role || "employee",
      id: 999,
    };

    emitEvent("user.created", testUserData);

    res.json({
      success: true,
      message: "Событие user.created отправлено",
      data: testUserData,
    });
  } catch (error) {
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Тестирование события пропуска лога
 */
router.post("/missed-log", async (req, res) => {
  try {
    const testMissedData = {
      user: {
        id: 999,
        telegramId: req.body.telegramId || "123456789",
        firstName: req.body.firstName || "Иван",
        lastName: req.body.lastName || "Петров",
      },
      date: req.body.date || new Date().toISOString().split("T")[0],
      missedType: req.body.missedType || "arrival", // arrival, departure, report, full_day
      managerTelegramId: req.body.managerTelegramId || "987654321",
    };

    emitEvent("worklog.missed", testMissedData);

    res.json({
      success: true,
      message: "Событие worklog.missed отправлено",
      data: testMissedData,
    });
  } catch (error) {
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Тестирование события редактирования лога
 */
router.post("/log-edited", async (req, res) => {
  try {
    const testEditData = {
      workLog: {
        id: 999,
        workDate: req.body.date || new Date().toISOString().split("T")[0],
        userId: 999,
      },
      editedBy: {
        id: 1,
        firstName: "Админ",
        lastName: "Системы",
        role: "admin",
      },
      user: {
        id: 999,
        telegramId: req.body.telegramId || "123456789",
        firstName: req.body.firstName || "Сотрудник",
        lastName: req.body.lastName || "Тестовый",
      },
      changes: req.body.changes || {
        arrivedAt: {
          old: "09:00",
          new: "09:30",
        },
        dailyReport: {
          old: "Работал над проектом",
          new: "Работал над проектом А, исправил баги",
        },
      },
    };

    emitEvent("log.edited", testEditData);

    res.json({
      success: true,
      message: "Событие log.edited отправлено",
      data: testEditData,
    });
  } catch (error) {
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Тестирование события готовности статистики
 */
router.post("/team-stats", async (req, res) => {
  try {
    const testStatsData = {
      date: req.body.date || new Date().toISOString().split("T")[0],
      totalEmployees: req.body.totalEmployees || 10,
      presentEmployees: req.body.presentEmployees || 8,
      absentEmployees: req.body.absentEmployees || 2,
      reportsSubmitted: req.body.reportsSubmitted || 7,
      averageWorkHours: req.body.averageWorkHours || 8.2,
      managers: [
        {
          id: 1,
          firstName: "Менеджер",
          lastName: "Тестовый",
          telegramId: req.body.managerTelegramId || "987654321",
        },
      ],
    };

    emitEvent("team.stats.ready", testStatsData);

    res.json({
      success: true,
      message: "Событие team.stats.ready отправлено",
      data: testStatsData,
    });
  } catch (error) {
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Тестирование события повышения пользователя
 */
router.post("/user-promoted", async (req, res) => {
  try {
    const testPromotionData = {
      telegramId: req.body.telegramId || "123456789",
      firstName: req.body.firstName || "Сотрудник",
      lastName: req.body.lastName || "Повышенный",
      oldRole: req.body.oldRole || "employee",
      newRole: req.body.newRole || "manager",
      promotedBy: {
        firstName: "Админ",
        lastName: "Главный",
      },
    };

    emitEvent("user.promoted", testPromotionData);

    res.json({
      success: true,
      message: "Событие user.promoted отправлено",
      data: testPromotionData,
    });
  } catch (error) {
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Тестирование всех событий сразу
 */
router.post("/all-events", async (req, res) => {
  try {
    const telegramId = req.body.telegramId || "123456789";
    const managerTelegramId = req.body.managerTelegramId || "987654321";

    // Событие создания пользователя
    emitEvent("user.created", {
      telegramId,
      firstName: "Новый",
      lastName: "Сотрудник",
      role: "employee",
    });

    // Ждем 2 секунды
    setTimeout(() => {
      // Событие пропуска лога
      emitEvent("worklog.missed", {
        user: { telegramId, firstName: "Новый", lastName: "Сотрудник" },
        date: new Date().toISOString().split("T")[0],
        missedType: "report",
        managerTelegramId,
      });
    }, 2000);

    // Ждем 4 секунды
    setTimeout(() => {
      // Событие повышения
      emitEvent("user.promoted", {
        telegramId,
        firstName: "Новый",
        lastName: "Сотрудник",
        oldRole: "employee",
        newRole: "manager",
        promotedBy: { firstName: "Админ", lastName: "Системы" },
      });
    }, 4000);

    res.json({
      success: true,
      message: "Все тестовые события запущены с интервалами",
      info: "Проверьте Telegram через 2-6 секунд",
    });
  } catch (error) {
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Получение списка доступных событий
 */
router.get("/list", (req, res) => {
  res.json({
    events: [
      {
        name: "user.created",
        description: "Создание нового пользователя",
        endpoint: "POST /api/test-events/user-created",
        params: ["telegramId", "firstName", "lastName", "role"],
      },
      {
        name: "worklog.missed",
        description: "Пропуск отметки времени",
        endpoint: "POST /api/test-events/missed-log",
        params: [
          "telegramId",
          "firstName",
          "lastName",
          "date",
          "missedType",
          "managerTelegramId",
        ],
      },
      {
        name: "log.edited",
        description: "Редактирование рабочего лога",
        endpoint: "POST /api/test-events/log-edited",
        params: ["telegramId", "firstName", "lastName", "date", "changes"],
      },
      {
        name: "team.stats.ready",
        description: "Готовность статистики команды",
        endpoint: "POST /api/test-events/team-stats",
        params: [
          "date",
          "totalEmployees",
          "presentEmployees",
          "managerTelegramId",
        ],
      },
      {
        name: "user.promoted",
        description: "Повышение пользователя",
        endpoint: "POST /api/test-events/user-promoted",
        params: ["telegramId", "firstName", "lastName", "oldRole", "newRole"],
      },
    ],
    usage: {
      example:
        'curl -X POST http://localhost:3000/api/test-events/user-created -H "Content-Type: application/json" -d \'{"telegramId": "123456789", "firstName": "Тест", "role": "employee"}\'',
    },
  });
});

/**
 * GET /api/test-events/bot-info
 * Получение информации о боте
 */
router.get("/bot-info", async (req, res) => {
  try {
    const axios = require("axios");
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token || token === "placeholder" || token === "test_mode") {
      return res.json({
        success: false,
        message: "Telegram Bot Token не настроен",
        token_status: "not_configured",
      });
    }

    // Получаем информацию о боте
    const response = await axios.get(
      `https://api.telegram.org/bot${token}/getMe`,
    );

    res.json({
      success: true,
      message: "Бот настроен и работает",
      bot_info: response.data.result,
      token_configured: true,
    });
  } catch (error) {
    _error(
      "Ошибка получения информации о боте:",
      error.response?.data || error.message,
    );
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      message: "Ошибка подключения к Telegram API",
      error: error.response?.data || error.message,
    });
  }
});

/**
 * POST /api/test-events/send-test-message
 * Отправка тестового сообщения
 */
router.post("/send-test-message", async (req, res) => {
  try {
    const { telegramId } = req.body;

    if (!telegramId) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "Требуется telegramId",
      });
    }

    const { sendTelegramMessage } = require("../utils/sendTelegramMessage");

    const message = `
🤖 <b>Тестовое сообщение от HR-системы</b>

✅ Ваш бот настроен правильно!
📱 Telegram ID: <code>${telegramId}</code>
⏰ Время: ${new Date().toLocaleString("ru-RU")}

🚀 Теперь вы будете получать:
• Уведомления о событиях
• Напоминания о работе
• Статистику команды
• И многое другое!

<i>Это сообщение отправлено для проверки настройки уведомлений.</i>
    `.trim();

    const result = await sendTelegramMessage(telegramId, message);

    if (result) {
      res.json({
        success: true,
        message: "Тестовое сообщение отправлено успешно",
        telegram_response: result,
      });
    } else {
      res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
        success: false,
        message: "Ошибка отправки сообщения",
      });
    }
  } catch (error) {
    _error("Ошибка отправки тестового сообщения:", error);
    res.status(LIMITS.DEFAULT_PAGE_SIZE0).json({
      success: false,
      message: "Внутренняя ошибка сервера",
      error: error.message,
    });
  }
});

module.exports = router;
