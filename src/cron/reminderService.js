const { User, WorkLog } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment');

/**
 * Получает пользователей для утренних напоминаний (не отметили приход)
 */
async function getUsersForMorningReminder() {
  try {
    const today = moment().format('YYYY-MM-DD');
    
    const users = await User.findAll({
      where: {
        telegramId: { [Op.not]: null },
        status: 'active',
        role: 'employee' // Только сотрудники, не админы
      },
      include: [{
        model: WorkLog,
        as: 'workLogs',
        where: {
          workDate: today,
          arrivedAt: null
        },
        required: false // LEFT JOIN - показать пользователей даже без логов
      }],
      raw: false
    });

    // Фильтруем тех, у кого нет лога на сегодня или arrivedAt = null
    const usersToRemind = users.filter(user => {
      const todayLog = user.workLogs?.find(log => log.workDate === today);
      return !todayLog || !todayLog.arrivedAt;
    });

    // // console.log(`🌅 Утренние напоминания: найдено ${usersToRemind.length} пользователей`);
    return usersToRemind;

  } catch (error) {
    console.error('❌ Ошибка получения пользователей для утренних напоминаний:', error);
    return [];
  }
}

/**
 * Получает пользователей для напоминаний об обеде (пришли, но не начали обед)
 */
async function getUsersForLunchStartReminder() {
  try {
    const today = moment().format('YYYY-MM-DD');
    
    const users = await User.findAll({
      where: {
        telegramId: { [Op.not]: null },
        status: 'active',
        role: 'employee'
      },
      include: [{
        model: WorkLog,
        as: 'workLogs',
        where: {
          workDate: today,
          arrivedAt: { [Op.not]: null },
          lunchStart: null
        },
        required: true // INNER JOIN - только с логами
      }]
    });

    // // console.log(`🍱 Напоминания об обеде: найдено ${users.length} пользователей`);
    return users;

  } catch (error) {
    console.error('❌ Ошибка получения пользователей для напоминаний об обеде:', error);
    return [];
  }
}

/**
 * Получает пользователей для напоминаний об окончании обеда
 */
async function getUsersForLunchEndReminder() {
  try {
    const today = moment().format('YYYY-MM-DD');
    
    const users = await User.findAll({
      where: {
        telegramId: { [Op.not]: null },
        status: 'active',
        role: 'employee'
      },
      include: [{
        model: WorkLog,
        as: 'workLogs',
        where: {
          workDate: today,
          lunchStart: { [Op.not]: null },
          lunchEnd: null
        },
        required: true
      }]
    });

    // // console.log(`🔙 Напоминания об окончании обеда: найдено ${users.length} пользователей`);
    return users;

  } catch (error) {
    console.error('❌ Ошибка получения пользователей для напоминаний об окончании обеда:', error);
    return [];
  }
}

/**
 * Получает пользователей для вечерних напоминаний (не сдали отчёт)
 */
async function getUsersForEveningReminder() {
  try {
    const today = moment().format('YYYY-MM-DD');
    
    const users = await User.findAll({
      where: {
        telegramId: { [Op.not]: null },
        status: 'active',
        role: 'employee'
      },
      include: [{
        model: WorkLog,
        as: 'workLogs',
        where: {
          workDate: today,
          arrivedAt: { [Op.not]: null },
          [Op.or]: [
            { dailyReport: null },
            { dailyReport: '' },
            { leftAt: null }
          ]
        },
        required: true
      }]
    });

    // // console.log(`🌆 Вечерние напоминания: найдено ${users.length} пользователей`);
    return users;

  } catch (error) {
    console.error('❌ Ошибка получения пользователей для вечерних напоминаний:', error);
    return [];
  }
}

/**
 * Получает статистику напоминаний за сегодня
 */
async function getReminderStats() {
  try {
    const today = moment().format('YYYY-MM-DD');
    
    const totalEmployees = await User.count({
      where: {
        telegramId: { [Op.not]: null },
        status: 'active',
        role: 'employee'
      }
    });

    const completedToday = await User.count({
      where: {
        telegramId: { [Op.not]: null },
        status: 'active',
        role: 'employee'
      },
      include: [{
        model: WorkLog,
        as: 'workLogs',
        where: {
          workDate: today,
          arrivedAt: { [Op.not]: null },
          leftAt: { [Op.not]: null },
          dailyReport: { [Op.not]: null }
        },
        required: true
      }]
    });

    return {
      total: totalEmployees,
      completed: completedToday,
      pending: totalEmployees - completedToday,
      date: today
    };

  } catch (error) {
    console.error('❌ Ошибка получения статистики напоминаний:', error);
    return { total: 0, completed: 0, pending: 0, date: today };
  }
}

module.exports = {
  getUsersForMorningReminder,
  getUsersForLunchStartReminder,
  getUsersForLunchEndReminder,
  getUsersForEveningReminder,
  getReminderStats
}; 