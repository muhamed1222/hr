"use strict";

const { _info, _error, _warn, _debug } = require("../utils/logger");

const { eventEmitter } = require("./eventEmitter");
const { _notifyNewUser } = require("../notifications/notifyNewUser");
const { _notifyMissedWorklog } = require("../notifications/notifyMissedWorklog");
const { _notifyLogEdited } = require("../notifications/notifyLogEdited");
const { _notifyUserPromoted } = require("../notifications/notifyUserPromoted");
const { _notifyTeamStats } = require("../notifications/notifyTeamStats");

// Импортируем все обработчики уведомлений
const { notifyNewUser } = require("../notifications/notifyNewUser");
const { notifyMissedWorklog } = require("../notifications/notifyMissedWorklog");
const { notifyLogEdited } = require("../notifications/notifyLogEdited");
const { notifyTeamStats } = require("../notifications/notifyTeamStats");
const { notifyUserPromoted } = require("../notifications/notifyUserPromoted");

/**
 * Инициализирует все слушатели событий
 */
function initEventListeners() {
  _info("Инициализация системы событий");

  // Событие создания нового пользователя
  eventEmitter.on("user.created", async (userData) => {
    try {
      await notifyNewUser(userData);
    } catch (err) {
      _error("Ошибка при обработке user.created", {
        error: err.message,
        userData,
      });
    }
  });

  // Событие пропуска рабочего лога
  eventEmitter.on("worklog.missed", async (payload) => {
    try {
      await notifyMissedWorklog(payload);
    } catch (err) {
      _error("Ошибка при обработке worklog.missed", {
        error: err.message,
        payload,
      });
    }
  });

  // Событие редактирования лога
  eventEmitter.on("log.edited", async (payload) => {
    try {
      await notifyLogEdited(payload);
    } catch (err) {
      _error("Ошибка при обработке log.edited", { error: err.message, payload });
    }
  });

  // Событие готовности статистики команды
  appEvents.on("team.stats.ready", async (statsData) => {
    try {
      await notifyTeamStats(statsData);
    } catch (err) {
      error("Ошибка при обработке team.stats.ready", {
        error: err.message,
        statsData,
      });
    }
  });

  // Событие повышения пользователя
  appEvents.on("user.promoted", async (userData) => {
    try {
      await notifyUserPromoted(userData);
    } catch (err) {
      error("Ошибка при обработке user.promoted", {
        error: err.message,
        userData,
      });
    }
  });

  // Дополнительные события
  appEvents.on("system.startup", () => {
    info("Система событий запущена и готова к работе");
  });

  info("Все слушатели событий зарегистрированы");
}

/**
 * Эмитирует событие через центральную систему
 */
function emitEvent(eventName, payload) {
  return appEvents.emitWithLog(eventName, payload);
}

module.exports = {
  initEventListeners,
  emitEvent,
  appEvents,
};
