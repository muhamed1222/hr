const express = require('express');
const router = express.Router();
const {
  getUsersForMorningReminder,
  getUsersForLunchStartReminder,
  getUsersForLunchEndReminder,
  getUsersForEveningReminder,
  getReminderStats
} = require('../cron/reminderService');

const {
  sendPersonalizedReminder,
  sendManagerDailyStats
} = require('../utils/reminderMessages');

const { User } = require('../models');

/**
 * Получить статистику напоминаний
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await getReminderStats();
    
    const morningUsers = await getUsersForMorningReminder();
    const lunchStartUsers = await getUsersForLunchStartReminder();
    const lunchEndUsers = await getUsersForLunchEndReminder();
    const eveningUsers = await getUsersForEveningReminder();

    res.json({
      success: true,
      data: {
        general: stats,
        reminders: {
          morning: {
            count: morningUsers.length,
            users: morningUsers.map(u => ({ id: u.id, name: u.name }))
          },
          lunchStart: {
            count: lunchStartUsers.length,
            users: lunchStartUsers.map(u => ({ id: u.id, name: u.name }))
          },
          lunchEnd: {
            count: lunchEndUsers.length,
            users: lunchEndUsers.map(u => ({ id: u.id, name: u.name }))
          },
          evening: {
            count: eveningUsers.length,
            users: eveningUsers.map(u => ({ id: u.id, name: u.name }))
          }
        }
      }
    });

  } catch (error) {
    console.error('❌ Ошибка получения статистики напоминаний:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения статистики'
    });
  }
});

/**
 * Отправить тестовое напоминание конкретного типа
 */
router.post('/test/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { userId } = req.body;

    const validTypes = ['morning', 'lunch_start', 'lunch_end', 'evening'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Неверный тип напоминания'
      });
    }

    let user;
    if (userId) {
      user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Пользователь не найден'
        });
      }
    } else {
      // Найти любого пользователя с Telegram ID для тестирования
      user = await User.findOne({
        where: {
          telegramId: { [require('sequelize').Op.not]: null },
          status: 'active'
        }
      });
    }

    if (!user || !user.telegramId) {
      return res.status(400).json({
        success: false,
        message: 'Нет пользователей с настроенным Telegram'
      });
    }

    const result = await sendPersonalizedReminder(user, type);

    if (result) {
      res.json({
        success: true,
        message: `Тестовое напоминание ${type} отправлено`,
        data: {
          user: { id: user.id, name: user.name },
          telegramResult: result
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Ошибка отправки напоминания'
      });
    }

  } catch (error) {
    console.error('❌ Ошибка отправки тестового напоминания:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * Запустить все напоминания определённого типа принудительно
 */
router.post('/send/:type', async (req, res) => {
  try {
    const { type } = req.params;
    let users = [];
    let reminderType = '';

    switch (type) {
      case 'morning':
        users = await getUsersForMorningReminder();
        reminderType = 'morning';
        break;
      case 'lunch_start':
        users = await getUsersForLunchStartReminder();
        reminderType = 'lunch_start';
        break;
      case 'lunch_end':
        users = await getUsersForLunchEndReminder();
        reminderType = 'lunch_end';
        break;
      case 'evening':
        users = await getUsersForEveningReminder();
        reminderType = 'evening';
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Неверный тип напоминания'
        });
    }

    if (users.length === 0) {
      return res.json({
        success: true,
        message: 'Нет пользователей для отправки напоминаний',
        data: { sent: 0, total: 0 }
      });
    }

    let sent = 0;
    const results = [];

    for (const user of users) {
      const result = await sendPersonalizedReminder(user, reminderType);
      if (result) {
        sent++;
        results.push({ userId: user.id, name: user.name, success: true });
      } else {
        results.push({ userId: user.id, name: user.name, success: false });
      }
      
      // Пауза между отправками
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    res.json({
      success: true,
      message: `Напоминания отправлены: ${sent}/${users.length}`,
      data: {
        sent,
        total: users.length,
        results
      }
    });

  } catch (error) {
    console.error('❌ Ошибка массовой отправки напоминаний:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка отправки напоминаний'
    });
  }
});

/**
 * Отправить статистику менеджерам принудительно
 */
router.post('/stats/send', async (req, res) => {
  try {
    const stats = await getReminderStats();
    const managers = await User.findAll({
      where: {
        role: 'admin',
        telegramId: { [require('sequelize').Op.not]: null },
        status: 'active'
      }
    });

    if (managers.length === 0) {
      return res.json({
        success: true,
        message: 'Нет менеджеров с настроенным Telegram',
        data: { sent: 0, total: 0 }
      });
    }

    let sent = 0;
    const results = [];

    for (const manager of managers) {
      const result = await sendManagerDailyStats(manager.telegramId, stats);
      if (result) {
        sent++;
        results.push({ userId: manager.id, name: manager.name, success: true });
      } else {
        results.push({ userId: manager.id, name: manager.name, success: false });
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    res.json({
      success: true,
      message: `Статистика отправлена: ${sent}/${managers.length}`,
      data: {
        sent,
        total: managers.length,
        results
      }
    });

  } catch (error) {
    console.error('❌ Ошибка отправки статистики менеджерам:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка отправки статистики'
    });
  }
});

/**
 * Получить следующие запланированные запуски
 */
router.get('/schedule', async (req, res) => {
  try {
    const moment = require('moment');
    const now = moment();
    const today = now.clone();
    
    const schedule = {
      morning: {
        time: '09:50',
        next: today.clone().hour(9).minute(50).second(0),
        description: 'Напоминания о приходе на работу'
      },
      lunchStart: {
        time: '14:00',
        next: today.clone().hour(14).minute(0).second(0),
        description: 'Напоминания о начале обеда'
      },
      lunchEnd: {
        time: '15:00',
        next: today.clone().hour(15).minute(0).second(0),
        description: 'Напоминания об окончании обеда'
      },
      evening: {
        time: '17:50',
        next: today.clone().hour(17).minute(50).second(0),
        description: 'Напоминания о сдаче отчёта'
      },
      stats: {
        time: '18:30',
        next: today.clone().hour(18).minute(30).second(0),
        description: 'Статистика для менеджеров'
      }
    };

    // Если время уже прошло сегодня, показываем следующий день
    Object.keys(schedule).forEach(key => {
      if (schedule[key].next.isBefore(now)) {
        schedule[key].next.add(1, 'day');
      }
    });

    res.json({
      success: true,
      data: {
        currentTime: now.format('YYYY-MM-DD HH:mm:ss'),
        timezone: process.env.TZ || 'Europe/Moscow',
        schedule
      }
    });

  } catch (error) {
    console.error('❌ Ошибка получения расписания:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения расписания'
    });
  }
});

module.exports = router; 