const TelegramBot = require('node-telegram-bot-api');
const { User, WorkLog } = require('../models');
const moment = require('moment');
require('dotenv').config();

moment.locale('ru');

class TimeBot {
  constructor() {
    this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
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
  }

  setupCallbacks() {
    this.bot.on('callback_query', this.handleCallback.bind(this));
  }

  setupTextMessages() {
    // Обработка текстовых сообщений (кроме команд)
    this.bot.on('message', (msg) => {
      if (!msg.text || msg.text.startsWith('/')) return;
      this.handleTextMessage(msg);
    });
  }

  async handleStart(msg) {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;
    const name = `${msg.from.first_name} ${msg.from.last_name || ''}`.trim();
    const username = msg.from.username;

    try {
      // Проверяем, существует ли пользователь
      let user = await User.findOne({ where: { telegramId } });
      
      if (!user) {
        // Создаём нового пользователя
        user = await User.create({
          telegramId,
          name,
          username,
          role: 'employee',
          status: 'active'
        });
        
        await this.bot.sendMessage(chatId, 
          `👋 Добро пожаловать в Outcast TimeBot, ${name}!\n\n` +
          `Вы успешно зарегистрированы как сотрудник.\n` +
          `Используйте кнопки ниже для отметки времени.`
        );
      } else {
        await this.bot.sendMessage(chatId, 
          `🎯 С возвращением, ${name}!\n\n` +
          `Ваш статус: ${this.getRoleText(user.role)}`
        );
      }

      await this.sendMainMenu(chatId);
    } catch (error) {
      console.error('Ошибка в handleStart:', error);
      await this.bot.sendMessage(chatId, '❌ Произошла ошибка при регистрации. Попробуйте позже.');
    }
  }

  async handleMyDay(msg) {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;

    // Защита от повторных нажатий
    if (this.isActionOnCooldown(telegramId, 'myday', 1000)) {
      return;
    }

    try {
      const user = await this.getUser(telegramId);
      if (!user) return await this.sendNotRegistered(chatId);

      const today = moment().format('YYYY-MM-DD');
      const workLog = await WorkLog.findOne({
        where: { userId: user.id, workDate: today }
      });

      let message = `📊 Ваш день (${moment().format('DD.MM.YYYY')}):\n\n`;

      if (workLog) {
        message += `🟢 Пришёл: ${workLog.arrivedAt || 'Не отмечено'}\n`;
        message += `🍱 Обед: ${workLog.lunchStart ? `${workLog.lunchStart} - ${workLog.lunchEnd || 'В процессе'}` : 'Не было'}\n`;
        message += `🔴 Ушёл: ${workLog.leftAt || 'Не отмечено'}\n`;
        message += `💼 Режим: ${this.getWorkModeText(workLog.workMode)}\n`;
        message += `⏱ Всего: ${this.formatMinutes(workLog.totalMinutes)}\n\n`;
        
        if (workLog.dailyReport) {
          message += `📝 Отчёт: ${workLog.dailyReport}\n`;
        }
        
        if (workLog.problems) {
          message += `⚠️ Проблемы: ${workLog.problems}`;
        }
      } else {
        message += '❌ Сегодня активности не было';
      }

      await this.bot.sendMessage(chatId, message);
    } catch (error) {
      console.error('Ошибка в handleMyDay:', error);
      await this.sendUserFriendlyError(chatId, 'command_error', { command: 'myday' });
    }
  }

  async handleEditReport(msg) {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;

    // Защита от повторных нажатий
    if (this.isActionOnCooldown(telegramId, 'editreport', 1000)) {
      return;
    }

    try {
      const user = await this.getUser(telegramId);
      if (!user) return await this.sendNotRegistered(chatId);

      const today = moment().format('YYYY-MM-DD');
      const workLog = await WorkLog.findOne({
        where: { userId: user.id, workDate: today }
      });

      if (!workLog) {
        return await this.bot.sendMessage(chatId, 
          '❌ Сегодня нет записей рабочего времени'
        );
      }

      if (!workLog.leftAt) {
        return await this.bot.sendMessage(chatId, 
          '⚠️ Сначала завершите рабочий день кнопкой "Ушёл домой"'
        );
      }

      // Устанавливаем состояние редактирования отчёта
      this.userStates.set(telegramId, { 
        state: 'editing_report', 
        workLogId: workLog.id 
      });

      const currentReport = workLog.dailyReport || 'Отчёт отсутствует';
      await this.bot.sendMessage(chatId, 
        `📝 Текущий отчёт:\n"${currentReport}"\n\n` +
        `Напишите новый отчёт или отправьте /cancel для отмены:`
      );
    } catch (error) {
      console.error('Ошибка в handleEditReport:', error);
      await this.sendUserFriendlyError(chatId, 'command_error', { command: 'editreport' });
    }
  }

  async handleCancel(msg) {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;

    this.userStates.delete(telegramId);
    await this.bot.sendMessage(chatId, '✅ Операция отменена');
    await this.sendMainMenu(chatId);
  }

  async handleHistory(msg) {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;

    // Защита от повторных нажатий
    if (this.isActionOnCooldown(telegramId, 'history', 2000)) {
      return;
    }

    try {
      await this.bot.sendChatAction(chatId, 'typing');
      
      const user = await this.getUser(telegramId);
      if (!user) return await this.sendNotRegistered(chatId);

      // Получаем данные за последние 30 дней
      const endDate = moment();
      const startDate = moment().subtract(29, 'days');

      const { Op } = require('sequelize');
      const workLogs = await WorkLog.findAll({
        where: {
          userId: user.id,
          workDate: {
            [Op.between]: [
              startDate.format('YYYY-MM-DD'),
              endDate.format('YYYY-MM-DD')
            ]
          }
        },
        order: [['workDate', 'DESC']],
        limit: 20 // Ограничиваем количество записей для удобства чтения
      });

      let message = `📚 *История работы (последние 30 дней)*\n\n`;

      if (workLogs.length === 0) {
        message += '❌ За последние 30 дней записей не найдено';
      } else {
        // Общая статистика
        let totalMinutes = 0;
        let workDays = 0;
        let reportsCount = 0;
        let lateArrivals = 0;

        workLogs.forEach(log => {
          totalMinutes += log.totalMinutes || 0;
          if (log.workMode !== 'sick' && log.workMode !== 'vacation') {
            workDays++;
          }
          if (log.dailyReport) reportsCount++;
          
          if (log.arrivedAt) {
            const arrivalMoment = moment(log.arrivedAt, 'HH:mm:ss');
            const expectedTime = moment('09:00:00', 'HH:mm:ss');
            if (arrivalMoment.isAfter(expectedTime)) lateArrivals++;
          }
        });

        const avgHours = workDays > 0 ? (totalMinutes / workDays / 60).toFixed(1) : 0;

        message += '📊 *Общая статистика:*\n';
        message += `📅 Записей найдено: ${workLogs.length}\n`;
        message += `⏱ Всего отработано: ${this.formatMinutes(totalMinutes)}\n`;
        message += `💼 Рабочих дней: ${workDays}\n`;
        message += `📝 Отчётов сдано: ${reportsCount}/${workLogs.length}\n`;
        message += `⏰ Среднее время в день: ${avgHours}ч\n`;
        if (lateArrivals > 0) {
          message += `⚠️ Опозданий: ${lateArrivals}\n`;
        }
        message += '\n';

        // Последние записи
        message += '📋 *Последние записи:*\n';
        workLogs.slice(0, 10).forEach(log => {
          const date = moment(log.workDate).format('DD.MM.YYYY ddd');
          const mode = this.getWorkModeText(log.workMode);
          const time = this.formatMinutes(log.totalMinutes || 0);
          const reportIcon = log.dailyReport ? '📝' : '❌';
          const arrivalTime = log.arrivedAt ? log.arrivedAt.substring(0, 5) : '—';
          const leftTime = log.leftAt ? log.leftAt.substring(0, 5) : '—';
          
          message += `${date}:\n`;
          message += `   💼 ${mode} (${arrivalTime}→${leftTime}, ${time})\n`;
          message += `   ${reportIcon} ${log.dailyReport ? 'Отчёт сдан' : 'Нет отчёта'}\n\n`;
        });

        if (workLogs.length > 10) {
          message += `... и ещё ${workLogs.length - 10} записей\n`;
        }
      }

      await this.bot.sendMessage(chatId, message, { 
        parse_mode: 'Markdown',
        disable_web_page_preview: true 
      });
    } catch (error) {
      console.error('Ошибка в handleHistory:', error);
      await this.sendUserFriendlyError(chatId, 'stats_error', { statsType: 'history' });
    }
  }

  async handleHelp(msg) {
    const chatId = msg.chat.id;
    
    const helpMessage = 
      `🤖 *Outcast TimeBot - Справка*\n\n` +
      `*Основные команды:*\n` +
      `/start - Начать работу/регистрация\n` +
      `/myday - Просмотр сегодняшнего дня\n` +
      `/myweek - Детальная статистика за неделю\n` +
      `/history - История работы за месяц\n` +
      `/team - Статус команды (для менеджеров)\n` +
      `/editreport - Редактировать отчёт за сегодня\n` +
      `/cancel - Отменить текущую операцию\n` +
      `/help - Эта справка\n\n` +
      `*Кнопки меню:*\n` +
      `✅ Пришёл в офис - Отметка прихода на работу\n` +
      `🏠 Работаю удалённо - Отметка удалённой работы\n` +
      `🍱 Начал обед - Начало обеденного перерыва\n` +
      `🔙 Вернулся с обеда - Конец обеденного перерыва\n` +
      `❌ Ушёл домой - Завершение рабочего дня + отчёт\n` +
      `🤒 Больничный - Отметка болезни\n\n` +
      `*Рабочий процесс:*\n` +
      `1️⃣ Отметьтесь при приходе\n` +
      `2️⃣ Отметьте обед (при необходимости)\n` +
      `3️⃣ Отметьте уход - система попросит отчёт\n` +
      `4️⃣ Напишите текст отчёта\n\n` +
      `💡 После завершения дня можно редактировать отчёт командой /editreport`;

    await this.bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
  }

  async handleMyWeek(msg) {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;

    // Защита от повторных нажатий
    if (this.isActionOnCooldown(telegramId, 'myweek', 2000)) {
      return;
    }

    try {
      await this.bot.sendChatAction(chatId, 'typing');
      
      const user = await this.getUser(telegramId);
      if (!user) return await this.sendNotRegistered(chatId);

      // Получаем данные за последние 7 дней (включая сегодня)
      const endDate = moment();
      const startDate = moment().subtract(6, 'days');

      const { Op } = require('sequelize');
      const workLogs = await WorkLog.findAll({
        where: {
          userId: user.id,
          workDate: {
            [Op.between]: [
              startDate.format('YYYY-MM-DD'),
              endDate.format('YYYY-MM-DD')
            ]
          }
        },
        order: [['workDate', 'ASC']]
      });

      let message = `📅 *Ваша неделя (${startDate.format('DD.MM')} - ${endDate.format('DD.MM.YYYY')})*\n\n`;

      if (workLogs.length === 0) {
        message += '❌ За последние 7 дней активности не было';
      } else {
        // Статистика
        let totalMinutes = 0;
        let workDays = 0;
        let remoteDays = 0;
        let officeDays = 0;
        let reportsCount = 0;
        let lateArrivals = 0;

        // Создаём карту дней для заполнения пропусков
        const dayMap = new Map();
        for (let i = 0; i < 7; i++) {
          const date = moment().subtract(6 - i, 'days');
          dayMap.set(date.format('YYYY-MM-DD'), {
            date: date.format('YYYY-MM-DD'),
            dayName: date.format('ddd DD.MM'),
            workLog: null
          });
        }

        // Заполняем данными
        workLogs.forEach(log => {
          if (dayMap.has(log.workDate)) {
            dayMap.get(log.workDate).workLog = log;
          }
        });

        // Формируем отчёт по дням
        message += '📊 *Детализация по дням:*\n';
        dayMap.forEach(day => {
          const log = day.workLog;
          if (log) {
            const mode = this.getWorkModeText(log.workMode);
            const time = this.formatMinutes(log.totalMinutes || 0);
            const reportIcon = log.dailyReport ? '📝' : '❌';
            const arrivalTime = log.arrivedAt ? log.arrivedAt.substring(0, 5) : '—';
            const leftTime = log.leftAt ? log.leftAt.substring(0, 5) : '—';
            
            message += `${day.dayName}: ${mode}\n`;
            message += `   ⏰ ${arrivalTime} → ${leftTime} (${time})\n`;
            message += `   ${reportIcon} ${log.dailyReport ? 'Есть отчёт' : 'Нет отчёта'}\n\n`;

            // Статистика
            totalMinutes += log.totalMinutes || 0;
            if (log.workMode !== 'sick' && log.workMode !== 'vacation') {
              workDays++;
              if (log.workMode === 'remote') remoteDays++;
              if (log.workMode === 'office') officeDays++;
            }
            if (log.dailyReport) reportsCount++;
            
            // Проверка опозданий (после 9:00)
            if (log.arrivedAt) {
              const arrivalMoment = moment(log.arrivedAt, 'HH:mm:ss');
              const expectedTime = moment('09:00:00', 'HH:mm:ss');
              if (arrivalMoment.isAfter(expectedTime)) lateArrivals++;
            }
          } else {
            message += `${day.dayName}: 🚫 Нет данных\n\n`;
          }
        });

        // Итоговая статистика
        const avgHours = workDays > 0 ? (totalMinutes / workDays / 60).toFixed(1) : 0;
        
        message += '📈 *Сводка за неделю:*\n';
        message += `⏱ Всего отработано: ${this.formatMinutes(totalMinutes)}\n`;
        message += `📅 Рабочих дней: ${workDays}\n`;
        message += `🏢 В офисе: ${officeDays} дней\n`;
        message += `🏠 Удалённо: ${remoteDays} дней\n`;
        message += `📝 Отчётов сдано: ${reportsCount}/${workLogs.length}\n`;
        message += `⏰ Среднее время в день: ${avgHours}ч\n`;
        
        if (lateArrivals > 0) {
          message += `⚠️ Опозданий: ${lateArrivals}\n`;
        }
      }

      await this.bot.sendMessage(chatId, message, { 
        parse_mode: 'Markdown',
        disable_web_page_preview: true 
      });
    } catch (error) {
      console.error('Ошибка в handleMyWeek:', error);
      await this.sendUserFriendlyError(chatId, 'stats_error', { statsType: 'weekly' });
    }
  }

  async handleTeam(msg) {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;

    try {
      // Защита от повторных запросов
      if (this.isActionOnCooldown(telegramId, 'team_command', 3000)) {
        return await this.sendUserFriendlyError(chatId, 'action_cooldown');
      }

      const user = await this.getUser(telegramId);
      if (!user) return await this.sendUserFriendlyError(chatId, 'user_not_registered');

      // Проверяем роль пользователя
      if (user.role !== 'manager' && user.role !== 'admin') {
        return await this.sendUserFriendlyError(chatId, 'permission_denied');
      }

      // Показываем индикатор загрузки
      await this.bot.sendChatAction(chatId, 'typing');

      // Получаем данные команды через API
      const teamData = await this.getTeamData();
      
      if (!teamData || teamData.length === 0) {
        return await this.bot.sendMessage(chatId, 
          '❌ Не удалось получить данные команды или команда пуста'
        );
      }

      const message = this.formatTeamData(teamData);
      
      await this.bot.sendMessage(chatId, message, { 
        parse_mode: 'Markdown',
        disable_web_page_preview: true 
      });

    } catch (error) {
      console.error('Ошибка в handleTeam:', error);
      await this.sendUserFriendlyError(chatId, 'database_error');
    }
  }

  async getTeamData() {
    try {
      const today = moment().format('YYYY-MM-DD');
      
      // Получаем всех активных пользователей
      const allUsers = await User.findAll({
        where: { status: 'active' },
        attributes: ['id', 'name', 'username', 'role']
      });

      // Получаем рабочие логи за сегодня
      const { Op } = require('sequelize');
      const workLogs = await WorkLog.findAll({
        where: {
          workDate: today
        },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'username', 'role'],
          where: {
            status: 'active'
          }
        }],
        order: [[{ model: User, as: 'user' }, 'name', 'ASC']]
      });

      // Создаём полную сводку
      const teamSummary = allUsers.map(user => {
        const workLog = workLogs.find(log => log.userId === user.id);
        
        return {
          user: {
            id: user.id,
            name: user.name,
            username: user.username,
            role: user.role
          },
          workLog: workLog || null,
          status: this.getEmployeeStatus(workLog)
        };
      });

      return teamSummary;
    } catch (error) {
      console.error('Ошибка получения данных команды:', error);
      return null;
    }
  }

  getEmployeeStatus(workLog) {
    if (!workLog) return 'not_started';
    
    if (workLog.workMode === 'sick') return 'sick';
    if (workLog.workMode === 'vacation') return 'vacation';
    if (workLog.leftAt) return 'finished';
    if (workLog.lunchStart && !workLog.lunchEnd) return 'lunch';
    if (workLog.arrivedAt) return 'working';
    
    return 'not_started';
  }

  formatTeamData(teamData) {
    const today = moment().format('DD.MM.YYYY');
    let message = `👥 *Команда на ${today}*\n\n`;

    // Статистика
    let totalEmployees = 0;
    let working = 0;
    let finished = 0;
    let notStarted = 0;
    let onLunch = 0;
    let sick = 0;
    let onVacation = 0;
    
    // Группируем по статусам
    const statusGroups = {
      'working': [],
      'lunch': [],
      'finished': [],
      'not_started': [],
      'sick': [],
      'vacation': []
    };

    teamData.forEach(employee => {
      if (employee.user.role !== 'admin') { // Исключаем админов из общей статистики
        totalEmployees++;
        
        switch (employee.status) {
          case 'working': working++; break;
          case 'lunch': onLunch++; break;
          case 'finished': finished++; break;
          case 'not_started': notStarted++; break;
          case 'sick': sick++; break;
          case 'vacation': onVacation++; break;
        }
        
        statusGroups[employee.status].push(employee);
      }
    });

    // Общая статистика
    message += '📊 *Общая статистика:*\n';
    message += `👨‍💼 Всего сотрудников: ${totalEmployees}\n`;
    message += `💼 Работают: ${working}\n`;
    message += `🍱 На обеде: ${onLunch}\n`;
    message += `✅ Завершили день: ${finished}\n`;
    message += `🚫 Не начинали: ${notStarted}\n`;
    if (sick > 0) message += `🤒 Больничный: ${sick}\n`;
    if (onVacation > 0) message += `🏖 Отпуск: ${onVacation}\n`;
    message += '\n';

    // Детализация по статусам
    message = this.addStatusSection(message, '💼 Работают сейчас:', statusGroups.working);
    message = this.addStatusSection(message, '🍱 На обеде:', statusGroups.lunch);
    message = this.addStatusSection(message, '✅ Завершили день:', statusGroups.finished);
    message = this.addStatusSection(message, '🚫 Ещё не начинали:', statusGroups.not_started);
    
    if (statusGroups.sick.length > 0) {
      message = this.addStatusSection(message, '🤒 Больничный:', statusGroups.sick);
    }
    
    if (statusGroups.vacation.length > 0) {
      message = this.addStatusSection(message, '🏖 Отпуск:', statusGroups.vacation);
    }

    return message;
  }

  addStatusSection(message, title, employees) {
    if (employees.length === 0) return message;
    
    message += `${title}\n`;
    employees.forEach(emp => {
      const workLog = emp.workLog;
      const roleIcon = emp.user.role === 'manager' ? '👨‍💼' : '👤';
      const workModeIcon = workLog?.workMode === 'remote' ? '🏠' : workLog?.workMode === 'office' ? '🏢' : '';
      
      let timeInfo = '';
      if (workLog) {
        const arrival = workLog.arrivedAt ? workLog.arrivedAt.substring(0, 5) : '';
        const departure = workLog.leftAt ? workLog.leftAt.substring(0, 5) : '';
        const totalTime = workLog.totalMinutes ? this.formatMinutes(workLog.totalMinutes) : '';
        
        if (emp.status === 'finished') {
          timeInfo = ` (${arrival}-${departure}, ${totalTime})`;
        } else if (emp.status === 'working' || emp.status === 'lunch') {
          timeInfo = ` (с ${arrival})`;
        }
      }
      
      message += `${roleIcon} ${emp.user.name} ${workModeIcon}${timeInfo}\n`;
    });
    message += '\n';
    
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
          text: '⏳ Подождите немного...',
          show_alert: false
        });
        return;
      }

      const user = await this.getUser(telegramId);
      if (!user) {
        await this.sendUserFriendlyError(chatId, 'user_not_registered');
        await this.bot.answerCallbackQuery(callbackQuery.id);
        return;
      }

      // Получаем текущий workLog для валидации
      const today = moment().format('YYYY-MM-DD');
      const workLog = await WorkLog.findOne({
        where: { userId: user.id, workDate: today }
      });

      let actionType = '';
      let successMessage = '';

      switch (data) {
        case 'arrived_office':
          actionType = 'mark_arrival';
          successMessage = '✅ Отмечен приход в офис';
          break;
        case 'arrived_remote':
          actionType = 'mark_arrival';
          successMessage = '✅ Отмечена удалённая работа';
          break;
        case 'lunch_start':
          actionType = 'mark_lunch_start';
          successMessage = '🍱 Обед начат';
          break;
        case 'lunch_end':
          actionType = 'mark_lunch_end';
          successMessage = '🔙 Возвращение с обеда отмечено';
          break;
        case 'left_work':
          actionType = 'mark_leaving';
          successMessage = '🏠 Рабочий день завершён';
          break;
        case 'sick_day':
          // Больничный не требует валидации
          await this.markSickDay(chatId, user);
          await this.bot.answerCallbackQuery(callbackQuery.id, { text: '🤒 Больничный отмечен' });
          return;
      }

      // Валидация действия
      if (actionType) {
        const validation = await this.validateUserAction(user, actionType, workLog);
        if (!validation.valid) {
          await this.sendUserFriendlyError(chatId, validation.errorType, validation.context);
          await this.bot.answerCallbackQuery(callbackQuery.id);
          return;
        }
      }

      // Выполняем действие
      switch (data) {
        case 'arrived_office':
          await this.markArrival(chatId, user, 'office');
          break;
        case 'arrived_remote':
          await this.markArrival(chatId, user, 'remote');
          break;
        case 'lunch_start':
          await this.markLunchStart(chatId, user);
          break;
        case 'lunch_end':
          await this.markLunchEnd(chatId, user);
          break;
        case 'left_work':
          await this.markLeaving(chatId, user);
          break;
      }

      await this.bot.answerCallbackQuery(callbackQuery.id, { 
        text: successMessage,
        show_alert: false
      });

    } catch (error) {
      console.error('Ошибка в handleCallback:', error);
      await this.sendUserFriendlyError(chatId, 'database_error');
      await this.bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Ошибка' });
    }
  }

  async sendMainMenu(chatId, customMessage = null) {
    try {
      // Получаем информацию о пользователе для персонализации
      const telegramId = chatId; // В некоторых случаях может отличаться
      const user = await User.findOne({ where: { telegramId } });
      
      let statusInfo = '';
      if (user) {
        const today = moment().format('YYYY-MM-DD');
        const workLog = await WorkLog.findOne({
          where: { userId: user.id, workDate: today }
        });
        
        if (workLog) {
          const status = this.getEmployeeStatus(workLog);
          const statusEmojis = {
            'working': '💼 Работаете',
            'lunch': '🍱 На обеде',  
            'finished': '✅ День завершён',
            'not_started': '🌅 Готов к работе',
            'sick': '🤒 Больничный',
            'vacation': '🏖 Отпуск'
          };
          statusInfo = `\n${statusEmojis[status] || '📊 Статус неизвестен'}`;
        } else {
          statusInfo = '\n🌅 Готов к работе';
        }
      }

      const keyboard = {
        inline_keyboard: [
          [
            { text: '✅ Пришёл в офис', callback_data: 'arrived_office' },
            { text: '🏠 Работаю удалённо', callback_data: 'arrived_remote' }
          ],
          [
            { text: '🍱 Начал обед', callback_data: 'lunch_start' },
            { text: '🔙 Вернулся с обеда', callback_data: 'lunch_end' }
          ],
          [
            { text: '❌ Ушёл домой', callback_data: 'left_work' },
            { text: '🤒 Больничный', callback_data: 'sick_day' }
          ]
        ]
      };

      const message = customMessage || 
        `🕐 *Управление рабочим временем*${statusInfo}\n\n` +
        `Выберите действие:`;

      await this.bot.sendMessage(chatId, message, { 
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });
    } catch (error) {
      console.error('Ошибка в sendMainMenu:', error);
      // Fallback to simple menu
      const keyboard = {
        inline_keyboard: [
          [
            { text: '✅ Пришёл в офис', callback_data: 'arrived_office' },
            { text: '🏠 Работаю удалённо', callback_data: 'arrived_remote' }
          ],
          [
            { text: '🍱 Начал обед', callback_data: 'lunch_start' },
            { text: '🔙 Вернулся с обеда', callback_data: 'lunch_end' }
          ],
          [
            { text: '❌ Ушёл домой', callback_data: 'left_work' },
            { text: '🤒 Больничный', callback_data: 'sick_day' }
          ]
        ]
      };

      await this.bot.sendMessage(chatId, '🕐 Выберите действие:', { reply_markup: keyboard });
    }
  }

  async markArrival(chatId, user, mode) {
    const today = moment().format('YYYY-MM-DD');
    const currentTime = moment().format('HH:mm:ss');

    try {
      const [workLog, created] = await WorkLog.findOrCreate({
        where: { userId: user.id, workDate: today },
        defaults: {
          userId: user.id,
          workDate: today,
          arrivedAt: currentTime,
          workMode: mode
        }
      });

      if (!created) {
        await workLog.update({
          arrivedAt: currentTime,
          workMode: mode
        });
      }

      const modeText = mode === 'office' ? 'в офисе' : 'удалённо';
      const modeEmoji = mode === 'office' ? '🏢' : '🏠';
      
      await this.bot.sendMessage(chatId, 
        `${modeEmoji} *Начало рабочего дня*\n\n` +
        `⏰ Время: ${moment().format('HH:mm')}\n` +
        `💼 Режим: ${modeText}\n` +
        `📅 Дата: ${moment().format('DD.MM.YYYY')}\n\n` +
        `Хорошего рабочего дня! 🚀`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error('Ошибка в markArrival:', error);
      await this.sendUserFriendlyError(chatId, 'database_error');
    }
  }

  async markLunchStart(chatId, user) {
    const today = moment().format('YYYY-MM-DD');
    const currentTime = moment().format('HH:mm:ss');

    try {
      const workLog = await WorkLog.findOne({
        where: { userId: user.id, workDate: today }
      });

      await workLog.update({ lunchStart: currentTime });
      
      const workDuration = moment(currentTime, 'HH:mm:ss')
        .diff(moment(workLog.arrivedAt, 'HH:mm:ss'), 'minutes');
      
      await this.bot.sendMessage(chatId, 
        `🍱 *Обеденный перерыв*\n\n` +
        `⏰ Начало: ${moment().format('HH:mm')}\n` +
        `⏱ Работали: ${this.formatMinutes(workDuration)}\n\n` +
        `Приятного аппетита! 😋`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error('Ошибка в markLunchStart:', error);
      await this.sendUserFriendlyError(chatId, 'database_error');
    }
  }

  async markLunchEnd(chatId, user) {
    const today = moment().format('YYYY-MM-DD');
    const currentTime = moment().format('HH:mm:ss');

    try {
      const workLog = await WorkLog.findOne({
        where: { userId: user.id, workDate: today }
      });

      await workLog.update({ lunchEnd: currentTime });
      
      const lunchDuration = moment(currentTime, 'HH:mm:ss')
        .diff(moment(workLog.lunchStart, 'HH:mm:ss'), 'minutes');

      await this.bot.sendMessage(chatId, 
        `🔙 *Возвращение с обеда*\n\n` +
        `⏰ Время: ${moment().format('HH:mm')}\n` +
        `🍱 Длительность обеда: ${this.formatMinutes(lunchDuration)}\n\n` +
        `Добро пожаловать обратно! 💪`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error('Ошибка в markLunchEnd:', error);
      await this.sendUserFriendlyError(chatId, 'database_error');
    }
  }

  async markLeaving(chatId, user) {
    const today = moment().format('YYYY-MM-DD');
    const currentTime = moment().format('HH:mm:ss');

    try {
      const workLog = await WorkLog.findOne({
        where: { userId: user.id, workDate: today }
      });

      // Подсчёт общего времени работы
      const totalMinutes = this.calculateWorkingMinutes(workLog, currentTime);

      await workLog.update({ 
        leftAt: currentTime,
        totalMinutes: totalMinutes
      });

      // Устанавливаем состояние ожидания отчёта
      this.userStates.set(user.telegramId, { 
        state: 'waiting_report', 
        workLogId: workLog.id 
      });

      const workStart = workLog.arrivedAt;
      const workEnd = moment().format('HH:mm');
      const modeText = this.getWorkModeText(workLog.workMode);

      await this.bot.sendMessage(chatId, 
        `🏠 *Завершение рабочего дня*\n\n` +
        `⏰ Время ухода: ${workEnd}\n` +
        `📅 Рабочий период: ${workStart} - ${workEnd}\n` +
        `💼 Режим работы: ${modeText}\n` +
        `⏱ Отработано сегодня: *${this.formatMinutes(totalMinutes)}*\n\n` +
        `📝 *Теперь напишите отчёт о проделанной работе:*\n` +
        `_Опишите основные задачи и достижения за день_`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error('Ошибка в markLeaving:', error);
      await this.sendUserFriendlyError(chatId, 'database_error');
    }
  }

  calculateWorkingMinutes(workLog, leftAt) {
    if (!workLog.arrivedAt) return 0;

    const arrivalTime = moment(workLog.arrivedAt, 'HH:mm:ss');
    const leaveTime = moment(leftAt, 'HH:mm:ss');
    
    let totalMinutes = leaveTime.diff(arrivalTime, 'minutes');

    // Вычитаем время обеда, если был
    if (workLog.lunchStart && workLog.lunchEnd) {
      const lunchStart = moment(workLog.lunchStart, 'HH:mm:ss');
      const lunchEnd = moment(workLog.lunchEnd, 'HH:mm:ss');
      const lunchMinutes = lunchEnd.diff(lunchStart, 'minutes');
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

      if (userState && userState.state === 'waiting_report') {
        await this.handleDailyReport(chatId, user, text, userState.workLogId);
        this.userStates.delete(telegramId); // Очищаем состояние
      } else if (userState && userState.state === 'editing_report') {
        await this.handleEditDailyReport(chatId, user, text, userState.workLogId);
        this.userStates.delete(telegramId); // Очищаем состояние
      } else {
        // Если пользователь не в состоянии ожидания отчёта, показываем меню
        await this.sendMainMenu(chatId);
      }
    } catch (error) {
      console.error('Ошибка в handleTextMessage:', error);
      await this.bot.sendMessage(chatId, '❌ Ошибка обработки сообщения');
    }
  }

  async handleDailyReport(chatId, user, reportText, workLogId) {
    try {
      const workLog = await WorkLog.findByPk(workLogId);
      
      if (!workLog) {
        return await this.bot.sendMessage(chatId, 
          '❌ Не удалось найти запись рабочего дня'
        );
      }

      // Проверяем, что отчёт не пустой
      const trimmedReport = reportText.trim();
      if (!trimmedReport) {
        await workLog.update({ dailyReport: 'Отчёт не предоставлен' });
        await this.bot.sendMessage(chatId, 
          '⚠️ Пустой отчёт зафиксирован как пропуск. Хорошего вечера!'
        );
      } else {
        await workLog.update({ dailyReport: trimmedReport });
        await this.bot.sendMessage(chatId, 
          '✅ Отчёт сохранён! Спасибо за работу, хорошего вечера!'
        );
      }

      // Показываем краткую сводку дня
      await this.sendDaySummary(chatId, workLog);
    } catch (error) {
      console.error('Ошибка в handleDailyReport:', error);
      await this.bot.sendMessage(chatId, '❌ Ошибка сохранения отчёта');
    }
  }

  async sendDaySummary(chatId, workLog) {
    const summary = 
      `📊 Итоги дня:\n\n` +
      `🟢 Пришёл: ${workLog.arrivedAt}\n` +
      `🔴 Ушёл: ${workLog.leftAt}\n` +
      `⏱ Отработано: ${this.formatMinutes(workLog.totalMinutes)}\n` +
      `💼 Режим: ${this.getWorkModeText(workLog.workMode)}\n` +
      `📝 Отчёт: ${workLog.dailyReport ? 'Сдан ✅' : 'Не сдан ❌'}`;

    await this.bot.sendMessage(chatId, summary);
  }

  async handleEditDailyReport(chatId, user, reportText, workLogId) {
    try {
      const workLog = await WorkLog.findByPk(workLogId);
      
      if (!workLog) {
        return await this.bot.sendMessage(chatId, 
          '❌ Не удалось найти запись рабочего дня'
        );
      }

      const trimmedReport = reportText.trim();
      const oldReport = workLog.dailyReport;
      
      await workLog.update({ dailyReport: trimmedReport || 'Отчёт не предоставлен' });
      
      await this.bot.sendMessage(chatId, 
        `✅ Отчёт обновлён!\n\n` +
        `📝 Старый: "${oldReport}"\n` +
        `🆕 Новый: "${workLog.dailyReport}"`
      );
    } catch (error) {
      console.error('Ошибка в handleEditDailyReport:', error);
      await this.bot.sendMessage(chatId, '❌ Ошибка обновления отчёта');
    }
  }

  async markSickDay(chatId, user) {
    const today = moment().format('YYYY-MM-DD');

    try {
      const [workLog, created] = await WorkLog.findOrCreate({
        where: { userId: user.id, workDate: today },
        defaults: {
          userId: user.id,
          workDate: today,
          workMode: 'sick',
          dailyReport: 'Больничный день',
          totalMinutes: 0
        }
      });

      if (!created) {
        await workLog.update({
          workMode: 'sick',
          dailyReport: 'Больничный день',
          arrivedAt: null,
          leftAt: null,
          lunchStart: null,
          lunchEnd: null,
          totalMinutes: 0
        });
      }

      await this.bot.sendMessage(chatId, 
        '🤒 Больничный день отмечен. Скорейшего выздоровления!'
      );
    } catch (error) {
      console.error('Ошибка в markSickDay:', error);
      await this.bot.sendMessage(chatId, '❌ Ошибка отметки больничного');
    }
  }

  async getUser(telegramId) {
    return await User.findOne({ where: { telegramId } });
  }

  async sendNotRegistered(chatId) {
    await this.bot.sendMessage(chatId, 
      '❌ Вы не зарегистрированы. Используйте команду /start'
    );
  }

  getRoleText(role) {
    const roles = {
      'employee': 'Сотрудник',
      'manager': 'Менеджер',
      'admin': 'Администратор'
    };
    return roles[role] || 'Неизвестная роль';
  }

  getWorkModeText(mode) {
    const modes = {
      'office': 'Офис',
      'remote': 'Удалённо',
      'sick': 'Больничный',
      'vacation': 'Отпуск'
    };
    return modes[mode] || 'Неизвестно';
  }

  formatMinutes(minutes) {
    if (!minutes) return '0м';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}ч ${mins}м`;
    }
    return `${mins}м`;
  }

  // Защита от повторных нажатий
  isActionOnCooldown(userId, action, cooldownMs = 2000) {
    const key = `${userId}_${action}`;
    const now = Date.now();
    const lastAction = this.actionCooldowns.get(key);
    
    if (lastAction && (now - lastAction) < cooldownMs) {
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
    const maxAge = 10 * 60 * 1000; // 10 минут
    
    for (const [key, timestamp] of this.actionCooldowns.entries()) {
      if (now - timestamp > maxAge) {
        this.actionCooldowns.delete(key);
      }
    }
  }

  // Улучшенные сообщения об ошибках
  async sendUserFriendlyError(chatId, errorType, context = {}) {
    const errorMessages = {
      'already_arrived': '⏰ Вы уже отметились сегодня! Время прихода: {time}',
      'already_left': '🏠 Вы уже завершили рабочий день в {time}',
      'need_arrival': '⚠️ Сначала отметьтесь как пришедший на работу',
      'already_lunch_started': '🍱 Обед уже начат в {time}',
      'already_lunch_ended': '🔙 Возвращение с обеда уже отмечено в {time}',
      'need_lunch_start': '⚠️ Сначала отметьте начало обеда',
      'no_work_log': '📝 Сегодня нет записей рабочего времени',
      'need_finish_day': '⏰ Сначала завершите рабочий день кнопкой "Ушёл домой"',
      'action_cooldown': '⏳ Подождите немного перед следующим действием',
      'permission_denied': '🔒 У вас нет прав для выполнения этой команды',
      'user_not_registered': '❌ Сначала нужно зарегистрироваться командой /start',
      'database_error': '💾 Проблемы с базой данных. Попробуйте ещё раз',
      'network_error': '🌐 Проблемы с подключением. Проверьте интернет и попробуйте снова',
      'invalid_worklog_state': '⚠️ Действие невозможно в текущем состоянии рабочего дня',
      'command_error': '❌ Ошибка выполнения команды {command}. Попробуйте позже',
      'stats_error': '📊 Не удалось получить статистику {statsType}. Проверьте подключение'
    };

    let message = errorMessages[errorType] || '❌ Произошла неизвестная ошибка';
    
    // Подставляем контекстные данные
    Object.keys(context).forEach(key => {
      message = message.replace(`{${key}}`, context[key]);
    });

    await this.bot.sendMessage(chatId, message);
  }

  // Валидация состояния пользователя перед действием
  async validateUserAction(user, action, workLog = null) {
    const validationRules = {
      'arrive': {
        condition: !workLog || !workLog.arrivedAt,
        error: 'already_arrived',
        context: workLog && workLog.arrivedAt ? { time: workLog.arrivedAt } : {}
      },
      'lunch_start': {
        condition: workLog && workLog.arrivedAt && !workLog.lunchStart,
        error: !workLog || !workLog.arrivedAt ? 'need_arrival' : 'already_lunch_started',
        context: workLog && workLog.lunchStart ? { time: workLog.lunchStart } : {}
      },
      'lunch_end': {
        condition: workLog && workLog.lunchStart && !workLog.lunchEnd,
        error: !workLog || !workLog.lunchStart ? 'need_lunch_start' : 'already_lunch_ended',
        context: workLog && workLog.lunchEnd ? { time: workLog.lunchEnd } : {}
      },
      'leave': {
        condition: workLog && workLog.arrivedAt && !workLog.leftAt,
        error: !workLog || !workLog.arrivedAt ? 'need_arrival' : 'already_left',
        context: workLog && workLog.leftAt ? { time: workLog.leftAt } : {}
      }
    };

    const rule = validationRules[action];
    if (!rule) return { valid: true };

    if (!rule.condition) {
      return {
        valid: false,
        error: rule.error,
        context: rule.context
      };
    }

    return { valid: true };
  }
}

module.exports = TimeBot; 