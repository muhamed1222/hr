const TelegramBot = require('node-telegram-bot-api');
const { User, WorkLog } = require('../models');
const moment = require('moment');
require('dotenv').config();

moment.locale('ru');

class TimeBot {
  constructor() {
    this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
    this.setupCommands();
    this.setupCallbacks();
  }

  setupCommands() {
    // Основные команды
    this.bot.onText(/\/start/, this.handleStart.bind(this));
    this.bot.onText(/\/myday/, this.handleMyDay.bind(this));
    this.bot.onText(/\/myweek/, this.handleMyWeek.bind(this));
    this.bot.onText(/\/team/, this.handleTeam.bind(this));
    this.bot.onText(/\/help/, this.handleHelp.bind(this));
  }

  setupCallbacks() {
    this.bot.on('callback_query', this.handleCallback.bind(this));
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
      await this.bot.sendMessage(chatId, '❌ Ошибка получения данных');
    }
  }

  async handleCallback(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const telegramId = callbackQuery.from.id;
    const data = callbackQuery.data;

    try {
      const user = await this.getUser(telegramId);
      if (!user) return await this.sendNotRegistered(chatId);

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
        case 'sick_day':
          await this.markSickDay(chatId, user);
          break;
      }

      await this.bot.answerCallbackQuery(callbackQuery.id);
    } catch (error) {
      console.error('Ошибка в handleCallback:', error);
      await this.bot.answerCallbackQuery(callbackQuery.id, { text: 'Ошибка обработки' });
    }
  }

  async sendMainMenu(chatId) {
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

    await this.bot.sendMessage(chatId, 
      '🕐 Выберите действие:', 
      { reply_markup: keyboard }
    );
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

      if (!created && workLog.arrivedAt) {
        return await this.bot.sendMessage(chatId, 
          `⚠️ Вы уже отметились сегодня в ${workLog.arrivedAt}`
        );
      }

      if (!created) {
        await workLog.update({
          arrivedAt: currentTime,
          workMode: mode
        });
      }

      const modeText = mode === 'office' ? 'в офисе' : 'удалённо';
      await this.bot.sendMessage(chatId, 
        `✅ Отмечено! Начали работать ${modeText} в ${moment().format('HH:mm')}`
      );
    } catch (error) {
      console.error('Ошибка в markArrival:', error);
      await this.bot.sendMessage(chatId, '❌ Ошибка отметки прихода');
    }
  }

  async markLunchStart(chatId, user) {
    const today = moment().format('YYYY-MM-DD');
    const currentTime = moment().format('HH:mm:ss');

    try {
      const workLog = await WorkLog.findOne({
        where: { userId: user.id, workDate: today }
      });

      if (!workLog || !workLog.arrivedAt) {
        return await this.bot.sendMessage(chatId, 
          '⚠️ Сначала отметьтесь как пришедший на работу'
        );
      }

      if (workLog.lunchStart) {
        return await this.bot.sendMessage(chatId, 
          `⚠️ Обед уже начат в ${workLog.lunchStart}`
        );
      }

      await workLog.update({ lunchStart: currentTime });
      
      await this.bot.sendMessage(chatId, 
        `🍱 Приятного аппетита! Обед начат в ${moment().format('HH:mm')}`
      );
    } catch (error) {
      console.error('Ошибка в markLunchStart:', error);
      await this.bot.sendMessage(chatId, '❌ Ошибка отметки обеда');
    }
  }

  async markLunchEnd(chatId, user) {
    const today = moment().format('YYYY-MM-DD');
    const currentTime = moment().format('HH:mm:ss');

    try {
      const workLog = await WorkLog.findOne({
        where: { userId: user.id, workDate: today }
      });

      if (!workLog || !workLog.lunchStart) {
        return await this.bot.sendMessage(chatId, 
          '⚠️ Сначала отметьте начало обеда'
        );
      }

      if (workLog.lunchEnd) {
        return await this.bot.sendMessage(chatId, 
          `⚠️ Возвращение с обеда уже отмечено в ${workLog.lunchEnd}`
        );
      }

      await workLog.update({ lunchEnd: currentTime });
      
      const lunchDuration = moment(currentTime, 'HH:mm:ss')
        .diff(moment(workLog.lunchStart, 'HH:mm:ss'), 'minutes');

      await this.bot.sendMessage(chatId, 
        `🔙 Добро пожаловать обратно! Обед длился ${lunchDuration} минут`
      );
    } catch (error) {
      console.error('Ошибка в markLunchEnd:', error);
      await this.bot.sendMessage(chatId, '❌ Ошибка отметки возвращения');
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
    return roles[role] || role;
  }

  getWorkModeText(mode) {
    const modes = {
      'office': 'Офис',
      'remote': 'Удалённо',
      'sick': 'Больничный',
      'vacation': 'Отпуск'
    };
    return modes[mode] || mode;
  }

  formatMinutes(minutes) {
    if (!minutes) return '0 минут';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}ч ${mins}м`;
  }
}

module.exports = TimeBot; 