"use strict";

const { info, error, warn, debug } = require("../utils/logger");

const _TelegramBot = require("node-telegram-bot-api");
const { User, WorkLog, Absence } = require("../models");
const _moment = require("moment");
const { emitEvent } = require("../events/eventEmitter");
require("dotenv").config();

moment.locale("ru");

// Константы для лимитов
const COOLDOWN_LIMITS = {
  DEFAULT: HTTP_STATUS_CODES.OK0,
  MYDAY: HTTP_STATUS_CODES.OK0,
  EDITREPORT: HTTP_STATUS_CODES.OK0,
  HISTORY: HTTP_STATUS_CODES.OK0,
};

class TimeBot {
  constructor() {
    this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
      polling: true,
    });
    this.userStates = new Map(); // Хранение состояний пользователей
    this.actionCooldowns = new Map(); // Защита от повторных нажатий
    this.setupCommands();
    this.setupCallbacks();
    this.setupTextMessages();
  }

  setupCommands() {
    // Основные команды
    this.bot.onText(/\/start/, this.handleStart.bind(this));
    this.bot.onText(/\/myday/, this.handleMyDay.bind(this));
    this.bot.onText(/\/myweek/, this.handleMyWeek.bind(this));
    this.bot.onText(/\/team/, this.handleTeam.bind(this));
    this.bot.onText(/\/help/, this.handleHelp.bind(this));
    this.bot.onText(/\/editreport/, this.handleEditReport.bind(this));
    this.bot.onText(/\/cancel/, this.handleCancel.bind(this));
    this.bot.onText(/\/history/, this.handleHistory.bind(this));
    this.bot.onText(/\/absence/, this.handleAbsence.bind(this));
    this.bot.onText(/\/absences/, this.handleAbsences.bind(this));
  }

  setupCallbacks() {
    this.bot.on("callback_query", this.handleCallback.bind(this));
  }

  setupTextMessages() {
    // Обработка текстовых сообщений (кроме команд)
    this.bot.on("message", (msg) => {
      if (!msg.text || msg.text.startsWith("/")) return;
      this.handleTextMessage(msg);
    });
  }

  async handleStart(msg) {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;
    const name = `${msg.from.first_name} ${msg.from.last_name || ""}`.trim();
    const username = msg.from.username;

    try {
      // Проверяем, существует ли пользователь
      const _user = await User.findOne({ where: { telegramId } });

      if (!user) {
        // Создаём нового пользователя
        user = await User.create({
          telegramId,
          name,
          username,
          role: "employee",
          status: "active",
        });

        await this.bot.sendMessage(
          chatId,
          `👋 Добро пожаловать в Outcast TimeBot, ${name}!\n\n` +
            `Вы успешно зарегистрированы как сотрудник.\n` +
            `Используйте кнопки ниже для отметки времени.`,
        );
      } else {
        await this.bot.sendMessage(
          chatId,
          `🎯 С возвращением, ${name}!\n\n` +
            `Ваш статус: ${this.getRoleText(user.role)}`,
        );
      }

      await this.sendMainMenu(chatId);
    } catch (error) {
      error("Ошибка в handleStart:", error);
      await this.bot.sendMessage(
        chatId,
        "❌ Произошла ошибка при регистрации. Попробуйте позже.",
      );
    }
  }

  async handleMyDay(msg) {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;

    // Защита от повторных нажатий
    if (this.isActionOnCooldown(telegramId, "myday", COOLDOWN_LIMITS.MYDAY)) {
      return;
    }

    try {
      const user = await this.getUser(telegramId);
      if (!user) return await this.sendNotRegistered(chatId);

      const today = moment().format("YYYY-MM-DD");
      const workLog = await WorkLog.findOne({
        where: { userId: user.id, workDate: today },
      });

      const _message = `📊 Ваш день (${moment().format("DD.MM.YYYY")}):\n\n`;

      if (workLog) {
        message += `🟢 Пришёл: ${workLog.arrivedAt || "Не отмечено"}\n`;
        message += `🍱 Обед: ${workLog.lunchStart ? `${workLog.lunchStart} - ${workLog.lunchEnd || "В процессе"}` : "Не было"}\n`;
        message += `🔴 Ушёл: ${workLog.leftAt || "Не отмечено"}\n`;
        message += `💼 Режим: ${this.getWorkModeText(workLog.workMode)}\n`;
        message += `⏱ Всего: ${this.formatMinutes(workLog.totalMinutes)}\n\n`;

        if (workLog.dailyReport) {
          message += `📝 Отчёт: ${workLog.dailyReport}\n`;
        }

        if (workLog.problems) {
          message += `⚠️ Проблемы: ${workLog.problems}`;
        }
      } else {
        message += "❌ Сегодня активности не было";
      }

      await this.bot.sendMessage(chatId, message);
    } catch (error) {
      error("Ошибка в handleMyDay:", error);
      await this.sendUserFriendlyError(chatId, "command_error", {
        command: "myday",
      });
    }
  }

  async handleEditReport(msg) {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;

    // Защита от повторных нажатий
    if (
      this.isActionOnCooldown(
        telegramId,
        "editreport",
        COOLDOWN_LIMITS.EDITREPORT,
      )
    ) {
      return;
    }

    try {
      const user = await this.getUser(telegramId);
      if (!user) return await this.sendNotRegistered(chatId);

      const today = moment().format("YYYY-MM-DD");
      const workLog = await WorkLog.findOne({
        where: { userId: user.id, workDate: today },
      });

      if (!workLog) {
        return await this.bot.sendMessage(
          chatId,
          "❌ Сегодня нет записей рабочего времени",
        );
      }

      if (!workLog.leftAt) {
        return await this.bot.sendMessage(
          chatId,
          '⚠️ Сначала завершите рабочий день кнопкой "Ушёл домой"',
        );
      }

      // Устанавливаем состояние редактирования отчёта
      this.userStates.set(telegramId, {
        state: "editing_report",
        workLogId: workLog.id,
      });

      const currentReport = workLog.dailyReport || "Отчёт отсутствует";
      await this.bot.sendMessage(
        chatId,
        `📝 Текущий отчёт:\n"${currentReport}"\n\n` +
          `Напишите новый отчёт или отправьте /cancel для отмены:`,
      );
    } catch (error) {
      error("Ошибка в handleEditReport:", error);
      await this.sendUserFriendlyError(chatId, "command_error", {
        command: "editreport",
      });
    }
  }

  async handleCancel(msg) {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;

    this.userStates.delete(telegramId);
    await this.bot.sendMessage(chatId, "✅ Операция отменена");
    await this.sendMainMenu(chatId);
  }

  async handleHistory(msg) {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;

    // Защита от повторных нажатий
    if (
      this.isActionOnCooldown(telegramId, "history", COOLDOWN_LIMITS.HISTORY)
    ) {
      return;
    }

    try {
      await this.bot.sendChatAction(chatId, "typing");

      const user = await this.getUser(telegramId);
      if (!user) return await this.sendNotRegistered(chatId);

      // Получаем данные за последние 30 дней
      const endDate = moment();
      const startDate = moment().subtract(29, "days");

      const { Op } = require("sequelize");
      const workLogs = await WorkLog.findAll({
        where: {
          userId: user.id,
          workDate: {
            [Op.between]: [
              startDate.format("YYYY-MM-DD"),
              endDate.format("YYYY-MM-DD"),
            ],
          },
        },
        order: [["workDate", "DESC"]],
        limit: LIMITS.DEFAULT_PAGE_SIZE, // Ограничиваем количество записей для удобства чтения
      });

      const _message = `📚 *История работы (последние 30 дней)*\n\n`;

      if (workLogs.length === 0) {
        message += "❌ За последние 30 дней записей не найдено";
      } else {
        // Общая статистика
        const _totalMinutes = 0;
        const _workDays = 0;
        const _reportsCount = 0;
        const _lateArrivals = 0;

        workLogs.forEach((log) => {
          totalMinutes += log.totalMinutes || 0;
          if (log.workMode !== "sick" && log.workMode !== "vacation") {
            workDays++;
          }
          if (log.dailyReport) reportsCount++;

          if (log.arrivedAt) {
            const arrivalMoment = moment(log.arrivedAt, "HH:mm:ss");
            const expectedTime = moment("09:00:00", "HH:mm:ss");
            if (arrivalMoment.isAfter(expectedTime)) lateArrivals++;
          }
        });

        const avgHours =
          workDays > 0 ? (totalMinutes / workDays / 60).toFixed(1) : 0;

        message += "📊 *Общая статистика:*\n";
        message += `📅 Записей найдено: ${workLogs.length}\n`;
        message += `⏱ Всего отработано: ${this.formatMinutes(totalMinutes)}\n`;
        message += `💼 Рабочих дней: ${workDays}\n`;
        message += `📝 Отчётов сдано: ${reportsCount}/${workLogs.length}\n`;
        message += `⏰ Среднее время в день: ${avgHours}ч\n`;
        if (lateArrivals > 0) {
          message += `⚠️ Опозданий: ${lateArrivals}\n`;
        }
        message += "\n";

        // Последние записи
        message += "📋 *Последние записи:*\n";
        workLogs.slice(0, 10).forEach((log) => {
          const date = moment(log.workDate).format("DD.MM.YYYY ddd");
          const mode = this.getWorkModeText(log.workMode);
          const time = this.formatMinutes(log.totalMinutes || 0);
          const reportIcon = log.dailyReport ? "📝" : "❌";
          const arrivalTime = log.arrivedAt
            ? log.arrivedAt.substring(0, 5)
            : "—";
          const leftTime = log.leftAt ? log.leftAt.substring(0, 5) : "—";

          message += `${date}:\n`;
          message += `   💼 ${mode} (${arrivalTime}→${leftTime}, ${time})\n`;
          message += `   ${reportIcon} ${log.dailyReport ? "Отчёт сдан" : "Нет отчёта"}\n\n`;
        });

        if (workLogs.length > 10) {
          message += `... и ещё ${workLogs.length - 10} записей\n`;
        }
      }

      await this.bot.sendMessage(chatId, message, {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      });
    } catch (error) {
      error("Ошибка в handleHistory:", error);
      await this.sendUserFriendlyError(chatId, "stats_error", {
        statsType: "history",
      });
    }
  }

  async handleHelp(msg) {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;
    const user = await this.getUser(telegramId);
    const webAppUrl = process.env.WEB_APP_URL || "https://your-domain.com";

    let helpMessage =
      `🤖 *TimeBot - Справочник команд*\n\n` +
      `*📱 Основные команды:*\n` +
      `🚀 /start - Начать работу/регистрация\n` +
      `📊 /myday - Просмотр сегодняшнего дня\n` +
      `📅 /myweek - Статистика за 5 рабочих дней\n` +
      `📈 /history - История работы за месяц\n` +
      `📝 /editreport - Редактировать отчёт за сегодня\n` +
      `❌ /cancel - Отменить текущую операцию\n` +
      `❓ /help - Эта справка\n\n`;

    if (user && (user.role === "manager" || user.role === "admin")) {
      helpMessage +=
        `*👥 Команды менеджера:*\n` +
        `🏢 /team - Статус команды в реальном времени\n\n`;
    }

    helpMessage +=
      `*🎯 Кнопки главного меню:*\n` +
      `✅ Пришёл в офис - Отметка прихода на работу\n` +
      `🏠 Работаю удалённо - Отметка удалённой работы\n` +
      `🍱 Начал обед - Начало обеденного перерыва\n` +
      `🔙 Вернулся с обеда - Конец обеденного перерыва\n` +
      `❌ Ушёл домой - Завершение рабочего дня + отчёт\n` +
      `📊 Моя статистика - Быстрый просмотр данных\n` +
      `🤒 Больничный - Отметка больничного дня\n` +
      `🌴 Отпуск - Отметка отпускного дня\n\n` +
      `*🔄 Рабочий процесс:*\n` +
      `1️⃣ Отметьтесь при приходе (офис/удалённо)\n` +
      `2️⃣ Отметьте обед при необходимости\n` +
      `3️⃣ Отметьте уход - система попросит отчёт\n` +
      `4️⃣ Напишите отчёт о проделанной работе\n\n` +
      `*🔗 Веб-интерфейс:*\n` +
      `📈 [Панель управления](${webAppUrl}/dashboard)\n` +
      `📊 [Аналитика и графики](${webAppUrl}/analytics)\n` +
      `📝 [История работы](${webAppUrl}/work-logs)\n\n` +
      `💡 *Подсказки:*\n` +
      `• Отчёт можно редактировать командой /editreport\n` +
      `• Статистика автоматически обновляется\n` +
      `• Больничный/отпуск можно изменить в любое время\n` +
      `• Веб-панель синхронизирована с ботом`;

    await this.bot.sendMessage(chatId, helpMessage, {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    });
  }

  async handleMyWeek(msg) {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;

    // Защита от повторных нажатий
    if (
      this.isActionOnCooldown(telegramId, "myweek", COOLDOWN_LIMITS.DEFAULT)
    ) {
      return;
    }

    try {
      await this.bot.sendChatAction(chatId, "typing");

      const user = await this.getUser(telegramId);
      if (!user) return await this.sendNotRegistered(chatId);

      // Получаем последние 5 рабочих дней (пн-пт)
      const workingDays = this.getLastWorkingDays(5);
      const startDate = workingDays[0];
      const endDate = workingDays[workingDays.length - 1];

      const { Op } = require("sequelize");
      const workLogs = await WorkLog.findAll({
        where: {
          userId: user.id,
          workDate: {
            [Op.between]: [
              startDate.format("YYYY-MM-DD"),
              endDate.format("YYYY-MM-DD"),
            ],
          },
        },
        order: [["workDate", "ASC"]],
      });

      const _message = `📅 *Последние 5 рабочих дней (${startDate.format("DD.MM")} - ${endDate.format("DD.MM.YYYY")})*\n\n`;

      // Статистика
      const _totalMinutes = 0;
      const _actualWorkDays = 0;
      const _remoteDays = 0;
      const _officeDays = 0;
      const _sickDays = 0;
      const _vacationDays = 0;
      const _reportsCount = 0;
      const _lateArrivals = 0;

      // Создаём карту рабочих дней
      const dayMap = new Map();
      workingDays.forEach((date) => {
        dayMap.set(date.format("YYYY-MM-DD"), {
          date: date.format("YYYY-MM-DD"),
          dayName: date.format("ddd DD.MM"),
          workLog: null,
        });
      });

      // Заполняем данными
      workLogs.forEach((log) => {
        if (dayMap.has(log.workDate)) {
          dayMap.get(log.workDate).workLog = log;
        }
      });

      // Формируем отчёт по дням
      message += "📊 *Детализация по рабочим дням:*\n";
      dayMap.forEach((day) => {
        const log = day.workLog;
        if (log) {
          const mode = this.getWorkModeText(log.workMode);
          const time = this.formatMinutes(log.totalMinutes || 0);
          const reportIcon =
            log.dailyReport &&
            log.dailyReport !== "Больничный день" &&
            log.dailyReport !== "Отпуск"
              ? "📝"
              : "❌";
          const arrivalTime = log.arrivedAt
            ? log.arrivedAt.substring(0, 5)
            : "—";
          const leftTime = log.leftAt ? log.leftAt.substring(0, 5) : "—";

          // Иконки для разных режимов
          const modeIcon =
            {
              office: "🏢",
              remote: "🏠",
              sick: "🤒",
              vacation: "🌴",
            }[log.workMode] || "💼";

          message += `${day.dayName}: ${modeIcon} ${mode}\n`;
          if (log.workMode === "office" || log.workMode === "remote") {
            message += `   ⏰ ${arrivalTime} → ${leftTime} (${time})\n`;
            message += `   ${reportIcon} ${log.dailyReport && log.dailyReport !== "Больничный день" ? "Есть отчёт" : "Нет отчёта"}\n`;
          }
          message += "\n";

          // Статистика
          totalMinutes += log.totalMinutes || 0;
          if (log.workMode === "office" || log.workMode === "remote") {
            actualWorkDays++;
            if (log.workMode === "remote") remoteDays++;
            if (log.workMode === "office") officeDays++;
            if (
              log.dailyReport &&
              log.dailyReport !== "Больничный день" &&
              log.dailyReport !== "Отпуск"
            )
              reportsCount++;

            // Проверка опозданий (после 9:00)
            if (log.arrivedAt) {
              const arrivalMoment = moment(log.arrivedAt, "HH:mm:ss");
              const expectedTime = moment("09:00:00", "HH:mm:ss");
              if (arrivalMoment.isAfter(expectedTime)) lateArrivals++;
            }
          } else if (log.workMode === "sick") {
            sickDays++;
          } else if (log.workMode === "vacation") {
            vacationDays++;
          }
        } else {
          message += `${day.dayName}: 🚫 Нет данных\n\n`;
        }
      });

      // Итоговая статистика
      const avgHours =
        actualWorkDays > 0
          ? (totalMinutes / actualWorkDays / 60).toFixed(1)
          : 0;

      message += "📈 *Сводка за рабочие дни:*\n";
      message += `⏱ Всего отработано: ${this.formatMinutes(totalMinutes)}\n`;
      message += `📅 Рабочих дней: ${actualWorkDays}/5\n`;
      if (officeDays > 0) message += `🏢 В офисе: ${officeDays} дней\n`;
      if (remoteDays > 0) message += `🏠 Удалённо: ${remoteDays} дней\n`;
      if (sickDays > 0) message += `🤒 Больничных: ${sickDays} дней\n`;
      if (vacationDays > 0) message += `🌴 Отпускных: ${vacationDays} дней\n`;
      message += `📝 Отчётов сдано: ${reportsCount}/${actualWorkDays}\n`;
      if (actualWorkDays > 0) {
        message += `⏰ Среднее время в день: ${avgHours}ч\n`;
      }
      if (lateArrivals > 0) {
        message += `⚠️ Опозданий: ${lateArrivals}\n`;
      }

      // Добавляем Deep Link для перехода в админку
      const webAppUrl = process.env.WEB_APP_URL || "https://your-domain.com";
      message += `\n🔗 [Подробная аналитика в админке](${webAppUrl}/analytics)`;

      await this.bot.sendMessage(chatId, message, {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      });
    } catch (error) {
      error("Ошибка в handleMyWeek:", error);
      await this.sendUserFriendlyError(chatId, "stats_error", {
        statsType: "weekly",
      });
    }
  }

  async handleTeam(msg) {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;

    try {
      // Защита от повторных запросов
      if (
        this.isActionOnCooldown(
          telegramId,
          "team_command",
          COOLDOWN_LIMITS.DEFAULT,
        )
      ) {
        return await this.sendUserFriendlyError(chatId, "action_cooldown");
      }

      const user = await this.getUser(telegramId);
      if (!user)
        return await this.sendUserFriendlyError(chatId, "user_not_registered");

      // Проверяем роль пользователя
      if (user.role !== "manager" && user.role !== "admin") {
        return await this.sendUserFriendlyError(chatId, "permission_denied");
      }

      // Показываем индикатор загрузки
      await this.bot.sendChatAction(chatId, "typing");

      // Получаем данные команды через API
      const teamData = await this.getTeamData();

      if (!teamData || teamData.length === 0) {
        return await this.bot.sendMessage(
          chatId,
          "❌ Не удалось получить данные команды или команда пуста",
        );
      }

      const _message = this.formatTeamData(teamData);

      // Добавляем deep links для менеджеров
      const webAppUrl = process.env.WEB_APP_URL || "https://your-domain.com";
      message += `\n🔗 *Управление командой:*\n`;
      message += `👥 [Список сотрудников](${webAppUrl}/users)\n`;
      message += `📊 [Аналитика команды](${webAppUrl}/analytics)\n`;
      message += `📈 [Панель управления](${webAppUrl}/dashboard)\n`;
      message += `📝 [Журнал работы](${webAppUrl}/work-logs)`;

      await this.bot.sendMessage(chatId, message, {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      });
    } catch (error) {
      error("Ошибка в handleTeam:", error);
      await this.sendUserFriendlyError(chatId, "database_error");
    }
  }

  async getTeamData() {
    try {
      const today = moment().format("YYYY-MM-DD");

      // Получаем всех активных пользователей
      const allUsers = await User.findAll({
        where: { status: "active" },
        attributes: ["id", "name", "username", "role"],
      });

      // Получаем рабочие логи за сегодня
      const { Op } = require("sequelize");
      const workLogs = await WorkLog.findAll({
        where: {
          workDate: today,
        },
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "username", "role"],
            where: {
              status: "active",
            },
          },
        ],
        order: [[{ model: User, as: "user" }, "name", "ASC"]],
      });

      // Создаём полную сводку
      const teamSummary = allUsers.map((user) => {
        const workLog = workLogs.find((log) => log.userId === user.id);

        return {
          user: {
            id: user.id,
            name: user.name,
            username: user.username,
            role: user.role,
          },
          workLog: workLog || null,
          status: this.getEmployeeStatus(workLog),
        };
      });

      return teamSummary;
    } catch (error) {
      error("Ошибка получения данных команды:", error);
      return null;
    }
  }

  getEmployeeStatus(workLog) {
    if (!workLog) return "not_started";

    if (workLog.workMode === "sick") return "sick";
    if (workLog.workMode === "vacation") return "vacation";
    if (workLog.leftAt) return "finished";
    if (workLog.lunchStart && !workLog.lunchEnd) return "lunch";
    if (workLog.arrivedAt) return "working";

    return "not_started";
  }

  formatTeamData(teamData) {
    const today = moment().format("DD.MM.YYYY");
    const _message = `👥 *Команда на ${today}*\n\n`;

    // Статистика
    const _totalEmployees = 0;
    const _working = 0;
    const _finished = 0;
    const _notStarted = 0;
    const _onLunch = 0;
    const _sick = 0;
    const _onVacation = 0;

    // Группируем по статусам
    const statusGroups = {
      working: [],
      lunch: [],
      finished: [],
      not_started: [],
      sick: [],
      vacation: [],
    };

    teamData.forEach((employee) => {
      if (employee.user.role !== "admin") {
        // Исключаем админов из общей статистики
        totalEmployees++;

        switch (employee.status) {
          case "working":
            working++;
            break;
          case "lunch":
            onLunch++;
            break;
          case "finished":
            finished++;
            break;
          case "not_started":
            notStarted++;
            break;
          case "sick":
            sick++;
            break;
          case "vacation":
            onVacation++;
            break;
        }

        statusGroups[employee.status].push(employee);
      }
    });

    // Общая статистика
    message += "📊 *Общая статистика:*\n";
    message += `👨‍💼 Всего сотрудников: ${totalEmployees}\n`;
    message += `💼 Работают: ${working}\n`;
    message += `🍱 На обеде: ${onLunch}\n`;
    message += `✅ Завершили день: ${finished}\n`;
    message += `🚫 Не начинали: ${notStarted}\n`;
    if (sick > 0) message += `🤒 Больничный: ${sick}\n`;
    if (onVacation > 0) message += `🏖 Отпуск: ${onVacation}\n`;
    message += "\n";

    // Детализация по статусам
    message = this.addStatusSection(
      message,
      "💼 Работают сейчас:",
      statusGroups.working,
    );
    message = this.addStatusSection(
      message,
      "🍱 На обеде:",
      statusGroups.lunch,
    );
    message = this.addStatusSection(
      message,
      "✅ Завершили день:",
      statusGroups.finished,
    );
    message = this.addStatusSection(
      message,
      "🚫 Ещё не начинали:",
      statusGroups.not_started,
    );

    if (statusGroups.sick.length > 0) {
      message = this.addStatusSection(
        message,
        "🤒 Больничный:",
        statusGroups.sick,
      );
    }

    if (statusGroups.vacation.length > 0) {
      message = this.addStatusSection(
        message,
        "🏖 Отпуск:",
        statusGroups.vacation,
      );
    }

    return message;
  }

  addStatusSection(message, title, employees) {
    if (employees.length === 0) return message;

    message += `${title}\n`;
    employees.forEach((emp) => {
      const workLog = emp.workLog;
      const roleIcon = emp.user.role === "manager" ? "👨‍💼" : "👤";
      const workModeIcon =
        workLog?.workMode === "remote"
          ? "🏠"
          : workLog?.workMode === "office"
            ? "🏢"
            : "";

      const _timeInfo = "";
      if (workLog) {
        const arrival = workLog.arrivedAt
          ? workLog.arrivedAt.substring(0, 5)
          : "";
        const departure = workLog.leftAt ? workLog.leftAt.substring(0, 5) : "";
        const totalTime = workLog.totalMinutes
          ? this.formatMinutes(workLog.totalMinutes)
          : "";

        if (emp.status === "finished") {
          timeInfo = ` (${arrival}-${departure}, ${totalTime})`;
        } else if (emp.status === "working" || emp.status === "lunch") {
          timeInfo = ` (с ${arrival})`;
        }
      }

      message += `${roleIcon} ${emp.user.name} ${workModeIcon}${timeInfo}\n`;
    });
    message += "\n";

    return message;
  }

  async handleCallback(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const telegramId = callbackQuery.from.id;
    const data = callbackQuery.data;

    try {
      // Защита от повторных нажатий
      if (this.isActionOnCooldown(telegramId, data)) {
        await this.bot.answerCallbackQuery(callbackQuery.id, {
          text: "⏳ Подождите немного...",
          show_alert: false,
        });
        return;
      }

      const user = await this.getUser(telegramId);
      if (!user) {
        await this.sendUserFriendlyError(chatId, "user_not_registered");
        await this.bot.answerCallbackQuery(callbackQuery.id);
        return;
      }

      // Получаем текущий workLog для валидации
      const today = moment().format("YYYY-MM-DD");
      const workLog = await WorkLog.findOne({
        where: { userId: user.id, workDate: today },
      });

      const _actionType = "";
      const _successMessage = "";

      switch (data) {
        case "arrived_office":
          actionType = "mark_arrival";
          successMessage = "✅ Отмечен приход в офис";
          break;
        case "arrived_remote":
          actionType = "mark_arrival";
          successMessage = "✅ Отмечена удалённая работа";
          break;
        case "lunch_start":
          actionType = "mark_lunch_start";
          successMessage = "🍱 Обед начат";
          break;
        case "lunch_end":
          actionType = "mark_lunch_end";
          successMessage = "🔙 Возвращение с обеда отмечено";
          break;
        case "left_work":
          actionType = "mark_leaving";
          successMessage = "🏠 Рабочий день завершён";
          break;
        case "sick_day":
          // Больничный не требует валидации
          await this.markSickDay(chatId, user);
          await this.bot.answerCallbackQuery(callbackQuery.id, {
            text: "🤒 Больничный отмечен",
          });
          return;
        case "vacation_day":
          // Отпуск не требует валидации
          await this.markVacationDay(chatId, user);
          await this.bot.answerCallbackQuery(callbackQuery.id, {
            text: "🌴 Отпуск отмечен",
          });
          return;
        case "my_stats":
          // Показать статистику с deep links
          await this.showUserStats(chatId, user);
          await this.bot.answerCallbackQuery(callbackQuery.id, {
            text: "📊 Статистика",
          });
          return;
        case "request_absence":
          // Подача заявки на отсутствие
          await this.showAbsenceTypes(chatId, user);
          await this.bot.answerCallbackQuery(callbackQuery.id, {
            text: "📝 Заявка на отсутствие",
          });
          return;
        case "absence_vacation":
          await this.startAbsenceRequest(chatId, user, "vacation");
          await this.bot.answerCallbackQuery(callbackQuery.id, {
            text: "🌴 Заявка на отпуск",
          });
          return;
        case "absence_sick":
          await this.startAbsenceRequest(chatId, user, "sick");
          await this.bot.answerCallbackQuery(callbackQuery.id, {
            text: "🤒 Заявка на больничный",
          });
          return;
        case "absence_business_trip":
          await this.startAbsenceRequest(chatId, user, "business_trip");
          await this.bot.answerCallbackQuery(callbackQuery.id, {
            text: "🧳 Заявка на командировку",
          });
          return;
        case "absence_day_off":
          await this.startAbsenceRequest(chatId, user, "day_off");
          await this.bot.answerCallbackQuery(callbackQuery.id, {
            text: "🏠 Заявка на отгул",
          });
          return;
        case "my_absences":
          await this.showMyAbsences(chatId, user);
          await this.bot.answerCallbackQuery(callbackQuery.id, {
            text: "📋 Мои заявки",
          });
          return;
      }

      // Обработка управления заявками для менеджеров
      if (
        data.startsWith("approve_absence_") ||
        data.startsWith("reject_absence_")
      ) {
        await this.handleAbsenceManagement(callbackQuery, user);
        return;
      }

      // Валидация действия
      if (actionType) {
        const validation = await this.validateUserAction(
          user,
          actionType,
          workLog,
        );
        if (!validation.valid) {
          await this.sendUserFriendlyError(
            chatId,
            validation.errorType,
            validation.context,
          );
          await this.bot.answerCallbackQuery(callbackQuery.id);
          return;
        }
      }

      // Выполняем действие
      switch (data) {
        case "arrived_office":
          await this.markArrival(chatId, user, "office");
          break;
        case "arrived_remote":
          await this.markArrival(chatId, user, "remote");
          break;
        case "lunch_start":
          await this.markLunchStart(chatId, user);
          break;
        case "lunch_end":
          await this.markLunchEnd(chatId, user);
          break;
        case "left_work":
          await this.markLeaving(chatId, user);
          break;
      }

      await this.bot.answerCallbackQuery(callbackQuery.id, {
        text: successMessage,
        show_alert: false,
      });
    } catch (error) {
      error("Ошибка в handleCallback:", error);
      await this.sendUserFriendlyError(chatId, "database_error");
      await this.bot.answerCallbackQuery(callbackQuery.id, {
        text: "❌ Ошибка",
      });
    }
  }

  async sendMainMenu(chatId, customMessage = null) {
    try {
      // Получаем информацию о пользователе для персонализации
      const telegramId = chatId; // В некоторых случаях может отличаться
      const user = await User.findOne({ where: { telegramId } });

      const _statusInfo = "";
      if (user) {
        const today = moment().format("YYYY-MM-DD");
        const workLog = await WorkLog.findOne({
          where: { userId: user.id, workDate: today },
        });

        if (workLog) {
          const status = this.getEmployeeStatus(workLog);
          const statusEmojis = {
            working: "💼 Работаете",
            lunch: "🍱 На обеде",
            finished: "✅ День завершён",
            not_started: "🌅 Готов к работе",
            sick: "🤒 Больничный",
            vacation: "🏖 Отпуск",
          };
          statusInfo = `\n${statusEmojis[status] || "📊 Статус неизвестен"}`;
        } else {
          statusInfo = "\n🌅 Готов к работе";
        }
      }

      const keyboard = {
        inline_keyboard: [
          [
            { text: "✅ Пришёл в офис", callback_data: "arrived_office" },
            { text: "🏠 Работаю удалённо", callback_data: "arrived_remote" },
          ],
          [
            { text: "🍱 Начал обед", callback_data: "lunch_start" },
            { text: "🔙 Вернулся с обеда", callback_data: "lunch_end" },
          ],
          [
            { text: "❌ Ушёл домой", callback_data: "left_work" },
            { text: "📊 Моя статистика", callback_data: "my_stats" },
          ],
          [
            { text: "🤒 Больничный", callback_data: "sick_day" },
            { text: "🌴 Отпуск", callback_data: "vacation_day" },
          ],
          [{ text: "📝 Подать заявку", callback_data: "request_absence" }],
        ],
      };

      const webAppUrl = process.env.WEB_APP_URL || "https://your-domain.com";
      const message =
        customMessage ||
        `🕐 *Управление рабочим временем*${statusInfo}\n\n` +
          `Выберите действие или перейдите в [📊 Админку](${webAppUrl}/dashboard)`;

      await this.bot.sendMessage(chatId, message, {
        reply_markup: keyboard,
        parse_mode: "Markdown",
      });
    } catch (error) {
      error("Ошибка в sendMainMenu:", error);
      // Fallback to simple menu
      const keyboard = {
        inline_keyboard: [
          [
            { text: "✅ Пришёл в офис", callback_data: "arrived_office" },
            { text: "🏠 Работаю удалённо", callback_data: "arrived_remote" },
          ],
          [
            { text: "🍱 Начал обед", callback_data: "lunch_start" },
            { text: "🔙 Вернулся с обеда", callback_data: "lunch_end" },
          ],
          [
            { text: "❌ Ушёл домой", callback_data: "left_work" },
            { text: "📊 Моя статистика", callback_data: "my_stats" },
          ],
          [
            { text: "🤒 Больничный", callback_data: "sick_day" },
            { text: "🌴 Отпуск", callback_data: "vacation_day" },
          ],
          [{ text: "📝 Подать заявку", callback_data: "request_absence" }],
        ],
      };

      await this.bot.sendMessage(chatId, "🕐 Выберите действие:", {
        reply_markup: keyboard,
      });
    }
  }

  async markArrival(chatId, user, mode) {
    const today = moment().format("YYYY-MM-DD");
    const currentTime = moment().format("HH:mm:ss");

    try {
      const [workLog, created] = await WorkLog.findOrCreate({
        where: { userId: user.id, workDate: today },
        defaults: {
          userId: user.id,
          workDate: today,
          arrivedAt: currentTime,
          workMode: mode,
        },
      });

      if (!created) {
        await workLog.update({
          arrivedAt: currentTime,
          workMode: mode,
        });
      }

      const modeText = mode === "office" ? "в офисе" : "удалённо";
      const modeEmoji = mode === "office" ? "🏢" : "🏠";

      await this.bot.sendMessage(
        chatId,
        `${modeEmoji} *Начало рабочего дня*\n\n` +
          `⏰ Время: ${moment().format("HH:mm")}\n` +
          `💼 Режим: ${modeText}\n` +
          `📅 Дата: ${moment().format("DD.MM.YYYY")}\n\n` +
          `Хорошего рабочего дня! 🚀`,
        { parse_mode: "Markdown" },
      );
    } catch (error) {
      error("Ошибка в markArrival:", error);
      await this.sendUserFriendlyError(chatId, "database_error");
    }
  }

  async markLunchStart(chatId, user) {
    const today = moment().format("YYYY-MM-DD");
    const currentTime = moment().format("HH:mm:ss");

    try {
      const workLog = await WorkLog.findOne({
        where: { userId: user.id, workDate: today },
      });

      await workLog.update({ lunchStart: currentTime });

      const workDuration = moment(currentTime, "HH:mm:ss").diff(
        moment(workLog.arrivedAt, "HH:mm:ss"),
        "minutes",
      );

      await this.bot.sendMessage(
        chatId,
        `🍱 *Обеденный перерыв*\n\n` +
          `⏰ Начало: ${moment().format("HH:mm")}\n` +
          `⏱ Работали: ${this.formatMinutes(workDuration)}\n\n` +
          `Приятного аппетита! 😋`,
        { parse_mode: "Markdown" },
      );
    } catch (error) {
      error("Ошибка в markLunchStart:", error);
      await this.sendUserFriendlyError(chatId, "database_error");
    }
  }

  async markLunchEnd(chatId, user) {
    const today = moment().format("YYYY-MM-DD");
    const currentTime = moment().format("HH:mm:ss");

    try {
      const workLog = await WorkLog.findOne({
        where: { userId: user.id, workDate: today },
      });

      await workLog.update({ lunchEnd: currentTime });

      const lunchDuration = moment(currentTime, "HH:mm:ss").diff(
        moment(workLog.lunchStart, "HH:mm:ss"),
        "minutes",
      );

      await this.bot.sendMessage(
        chatId,
        `🔙 *Возвращение с обеда*\n\n` +
          `⏰ Время: ${moment().format("HH:mm")}\n` +
          `🍱 Длительность обеда: ${this.formatMinutes(lunchDuration)}\n\n` +
          `Добро пожаловать обратно! 💪`,
        { parse_mode: "Markdown" },
      );
    } catch (error) {
      error("Ошибка в markLunchEnd:", error);
      await this.sendUserFriendlyError(chatId, "database_error");
    }
  }

  async markLeaving(chatId, user) {
    const today = moment().format("YYYY-MM-DD");
    const currentTime = moment().format("HH:mm:ss");

    try {
      const workLog = await WorkLog.findOne({
        where: { userId: user.id, workDate: today },
      });

      // Подсчёт общего времени работы
      const totalMinutes = this.calculateWorkingMinutes(workLog, currentTime);

      await workLog.update({
        leftAt: currentTime,
        totalMinutes: totalMinutes,
      });

      // Устанавливаем состояние ожидания отчёта
      this.userStates.set(user.telegramId, {
        state: "waiting_report",
        workLogId: workLog.id,
      });

      const workStart = workLog.arrivedAt;
      const workEnd = moment().format("HH:mm");
      const modeText = this.getWorkModeText(workLog.workMode);

      await this.bot.sendMessage(
        chatId,
        `🏠 *Завершение рабочего дня*\n\n` +
          `⏰ Время ухода: ${workEnd}\n` +
          `📅 Рабочий период: ${workStart} - ${workEnd}\n` +
          `💼 Режим работы: ${modeText}\n` +
          `⏱ Отработано сегодня: *${this.formatMinutes(totalMinutes)}*\n\n` +
          `📝 *Теперь напишите отчёт о проделанной работе:*\n` +
          `_Опишите основные задачи и достижения за день_`,
        { parse_mode: "Markdown" },
      );
    } catch (error) {
      error("Ошибка в markLeaving:", error);
      await this.sendUserFriendlyError(chatId, "database_error");
    }
  }

  calculateWorkingMinutes(workLog, leftAt) {
    if (!workLog.arrivedAt) return 0;

    const arrivalTime = moment(workLog.arrivedAt, "HH:mm:ss");
    const leaveTime = moment(leftAt, "HH:mm:ss");

    const _totalMinutes = leaveTime.diff(arrivalTime, "minutes");

    // Вычитаем время обеда, если был
    if (workLog.lunchStart && workLog.lunchEnd) {
      const lunchStart = moment(workLog.lunchStart, "HH:mm:ss");
      const lunchEnd = moment(workLog.lunchEnd, "HH:mm:ss");
      const lunchMinutes = lunchEnd.diff(lunchStart, "minutes");
      totalMinutes -= lunchMinutes;
    }

    return Math.max(0, totalMinutes);
  }

  async handleTextMessage(msg) {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;
    const text = msg.text;

    try {
      const user = await this.getUser(telegramId);
      if (!user) return await this.sendNotRegistered(chatId);

      const userState = this.userStates.get(telegramId);

      if (userState && userState.state === "waiting_report") {
        await this.handleDailyReport(chatId, user, text, userState.workLogId);
        this.userStates.delete(telegramId); // Очищаем состояние
      } else if (userState && userState.state === "editing_report") {
        await this.handleEditDailyReport(
          chatId,
          user,
          text,
          userState.workLogId,
        );
        this.userStates.delete(telegramId); // Очищаем состояние
      } else if (userState && userState.state === "absence_request") {
        await this.processAbsenceRequest(chatId, user, text);
      } else if (userState && userState.state === "rejecting_absence") {
        await this.processAbsenceRejection(
          chatId,
          user,
          text,
          userState.absenceId,
        );
        this.userStates.delete(telegramId);
      } else {
        // Если пользователь не в состоянии ожидания отчёта, показываем меню
        await this.sendMainMenu(chatId);
      }
    } catch (error) {
      error("Ошибка в handleTextMessage:", error);
      await this.bot.sendMessage(chatId, "❌ Ошибка обработки сообщения");
    }
  }

  async handleDailyReport(chatId, user, reportText, workLogId) {
    try {
      const workLog = await WorkLog.findByPk(workLogId);

      if (!workLog) {
        return await this.bot.sendMessage(
          chatId,
          "❌ Не удалось найти запись рабочего дня",
        );
      }

      // Проверяем, что отчёт не пустой
      const trimmedReport = reportText.trim();
      if (!trimmedReport) {
        await workLog.update({ dailyReport: "Отчёт не предоставлен" });
        await this.bot.sendMessage(
          chatId,
          "⚠️ Пустой отчёт зафиксирован как пропуск. Хорошего вечера!",
        );
      } else {
        await workLog.update({ dailyReport: trimmedReport });
        await this.bot.sendMessage(
          chatId,
          "✅ Отчёт сохранён! Спасибо за работу, хорошего вечера!",
        );
      }

      // Показываем краткую сводку дня
      await this.sendDaySummary(chatId, workLog);
    } catch (error) {
      error("Ошибка в handleDailyReport:", error);
      await this.bot.sendMessage(chatId, "❌ Ошибка сохранения отчёта");
    }
  }

  async sendDaySummary(chatId, workLog) {
    const summary =
      `📊 Итоги дня:\n\n` +
      `🟢 Пришёл: ${workLog.arrivedAt}\n` +
      `🔴 Ушёл: ${workLog.leftAt}\n` +
      `⏱ Отработано: ${this.formatMinutes(workLog.totalMinutes)}\n` +
      `💼 Режим: ${this.getWorkModeText(workLog.workMode)}\n` +
      `📝 Отчёт: ${workLog.dailyReport ? "Сдан ✅" : "Не сдан ❌"}`;

    await this.bot.sendMessage(chatId, summary);
  }

  async handleEditDailyReport(chatId, user, reportText, workLogId) {
    try {
      const workLog = await WorkLog.findByPk(workLogId);

      if (!workLog) {
        return await this.bot.sendMessage(
          chatId,
          "❌ Не удалось найти запись рабочего дня",
        );
      }

      const trimmedReport = reportText.trim();
      const oldReport = workLog.dailyReport;

      await workLog.update({
        dailyReport: trimmedReport || "Отчёт не предоставлен",
      });

      await this.bot.sendMessage(
        chatId,
        `✅ Отчёт обновлён!\n\n` +
          `📝 Старый: "${oldReport}"\n` +
          `🆕 Новый: "${workLog.dailyReport}"`,
      );
    } catch (error) {
      error("Ошибка в handleEditDailyReport:", error);
      await this.bot.sendMessage(chatId, "❌ Ошибка обновления отчёта");
    }
  }

  async markSickDay(chatId, user) {
    const today = moment().format("YYYY-MM-DD");

    try {
      const [workLog, created] = await WorkLog.findOrCreate({
        where: { userId: user.id, workDate: today },
        defaults: {
          userId: user.id,
          workDate: today,
          workMode: "sick",
          dailyReport: "Больничный день",
          totalMinutes: 0,
        },
      });

      if (!created) {
        await workLog.update({
          workMode: "sick",
          dailyReport: "Больничный день",
          arrivedAt: null,
          leftAt: null,
          lunchStart: null,
          lunchEnd: null,
          totalMinutes: 0,
        });
      }

      await this.bot.sendMessage(
        chatId,
        "🤒 *Больничный день отмечен*\n\n" +
          `📅 Дата: ${moment().format("DD.MM.YYYY")}\n` +
          `💊 Скорейшего выздоровления!\n\n` +
          `💡 _Вы можете изменить статус в любое время через главное меню_`,
        { parse_mode: "Markdown" },
      );
    } catch (error) {
      error("Ошибка в markSickDay:", error);
      await this.sendUserFriendlyError(chatId, "database_error");
    }
  }

  async markVacationDay(chatId, user) {
    const today = moment().format("YYYY-MM-DD");

    try {
      const [workLog, created] = await WorkLog.findOrCreate({
        where: { userId: user.id, workDate: today },
        defaults: {
          userId: user.id,
          workDate: today,
          workMode: "vacation",
          dailyReport: "Отпуск",
          totalMinutes: 0,
        },
      });

      if (!created) {
        await workLog.update({
          workMode: "vacation",
          dailyReport: "Отпуск",
          arrivedAt: null,
          leftAt: null,
          lunchStart: null,
          lunchEnd: null,
          totalMinutes: 0,
        });
      }

      await this.bot.sendMessage(
        chatId,
        "🌴 *Отпускной день отмечен*\n\n" +
          `📅 Дата: ${moment().format("DD.MM.YYYY")}\n` +
          `🏖 Приятного отдыха!\n\n` +
          `💡 _Вы можете изменить статус в любое время через главное меню_`,
        { parse_mode: "Markdown" },
      );
    } catch (error) {
      error("Ошибка в markVacationDay:", error);
      await this.sendUserFriendlyError(chatId, "database_error");
    }
  }

  async showUserStats(chatId, user) {
    try {
      await this.bot.sendChatAction(chatId, "typing");

      const today = moment().format("YYYY-MM-DD");
      const webAppUrl = process.env.WEB_APP_URL || "https://your-domain.com";

      // Получаем данные за сегодня
      const todayWorkLog = await WorkLog.findOne({
        where: { userId: user.id, workDate: today },
      });

      // Получаем данные за текущую неделю
      const startOfWeek = moment().startOf("isoWeek").format("YYYY-MM-DD");
      const endOfWeek = moment().endOf("isoWeek").format("YYYY-MM-DD");

      const { Op } = require("sequelize");
      const weekLogs = await WorkLog.findAll({
        where: {
          userId: user.id,
          workDate: {
            [Op.between]: [startOfWeek, endOfWeek],
          },
        },
      });

      const _weekTotal = 0;
      const _weekDays = 0;
      weekLogs.forEach((log) => {
        if (log.workMode === "office" || log.workMode === "remote") {
          weekTotal += log.totalMinutes || 0;
          weekDays++;
        }
      });

      const _message = `📊 *Ваша статистика*\n\n`;

      // Сегодняшний день
      message += `📅 *Сегодня (${moment().format("DD.MM.YYYY")}):*\n`;
      if (todayWorkLog) {
        const status = this.getEmployeeStatus(todayWorkLog);
        const statusEmojis = {
          working: "💼 Работаете",
          lunch: "🍱 На обеде",
          finished: "✅ День завершён",
          not_started: "🌅 Не начат",
          sick: "🤒 Больничный",
          vacation: "🌴 Отпуск",
        };

        message += `   ${statusEmojis[status] || "📊 Статус неизвестен"}\n`;
        if (todayWorkLog.totalMinutes) {
          message += `   ⏱ Время: ${this.formatMinutes(todayWorkLog.totalMinutes)}\n`;
        }
        if (todayWorkLog.arrivedAt) {
          message += `   🟢 Пришёл: ${todayWorkLog.arrivedAt.substring(0, 5)}\n`;
        }
        if (todayWorkLog.leftAt) {
          message += `   🔴 Ушёл: ${todayWorkLog.leftAt.substring(0, 5)}\n`;
        }
      } else {
        message += `   🚫 Нет данных\n`;
      }

      // Текущая неделя
      message += `\n📈 *Текущая неделя:*\n`;
      message += `   📅 Рабочих дней: ${weekDays}\n`;
      message += `   ⏱ Всего отработано: ${this.formatMinutes(weekTotal)}\n`;
      if (weekDays > 0) {
        const avgDaily = (weekTotal / weekDays / 60).toFixed(1);
        message += `   📊 Среднее в день: ${avgDaily}ч\n`;
      }

      // Deep Links для детальной информации
      message += `\n🔗 *Подробная информация:*\n`;
      message += `📊 [Аналитика и графики](${webAppUrl}/analytics)\n`;
      message += `📋 [Личный профиль](${webAppUrl}/employees/${user.id})\n`;
      message += `📝 [История работы](${webAppUrl}/work-logs)\n`;
      if (user.role === "manager" || user.role === "admin") {
        message += `👥 [Управление командой](${webAppUrl}/users)\n`;
        message += `📈 [Панель управления](${webAppUrl}/dashboard)\n`;
      }

      await this.bot.sendMessage(chatId, message, {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      });
    } catch (error) {
      error("Ошибка в showUserStats:", error);
      await this.sendUserFriendlyError(chatId, "stats_error", {
        statsType: "user",
      });
    }
  }

  async getUser(telegramId) {
    return await User.findOne({ where: { telegramId } });
  }

  async sendNotRegistered(chatId) {
    await this.bot.sendMessage(
      chatId,
      "❌ Вы не зарегистрированы. Используйте команду /start",
    );
  }

  getRoleText(role) {
    const roles = {
      employee: "Сотрудник",
      manager: "Менеджер",
      admin: "Администратор",
    };
    return roles[role] || "Неизвестная роль";
  }

  getWorkModeText(mode) {
    const modes = {
      office: "Офис",
      remote: "Удалённо",
      sick: "Больничный",
      vacation: "Отпуск",
    };
    return modes[mode] || "Неизвестно";
  }

  formatMinutes(minutes) {
    if (!minutes) return "0м";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
      return `${hours}ч ${mins}м`;
    }
    return `${mins}м`;
  }

  // Получить последние рабочие дни (пн-пт)
  getLastWorkingDays(count) {
    const workingDays = [];
    const today = moment();
    const current = today.clone();

    while (workingDays.length < count) {
      // Если сегодня рабочий день или ищем предыдущие дни
      if (current.isoWeekday() <= 5) {
        // Понедельник = 1, Пятница = 5
        workingDays.unshift(current.clone());
      }
      current.subtract(1, "day");
    }

    return workingDays;
  }

  // Защита от повторных нажатий
  isActionOnCooldown(userId, action, cooldownMs = COOLDOWN_LIMITS.DEFAULT) {
    const key = `${userId}_${action}`;
    const now = Date.now();
    const lastAction = this.actionCooldowns.get(key);

    if (lastAction && now - lastAction < cooldownMs) {
      return true;
    }

    this.actionCooldowns.set(key, now);

    // Очищаем старые записи (каждые 10 минут)
    if (Math.random() < 0.01) {
      this.cleanupCooldowns();
    }

    return false;
  }

  cleanupCooldowns() {
    const now = Date.now();
    const maxAge = 10 * TIME_CONSTANTS.MINUTE; // 10 минут

    for (const [key, timestamp] of this.actionCooldowns.entries()) {
      if (now - timestamp > maxAge) {
        this.actionCooldowns.delete(key);
      }
    }
  }

  // Улучшенные сообщения об ошибках
  async sendUserFriendlyError(chatId, errorType, context = {}) {
    const errorMessages = {
      already_arrived: "⏰ Вы уже отметились сегодня! Время прихода: {time}",
      already_left: "🏠 Вы уже завершили рабочий день в {time}",
      need_arrival: "⚠️ Сначала отметьтесь как пришедший на работу",
      already_lunch_started: "🍱 Обед уже начат в {time}",
      already_lunch_ended: "🔙 Возвращение с обеда уже отмечено в {time}",
      need_lunch_start: "⚠️ Сначала отметьте начало обеда",
      no_work_log: "📝 Сегодня нет записей рабочего времени",
      need_finish_day: '⏰ Сначала завершите рабочий день кнопкой "Ушёл домой"',
      action_cooldown: "⏳ Подождите немного перед следующим действием",
      permission_denied: "🔒 У вас нет прав для выполнения этой команды",
      user_not_registered:
        "❌ Сначала нужно зарегистрироваться командой /start",
      database_error: "💾 Проблемы с базой данных. Попробуйте ещё раз",
      network_error:
        "🌐 Проблемы с подключением. Проверьте интернет и попробуйте снова",
      invalid_worklog_state:
        "⚠️ Действие невозможно в текущем состоянии рабочего дня",
      command_error: "❌ Ошибка выполнения команды {command}. Попробуйте позже",
      stats_error:
        "📊 Не удалось получить статистику {statsType}. Проверьте подключение",
    };

    const _message = errorMessages[errorType] || "❌ Произошла неизвестная ошибка";

    // Подставляем контекстные данные
    Object.keys(context).forEach((key) => {
      message = message.replace(`{${key}}`, context[key]);
    });

    await this.bot.sendMessage(chatId, message);
  }

  // Валидация состояния пользователя перед действием
  async validateUserAction(user, action, workLog = null) {
    const validationRules = {
      arrive: {
        condition: !workLog || !workLog.arrivedAt,
        error: "already_arrived",
        context:
          workLog && workLog.arrivedAt ? { time: workLog.arrivedAt } : {},
      },
      lunch_start: {
        condition: workLog && workLog.arrivedAt && !workLog.lunchStart,
        error:
          !workLog || !workLog.arrivedAt
            ? "need_arrival"
            : "already_lunch_started",
        context:
          workLog && workLog.lunchStart ? { time: workLog.lunchStart } : {},
      },
      lunch_end: {
        condition: workLog && workLog.lunchStart && !workLog.lunchEnd,
        error:
          !workLog || !workLog.lunchStart
            ? "need_lunch_start"
            : "already_lunch_ended",
        context: workLog && workLog.lunchEnd ? { time: workLog.lunchEnd } : {},
      },
      leave: {
        condition: workLog && workLog.arrivedAt && !workLog.leftAt,
        error: !workLog || !workLog.arrivedAt ? "need_arrival" : "already_left",
        context: workLog && workLog.leftAt ? { time: workLog.leftAt } : {},
      },
    };

    const rule = validationRules[action];
    if (!rule) return { valid: true };

    if (!rule.condition) {
      return {
        valid: false,
        error: rule.error,
        context: rule.context,
      };
    }

    return { valid: true };
  }

  // ===== СИСТЕМА ЗАЯВОК НА ОТСУТСТВИЕ =====

  async handleAbsence(msg) {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;

    try {
      const user = await this.getUser(telegramId);
      if (!user) return await this.sendNotRegistered(chatId);

      await this.showAbsenceTypes(chatId, user);
    } catch (error) {
      error("Ошибка в handleAbsence:", error);
      await this.sendUserFriendlyError(chatId, "command_error", {
        command: "absence",
      });
    }
  }

  async handleAbsences(msg) {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;

    try {
      const user = await this.getUser(telegramId);
      if (!user) return await this.sendNotRegistered(chatId);

      await this.showMyAbsences(chatId, user);
    } catch (error) {
      error("Ошибка в handleAbsences:", error);
      await this.sendUserFriendlyError(chatId, "command_error", {
        command: "absences",
      });
    }
  }

  async showAbsenceTypes(chatId, user) {
    const keyboard = {
      inline_keyboard: [
        [
          { text: "🌴 Отпуск", callback_data: "absence_vacation" },
          { text: "🤒 Больничный", callback_data: "absence_sick" },
        ],
        [
          { text: "🧳 Командировка", callback_data: "absence_business_trip" },
          { text: "🏠 Отгул", callback_data: "absence_day_off" },
        ],
        [{ text: "📋 Мои заявки", callback_data: "my_absences" }],
      ],
    };

    const message =
      `📝 *Подача заявки на отсутствие*\n\n` + `Выберите тип заявки:`;

    await this.bot.sendMessage(chatId, message, {
      reply_markup: keyboard,
      parse_mode: "Markdown",
    });
  }

  async showMyAbsences(chatId, user) {
    try {
      const absences = await Absence.findAll({
        where: { userId: user.id },
        order: [["createdAt", "DESC"]],
        limit: 10,
        include: [
          {
            model: User,
            as: "approver",
            attributes: ["name"],
            required: false,
          },
        ],
      });

      if (absences.length === 0) {
        return await this.bot.sendMessage(
          chatId,
          "📋 У вас пока нет поданных заявок\n\n" +
            'Используйте кнопку "📝 Подать заявку" в главном меню',
        );
      }

      const _message = `📋 *Ваши заявки на отсутствие*\n\n`;

      absences.forEach((absence, index) => {
        const statusEmoji = {
          pending: "⏳",
          approved: "✅",
          rejected: "❌",
        }[absence.status];

        const typeEmoji = {
          vacation: "🌴",
          sick: "🤒",
          business_trip: "🧳",
          day_off: "🏠",
        }[absence.type];

        const statusText = {
          pending: "На рассмотрении",
          approved: "Одобрена",
          rejected: "Отклонена",
        }[absence.status];

        const typeText = {
          vacation: "Отпуск",
          sick: "Больничный",
          business_trip: "Командировка",
          day_off: "Отгул",
        }[absence.type];

        message += `${index + 1}. ${typeEmoji} ${typeText}\n`;
        message += `   📅 ${moment(absence.startDate).format("DD.MM.YY")} - ${moment(absence.endDate).format("DD.MM.YY")} (${absence.daysCount} дн.)\n`;
        message += `   ${statusEmoji} ${statusText}`;

        if (absence.status === "approved" && absence.approver) {
          message += ` (${absence.approver.name})`;
        }

        if (absence.status === "rejected" && absence.rejectionReason) {
          message += `\n   💬 ${absence.rejectionReason}`;
        }

        message += "\n\n";
      });

      const webAppUrl = process.env.WEB_APP_URL || "https://your-domain.com";
      message += `🔗 [Подробнее в админке](${webAppUrl}/absences)`;

      await this.bot.sendMessage(chatId, message, {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      });
    } catch (error) {
      error("Ошибка в showMyAbsences:", error);
      await this.sendUserFriendlyError(chatId, "database_error");
    }
  }

  async startAbsenceRequest(chatId, user, type) {
    const typeText = {
      vacation: "отпуск",
      sick: "больничный",
      business_trip: "командировку",
      day_off: "отгул",
    }[type];

    const typeEmoji = {
      vacation: "🌴",
      sick: "🤒",
      business_trip: "🧳",
      day_off: "🏠",
    }[type];

    // Устанавливаем состояние для сбора данных
    this.userStates.set(user.telegramId, {
      state: "absence_request",
      type: type,
      step: "start_date",
    });

    await this.bot.sendMessage(
      chatId,
      `${typeEmoji} *Заявка на ${typeText}*\n\n` +
        `📅 Укажите дату начала в формате ДД.ММ.ГГГГ\n` +
        `Например: 25.12.LIMITS.DEFAULT_PAGE_SIZE24\n\n` +
        `Или отправьте /cancel для отмены`,
      { parse_mode: "Markdown" },
    );
  }

  async processAbsenceRequest(chatId, user, text) {
    const state = this.userStates.get(user.telegramId);
    if (!state || state.state !== "absence_request") return;

    try {
      switch (state.step) {
        case "start_date":
          const startDate = this.parseDate(text);
          if (!startDate) {
            return await this.bot.sendMessage(
              chatId,
              "❌ Неверный формат даты. Используйте ДД.ММ.ГГГГ\n" +
                "Например: 25.12.LIMITS.DEFAULT_PAGE_SIZE24",
            );
          }

          state.startDate = startDate;
          state.step = "end_date";
          this.userStates.set(user.telegramId, state);

          await this.bot.sendMessage(
            chatId,
            `✅ Дата начала: ${moment(startDate).format("DD.MM.YYYY")}\n\n` +
              `📅 Теперь укажите дату окончания в формате ДД.ММ.ГГГГ`,
          );
          break;

        case "end_date":
          const endDate = this.parseDate(text);
          if (!endDate) {
            return await this.bot.sendMessage(
              chatId,
              "❌ Неверный формат даты. Используйте ДД.ММ.ГГГГ\n" +
                "Например: 28.12.LIMITS.DEFAULT_PAGE_SIZE24",
            );
          }

          if (moment(endDate).isBefore(moment(state.startDate))) {
            return await this.bot.sendMessage(
              chatId,
              "❌ Дата окончания не может быть раньше даты начала",
            );
          }

          state.endDate = endDate;
          state.step = "reason";
          this.userStates.set(user.telegramId, state);

          const days =
            moment(endDate).diff(moment(state.startDate), "days") + 1;
          await this.bot.sendMessage(
            chatId,
            `✅ Период: ${moment(state.startDate).format("DD.MM.YYYY")} - ${moment(endDate).format("DD.MM.YYYY")} (${days} дн.)\n\n` +
              `💬 Укажите причину или комментарий к заявке\n` +
              `(необязательно, можете отправить "-" чтобы пропустить)`,
          );
          break;

        case "reason":
          const reason = text === "-" ? null : text;
          state.reason = reason;

          // Создаём заявку
          await this.createAbsenceRequest(chatId, user, state);
          this.userStates.delete(user.telegramId);
          break;
      }
    } catch (error) {
      error("Ошибка в processAbsenceRequest:", error);
      this.userStates.delete(user.telegramId);
      await this.sendUserFriendlyError(chatId, "database_error");
    }
  }

  async createAbsenceRequest(chatId, user, requestData) {
    try {
      const absence = await Absence.create({
        userId: user.id,
        type: requestData.type,
        startDate: requestData.startDate,
        endDate: requestData.endDate,
        reason: requestData.reason,
        status: "pending",
      });

      const typeText = {
        vacation: "отпуск",
        sick: "больничный",
        business_trip: "командировку",
        day_off: "отгул",
      }[requestData.type];

      const typeEmoji = {
        vacation: "🌴",
        sick: "🤒",
        business_trip: "🧳",
        day_off: "🏠",
      }[requestData.type];

      await this.bot.sendMessage(
        chatId,
        `✅ *Заявка подана успешно!*\n\n` +
          `${typeEmoji} Тип: ${typeText}\n` +
          `📅 Период: ${moment(absence.startDate).format("DD.MM.YYYY")} - ${moment(absence.endDate).format("DD.MM.YYYY")}\n` +
          `📊 Дней: ${absence.daysCount}\n` +
          `💬 Причина: ${absence.reason || "Не указана"}\n\n` +
          `⏳ Статус: На рассмотрении\n\n` +
          `📱 Вы получите уведомление, когда заявка будет рассмотрена`,
        { parse_mode: "Markdown" },
      );

      // Отправляем событие для уведомления менеджеров
      emitEvent("absence.created", {
        absence: absence,
        user: user,
        timestamp: new Date(),
      });
    } catch (error) {
      error("Ошибка создания заявки:", error);
      await this.sendUserFriendlyError(chatId, "database_error");
    }
  }

  parseDate(dateStr) {
    // Поддерживаем форматы: ДД.ММ.ГГГГ, ДД/ММ/ГГГГ, ДД-ММ-ГГГГ
    const formats = ["DD.MM.YYYY", "DD/MM/YYYY", "DD-MM-YYYY"];
    for (const format of formats) {
      const parsed = moment(dateStr, format, true);
      if (parsed.isValid()) {
        return parsed.format("YYYY-MM-DD");
      }
    }
    return null;
  }

  // ===== СИСТЕМА УПРАВЛЕНИЯ ЗАЯВКАМИ ДЛЯ МЕНЕДЖЕРОВ =====

  async handleAbsenceManagement(callbackQuery, user) {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    try {
      // Проверяем права менеджера
      if (user.role !== "manager" && user.role !== "admin") {
        await this.bot.answerCallbackQuery(callbackQuery.id, {
          text: "❌ Недостаточно прав",
          show_alert: true,
        });
        return;
      }

      const absenceId = data.split("_")[2];
      const action = data.startsWith("approve_") ? "approved" : "rejected";

      // Получаем заявку
      const absence = await Absence.findByPk(absenceId, {
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "telegramId"],
          },
        ],
      });

      if (!absence) {
        await this.bot.answerCallbackQuery(callbackQuery.id, {
          text: "❌ Заявка не найдена",
          show_alert: true,
        });
        return;
      }

      if (absence.status !== "pending") {
        await this.bot.answerCallbackQuery(callbackQuery.id, {
          text: "❌ Заявка уже рассмотрена",
          show_alert: true,
        });
        return;
      }

      if (action === "rejected") {
        // Для отклонения нужна причина - запрашиваем её
        this.userStates.set(user.telegramId, {
          state: "rejecting_absence",
          absenceId: absenceId,
        });

        await this.bot.sendMessage(
          chatId,
          "💬 *Укажите причину отклонения заявки:*\n\n" +
            "Напишите причину или отправьте /cancel для отмены",
          { parse_mode: "Markdown" },
        );

        await this.bot.answerCallbackQuery(callbackQuery.id, {
          text: "💬 Укажите причину отклонения",
        });
        return;
      }

      // Одобряем заявку
      await this.processAbsenceDecision(absenceId, user, "approved", null);

      await this.bot.answerCallbackQuery(callbackQuery.id, {
        text: "✅ Заявка одобрена!",
      });
    } catch (error) {
      error("Ошибка в handleAbsenceManagement:", error);
      await this.bot.answerCallbackQuery(callbackQuery.id, {
        text: "❌ Ошибка обработки",
        show_alert: true,
      });
    }
  }

  async processAbsenceDecision(absenceId, approver, decision, reason = null) {
    try {
      const absence = await Absence.findByPk(absenceId, {
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "telegramId"],
          },
        ],
      });

      if (!absence) {
        throw new Error("Заявка не найдена");
      }

      // Обновляем заявку
      await absence.update({
        status: decision,
        approvedBy: approver.id,
        approvedAt: new Date(),
        rejectionReason: decision === "rejected" ? reason : null,
      });

      // Если одобрена - создаём записи в work_logs
      if (decision === "approved") {
        await this.createWorkLogsForAbsence(absence);
      }

      // Отправляем событие уведомления
      emitEvent("absence.decision", {
        absence: absence,
        user: absence.user,
        decision,
        reason,
        approver,
        timestamp: new Date(),
      });

      const typeText = {
        vacation: "отпуск",
        sick: "больничный",
        business_trip: "командировку",
        day_off: "отгул",
      }[absence.type];

      const statusText = decision === "approved" ? "одобрена" : "отклонена";
      const statusEmoji = decision === "approved" ? "✅" : "❌";

      return `${statusEmoji} Заявка на ${typeText} ${statusText}`;
    } catch (error) {
      error("Ошибка обработки решения:", error);
      throw error;
    }
  }

  async createWorkLogsForAbsence(absence) {
    const startDate = moment(absence.startDate);
    const endDate = moment(absence.endDate);
    const workLogs = [];

    const currentDate = startDate.clone();
    while (currentDate.isSameOrBefore(endDate)) {
      // Пропускаем выходные (суббота = 6, воскресенье = 0)
      if (currentDate.day() !== 0 && currentDate.day() !== 6) {
        workLogs.push({
          userId: absence.userId,
          workDate: currentDate.format("YYYY-MM-DD"),
          workMode: "absent",
          dailyReport: `${this.getAbsenceTypeText(absence.type)} (заявка #${absence.id})`,
          totalMinutes: 0,
          arrivedAt: null,
          leftAt: null,
          lunchStart: null,
          lunchEnd: null,
        });
      }
      currentDate.add(1, "day");
    }

    if (workLogs.length > 0) {
      await WorkLog.bulkCreate(workLogs, {
        updateOnDuplicate: ["workMode", "dailyReport"],
      });
    }
  }

  getAbsenceTypeText(type) {
    const types = {
      vacation: "Отпуск",
      sick: "Больничный",
      business_trip: "Командировка",
      day_off: "Отгул",
    };
    return types[type] || type;
  }

  async processAbsenceRejection(chatId, user, reason, absenceId) {
    try {
      const result = await this.processAbsenceDecision(
        absenceId,
        user,
        "rejected",
        reason,
      );

      await this.bot.sendMessage(chatId, `${result}\n\nПричина: ${reason}`, {
        parse_mode: "Markdown",
      });
    } catch (error) {
      error("Ошибка отклонения заявки:", error);
      await this.bot.sendMessage(chatId, "❌ Ошибка при отклонении заявки");
    }
  }
}

module.exports = TimeBot;
