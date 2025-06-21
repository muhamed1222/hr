"use strict";

const { info, error, warn, debug } = require("../utils/logger");

const cron = require("node-cron");
const moment = require("moment");
const { cron: cronLogger } = require("../utils/logger");

const {
  getUsersForMorningReminder,
  getUsersForLunchStartReminder,
  getUsersForLunchEndReminder,
  getUsersForEveningReminder,
  getReminderStats,
} = require("./reminderService");

const {
  sendPersonalizedReminder,
  sendManagerDailyStats,
} = require("../utils/reminderMessages");

const { User } = require("../models");

// Константы
const REMINDER_DELAY_MS = 1000; // 1 секунда между сообщениями
const MORNING_REMINDER_MINUTE = 30;
const EVENING_REMINDER_MINUTE = 30;
const LUNCH_START_HOUR = 14;
const LUNCH_END_HOUR = 15;
const EVENING_HOUR = 17;
const DAILY_STATS_HOUR = 18;
const DAILY_STATS_MINUTE = 30;
const WORK_DAYS = "1-5";

class ReminderScheduler {
  constructor() {
    this.isEnabled = process.env.REMINDERS_ENABLED !== "false";
    this.timezone = process.env.TZ || "Europe/Moscow";

    if (this.isEnabled) {
      this.setupSchedules();
      cronLogger("Планировщик напоминаний запущен");
    } else {
      cronLogger("Планировщик напоминаний отключён");
    }
  }

  setupSchedules() {
    // 09:30 - Утренние напоминания (не отметили приход)
    cron.schedule(
      `${MORNING_REMINDER_MINUTE} 9 * * ${WORK_DAYS}`,
      async () => {
        await this.sendMorningReminders();
      },
      {
        scheduled: true,
        timezone: this.timezone,
      },
    );

    // 14:00 - Напоминания об обеде (пришли, но не начали обед)
    cron.schedule(
      `0 ${LUNCH_START_HOUR} * * ${WORK_DAYS}`,
      async () => {
        await this.sendLunchStartReminders();
      },
      {
        scheduled: true,
        timezone: this.timezone,
      },
    );

    // 15:00 - Напоминания об окончании обеда (начали, но не закончили)
    cron.schedule(
      `0 ${LUNCH_END_HOUR} * * ${WORK_DAYS}`,
      async () => {
        await this.sendLunchEndReminders();
      },
      {
        scheduled: true,
        timezone: this.timezone,
      },
    );

    // 17:30 - Вечерние напоминания (не сдали отчёт)
    cron.schedule(
      `${EVENING_REMINDER_MINUTE} ${EVENING_HOUR} * * ${WORK_DAYS}`,
      async () => {
        await this.sendEveningReminders();
      },
      {
        scheduled: true,
        timezone: this.timezone,
      },
    );

    // 18:30 - Ежедневная статистика для менеджеров
    cron.schedule(
      `${DAILY_STATS_MINUTE} ${DAILY_STATS_HOUR} * * ${WORK_DAYS}`,
      async () => {
        await this.sendDailyStatsToManagers();
      },
      {
        scheduled: true,
        timezone: this.timezone,
      },
    );

    // Для тестирования - каждую минуту (отключено по умолчанию)
    if (
      process.env.NODE_ENV === "development" &&
      process.env.CRON_TEST === "true"
    ) {
      cron.schedule("*/1 * * * *", async () => {
        cronLogger("Тестовый запуск cron", {
          time: moment().format("HH:mm:ss"),
        });
        // await this.sendTestReminders();
      });
    }
  }

  async sendMorningReminders() {
    try {
      cronLogger("Запуск утренних напоминаний");
      const users = await getUsersForMorningReminder();

      if (users.length === 0) {
        cronLogger("Все сотрудники уже отметили приход");
        return;
      }

      let sent = 0;
      for (const user of users) {
        const result = await sendPersonalizedReminder(user, "morning");
        if (result) {
          sent++;
          cronLogger("Утреннее напоминание отправлено", {
            userName: user.name,
          });
        }

        // Эмитируем событие пропуска прихода
        if (global.emitEvent) {
          global.emitEvent("worklog.missed", {
            user: {
              id: user.id,
              telegramId: user.telegramId,
              firstName: user.name,
              lastName: "",
            },
            date: moment().format("YYYY-MM-DD"),
            missedType: "arrival",
            managerTelegramId: null, // Найдется автоматически
          });
        }

        // Небольшая пауза между сообщениями
        await this.sleep(REMINDER_DELAY_MS);
      }

      cronLogger("Утренние напоминания завершены", {
        sent,
        total: users.length,
      });
    } catch (err) {
      error("Ошибка отправки утренних напоминаний", { error: err.message });
    }
  }

  async sendLunchStartReminders() {
    try {
      cronLogger("Запуск напоминаний об обеде");
      const users = await getUsersForLunchStartReminder();

      if (users.length === 0) {
        cronLogger("Все нужные сотрудники уже ушли на обед");
        return;
      }

      let sent = 0;
      for (const user of users) {
        const result = await sendPersonalizedReminder(user, "lunch_start");
        if (result) {
          sent++;
          cronLogger("Напоминание об обеде отправлено", {
            userName: user.name,
          });
        }

        await this.sleep(REMINDER_DELAY_MS);
      }

      cronLogger("Напоминания об обеде завершены", {
        sent,
        total: users.length,
      });
    } catch (err) {
      error("Ошибка отправки напоминаний об обеде", { error: err.message });
    }
  }

  async sendLunchEndReminders() {
    try {
      cronLogger("Запуск напоминаний об окончании обеда");
      const users = await getUsersForLunchEndReminder();

      if (users.length === 0) {
        cronLogger("Все нужные сотрудники уже закончили обед");
        return;
      }

      let sent = 0;
      for (const user of users) {
        const result = await sendPersonalizedReminder(user, "lunch_end");
        if (result) {
          sent++;
          cronLogger("Напоминание об окончании обеда отправлено", {
            userName: user.name,
          });
        }

        await this.sleep(REMINDER_DELAY_MS);
      }

      cronLogger("Напоминания об окончании обеда завершены", {
        sent,
        total: users.length,
      });
    } catch (err) {
      error("Ошибка отправки напоминаний об окончании обеда", { error: err.message });
    }
  }

  async sendEveningReminders() {
    try {
      cronLogger("Запуск вечерних напоминаний");
      const users = await getUsersForEveningReminder();

      if (users.length === 0) {
        cronLogger("Все сотрудники сдали отчёты");
        return;
      }

      let sent = 0;
      for (const user of users) {
        const result = await sendPersonalizedReminder(user, "evening");
        if (result) {
          sent++;
          cronLogger("Вечернее напоминание отправлено", {
            userName: user.name,
          });
        }

        // Эмитируем событие пропуска отчёта
        if (global.emitEvent) {
          global.emitEvent("worklog.missed", {
            user: {
              id: user.id,
              telegramId: user.telegramId,
              firstName: user.name,
              lastName: "",
            },
            date: moment().format("YYYY-MM-DD"),
            missedType: "report",
            managerTelegramId: null, // Найдется автоматически
          });
        }

        await this.sleep(REMINDER_DELAY_MS);
      }

      cronLogger("Вечерние напоминания завершены", {
        sent,
        total: users.length,
      });
    } catch (err) {
      error("Ошибка отправки вечерних напоминаний", { error: err.message });
    }
  }

  async sendDailyStatsToManagers() {
    try {
      cronLogger("Отправка ежедневной статистики менеджерам");

      const stats = await getReminderStats();
      const managers = await User.findAll({
        where: {
          role: "admin",
          telegramId: { [require("sequelize").Op.not]: null },
          status: "active",
        },
      });

      if (managers.length === 0) {
        cronLogger("Нет менеджеров с настроенным Telegram");
        return;
      }

      // Эмитируем событие готовности статистики через новую систему событий
      if (global.emitEvent) {
        const statsData = {
          date: moment().format("YYYY-MM-DD"),
          totalEmployees: stats.totalEmployees || 0,
          presentEmployees: stats.presentToday || 0,
          absentEmployees:
            (stats.totalEmployees || 0) - (stats.presentToday || 0),
          reportsSubmitted: stats.reportsSubmitted || 0,
          averageWorkHours: stats.averageWorkHours || 8,
          managers: managers.map((m) => ({
            id: m.id,
            firstName: m.name,
            lastName: "",
            telegramId: m.telegramId,
          })),
        };

        global.emitEvent("team.stats.ready", statsData);
      }

      // Отправляем через старую систему для совместимости
      let sent = 0;
      for (const manager of managers) {
        const result = await sendManagerDailyStats(manager.telegramId, stats);
        if (result) {
          sent++;
          cronLogger("Статистика отправлена менеджеру", {
            managerName: manager.name,
          });
        }

        await this.sleep(REMINDER_DELAY_MS);
      }

      cronLogger("Статистика отправлена менеджерам", {
        sent,
        total: managers.length,
      });
    } catch (err) {
      error("Ошибка отправки статистики менеджерам", { error: err.message });
    }
  }

  async sendTestReminders() {
    cronLogger("Тестовая отправка напоминаний");

    // Получаем пользователя для тестирования
    const testUser = await User.findOne({
      where: {
        telegramId: { [require("sequelize").Op.not]: null },
        status: "active",
      },
    });

    if (testUser) {
      await sendPersonalizedReminder(testUser, "morning");
      cronLogger("Тестовое напоминание отправлено", {
        userName: testUser.name,
      });
    }
  }

  // Вспомогательная функция для паузы
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Методы для управления планировщиком
  enable() {
    this.isEnabled = true;
    cronLogger("Планировщик напоминаний включён");
  }

  disable() {
    this.isEnabled = false;
    cronLogger("Планировщик напоминаний отключён");
  }

  getStatus() {
    return {
      enabled: this.isEnabled,
      timezone: this.timezone,
      nextRuns: this.getNextRuns(),
    };
  }

  getNextRuns() {
    const now = moment();
    const today = now.clone();

    return {
      morning: today.clone().hour(9).minute(MORNING_REMINDER_MINUTE).second(0),
      lunchStart: today.clone().hour(LUNCH_START_HOUR).minute(0).second(0),
      lunchEnd: today.clone().hour(LUNCH_END_HOUR).minute(0).second(0),
      evening: today
        .clone()
        .hour(EVENING_HOUR)
        .minute(EVENING_REMINDER_MINUTE)
        .second(0),
      stats: today.clone().hour(DAILY_STATS_HOUR).minute(DAILY_STATS_MINUTE).second(0),
    };
  }
}

module.exports = ReminderScheduler;
