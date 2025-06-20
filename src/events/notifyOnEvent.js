'use strict';

const { appEvents } = require('./eventEmitter');
const { info, error } = require('../utils/logger');

// Импортируем все обработчики уведомлений
const { notifyNewUser } = require('../notifications/notifyNewUser');
const { notifyMissedWorklog } = require('../notifications/notifyMissedWorklog');
const { notifyLogEdited } = require('../notifications/notifyLogEdited');
const { notifyTeamStats } = require('../notifications/notifyTeamStats');
const { notifyUserPromoted } = require('../notifications/notifyUserPromoted');
const notifyAbsenceCreated = require('../notifications/notifyAbsenceCreated');
const notifyAbsenceDecision = require('../notifications/notifyAbsenceDecision');

/**
 * Инициализирует все слушатели событий
 */
function initEventListeners() {
  info('Инициализация системы событий');

  // Событие создания нового пользователя
  appEvents.on('user.created', async (userData) => {
    try {
      await notifyNewUser(userData);
    } catch (err) {
      error('Ошибка при обработке user.created', { error: err.message, userData });
    }
  });

  // Событие пропуска рабочего лога
  appEvents.on('worklog.missed', async (payload) => {
    try {
      await notifyMissedWorklog(payload);
    } catch (err) {
      error('Ошибка при обработке worklog.missed', { error: err.message, payload });
    }
  });

  // Событие редактирования лога
  appEvents.on('log.edited', async (payload) => {
    try {
      await notifyLogEdited(payload);
    } catch (err) {
      error('Ошибка при обработке log.edited', { error: err.message, payload });
    }
  });

  // Событие готовности статистики команды
  appEvents.on('team.stats.ready', async (statsData) => {
    try {
      await notifyTeamStats(statsData);
    } catch (err) {
      error('Ошибка при обработке team.stats.ready', { error: err.message, statsData });
    }
  });

  // Событие повышения пользователя
  appEvents.on('user.promoted', async (userData) => {
    try {
      await notifyUserPromoted(userData);
    } catch (err) {
      error('Ошибка при обработке user.promoted', { error: err.message, userData });
    }
  });

  // Событие создания заявки на отсутствие
  appEvents.on('absence.created', async (absenceData) => {
    try {
      await notifyAbsenceCreated(absenceData);
    } catch (err) {
      error('Ошибка при обработке absence.created', { error: err.message, absenceData });
    }
  });

  // Событие принятия решения по заявке
  appEvents.on('absence.decision', async (decisionData) => {
    try {
      await notifyAbsenceDecision(decisionData);
    } catch (err) {
      error('Ошибка при обработке absence.decision', { error: err.message, decisionData });
    }
  });

  // Дополнительные события
  appEvents.on('system.startup', () => {
    info('Система событий запущена и готова к работе');
  });

  info('Все слушатели событий зарегистрированы');
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
  appEvents
}; 