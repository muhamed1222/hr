"use strict";

const EventEmitter = require("events");
const { debug } = require("../utils/logger");
const { LIMITS } = require("../constants");

/**
 * Централизованный эмиттер событий для всего приложения
 */
class AppEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(LIMITS.MAX_TEAM_MEMBERS); // Увеличиваем лимит слушателей
  }

  /**
   * Логирует все события для отладки
   */
  logEvent(eventName, payload) {
    debug("Событие системы", {
      eventName,
      payload: typeof payload === "object" ? payload : { value: payload },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit с логированием
   */
  emitWithLog(eventName, payload) {
    this.logEvent(eventName, payload);
    return this.emit(eventName, payload);
  }
}

// Создаем единственный экземпляр для всего приложения
const appEvents = new AppEventEmitter();

module.exports = { appEvents };
