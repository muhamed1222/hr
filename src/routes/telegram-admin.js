const express = require('express');
const { Op } = require('sequelize');
const { User, WorkLog, Absence, Team, UserTeam, AuditLog } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { auditLogger } = require('../utils/auditLogger');

const router = express.Router();

// Middleware: только для администраторов
router.use(authenticateToken);
router.use(requireRole(['admin']));

/**
 * Middleware для проверки роли администратора
 */
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      error: 'Доступ разрешен только администраторам' 
    });
  }
  next();
};

/**
 * GET /api/telegram-admin/employees
 * Получить список всех сотрудников для Telegram админки
 */
router.get('/employees', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const employees = await User.findAll({
      where: {
        role: ['employee', 'manager']
      },
      attributes: [
        'id', 'name', 'username', 'role', 'status', 'telegramId',
        'telegramUsername', 'telegramFirstName', 'telegramLastName',
        'createdViaTelegram', 'lastLogin'
      ],
      include: [
        // Сегодняшние логи работы
        {
          model: WorkLog,
          as: 'workLogs',
          where: {
            date: today
          },
          required: false,
          attributes: ['id', 'status', 'startTime', 'endTime', 'breakMinutes', 'description']
        },
        // Активные отпуска
        {
          model: Absence,
          as: 'absences',
          where: {
            status: 'approved',
            startDate: { [Op.lte]: today },
            endDate: { [Op.gte]: today }
          },
          required: false,
          attributes: ['id', 'type', 'startDate', 'endDate']
        }
      ],
      order: [['name', 'ASC']]
    });

    // Подготавливаем данные для мобильного интерфейса
    const employeesData = employees.map(employee => {
      const todayLog = employee.workLogs[0];
      const activeAbsence = employee.absences[0];
      
      let workStatus = 'not_worked';
      let statusText = 'Не отметился';
      let statusColor = 'gray';
      
      if (activeAbsence) {
        workStatus = 'absent';
        statusText = getAbsenceText(activeAbsence.type);
        statusColor = 'blue';
      } else if (todayLog) {
        switch (todayLog.status) {
          case 'working':
            workStatus = 'working';
            statusText = 'Работает';
            statusColor = 'green';
            break;
          case 'worked':
            workStatus = 'worked';
            statusText = 'Работал';
            statusColor = 'green';
            break;
          case 'not_worked':
          default:
            workStatus = 'not_worked';
            statusText = 'Не работал';
            statusColor = 'red';
            break;
        }
      }
      
      return {
        id: employee.id,
        name: employee.name,
        username: employee.username,
        role: employee.role,
        status: employee.status,
        telegram: {
          id: employee.telegramId,
          username: employee.telegramUsername,
          firstName: employee.telegramFirstName,
          lastName: employee.telegramLastName,
          createdVia: employee.createdViaTelegram
        },
        workStatus,
        statusText,
        statusColor,
        lastLogin: employee.lastLogin,
        todayLog: todayLog ? {
          id: todayLog.id,
          startTime: todayLog.startTime,
          endTime: todayLog.endTime,
          breakMinutes: todayLog.breakMinutes,
          description: todayLog.description
        } : null,
        activeAbsence: activeAbsence ? {
          id: activeAbsence.id,
          type: activeAbsence.type,
          startDate: activeAbsence.startDate,
          endDate: activeAbsence.endDate
        } : null
      };
    });

    // // console.log(`📋 Telegram admin: загружен список из ${employeesData.length} сотрудников`);

    res.json({
      employees: employeesData,
      summary: {
        total: employeesData.length,
        working: employeesData.filter(e => e.workStatus === 'working').length,
        worked: employeesData.filter(e => e.workStatus === 'worked').length,
        absent: employeesData.filter(e => e.workStatus === 'absent').length,
        notWorked: employeesData.filter(e => e.workStatus === 'not_worked').length
      }
    });

  } catch (error) {
    console.error('❌ Ошибка получения списка сотрудников:', error);
    res.status(500).json({ error: 'Ошибка сервера при получении данных' });
  }
});

/**
 * GET /api/telegram-admin/logs/today
 * Подробные логи работы за сегодня
 */
router.get('/logs/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const logs = await WorkLog.findAll({
      where: { date: today },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'username', 'telegramFirstName', 'telegramLastName']
        }
      ],
      order: [['updatedAt', 'DESC']]
    });

    const logsData = logs.map(log => ({
      id: log.id,
      user: {
        id: log.user.id,
        name: log.user.name,
        username: log.user.username,
        telegramName: `${log.user.telegramFirstName || ''} ${log.user.telegramLastName || ''}`.trim()
      },
      status: log.status,
      startTime: log.startTime,
      endTime: log.endTime,
      breakMinutes: log.breakMinutes,
      description: log.description,
      workingMinutes: log.workingMinutes,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt
    }));

    res.json({ logs: logsData });

  } catch (error) {
    console.error('❌ Ошибка получения логов за сегодня:', error);
    res.status(500).json({ error: 'Ошибка сервера при получении логов' });
  }
});

/**
 * PATCH /api/telegram-admin/logs/:id
 * Редактирование лога работы
 */
router.patch('/logs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, startTime, endTime, breakMinutes, description } = req.body;

    const log = await WorkLog.findByPk(id, {
      include: [{ model: User, as: 'user', attributes: ['name'] }]
    });

    if (!log) {
      return res.status(404).json({ error: 'Лог не найден' });
    }

    const oldData = {
      status: log.status,
      startTime: log.startTime,
      endTime: log.endTime,
      breakMinutes: log.breakMinutes,
      description: log.description
    };

    // Обновляем лог
    await log.update({
      status,
      startTime,
      endTime,
      breakMinutes,
      description
    });

    // Логируем изменение
    await auditLogger.logUserAction(req.user.id, 'admin_edit_worklog', {
      logId: id,
      targetUser: log.user.name,
      oldData,
      newData: { status, startTime, endTime, breakMinutes, description },
      via: 'telegram_admin'
    });

    // // console.log(`✏️ Админ ${req.user.username} отредактировал лог ${id} пользователя ${log.user.name}`);

    res.json({
      message: 'Лог успешно обновлен',
      log: {
        id: log.id,
        status: log.status,
        startTime: log.startTime,
        endTime: log.endTime,
        breakMinutes: log.breakMinutes,
        description: log.description
      }
    });

  } catch (error) {
    console.error('❌ Ошибка редактирования лога:', error);
    res.status(500).json({ error: 'Ошибка сервера при редактировании лога' });
  }
});

/**
 * POST /api/telegram-admin/users/:id/disable
 * Отключить сотрудника
 */
router.post('/users/:id/disable', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Нельзя отключить администратора' });
    }

    await user.update({ status: 'suspended' });

    await auditLogger.logUserAction(req.user.id, 'admin_disable_user', {
      targetUserId: id,
      targetUserName: user.name,
      reason: reason || 'Не указана',
      via: 'telegram_admin'
    });

    // // console.log(`🚫 Админ ${req.user.username} отключил пользователя ${user.name}`);

    res.json({
      message: `Пользователь ${user.name} отключен`,
      user: {
        id: user.id,
        name: user.name,
        status: user.status
      }
    });

  } catch (error) {
    console.error('❌ Ошибка отключения пользователя:', error);
    res.status(500).json({ error: 'Ошибка сервера при отключении пользователя' });
  }
});

/**
 * POST /api/telegram-admin/users/:id/enable
 * Включить сотрудника
 */
router.post('/users/:id/enable', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    await user.update({ status: 'active' });

    await auditLogger.logUserAction(req.user.id, 'admin_enable_user', {
      targetUserId: id,
      targetUserName: user.name,
      via: 'telegram_admin'
    });

    // // console.log(`✅ Админ ${req.user.username} включил пользователя ${user.name}`);

    res.json({
      message: `Пользователь ${user.name} включен`,
      user: {
        id: user.id,
        name: user.name,
        status: user.status
      }
    });

  } catch (error) {
    console.error('❌ Ошибка включения пользователя:', error);
    res.status(500).json({ error: 'Ошибка сервера при включении пользователя' });
  }
});

/**
 * GET /api/telegram-admin/stats
 * Статистика для админа
 */
router.get('/stats', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const weekStart = startOfWeek.toISOString().split('T')[0];

    // Сегодняшняя статистика
    const todayStats = await WorkLog.findAll({
      where: { date: today },
      include: [{ model: User, as: 'user' }]
    });

    // Недельная статистика
    const weekStats = await WorkLog.findAll({
      where: {
        date: { [Op.gte]: weekStart }
      }
    });

    // Пользователи
    const totalUsers = await User.count({
      where: { role: ['employee', 'manager'] }
    });

    const activeUsers = await User.count({
      where: { 
        role: ['employee', 'manager'],
        status: 'active'
      }
    });

    res.json({
      today: {
        totalLogs: todayStats.length,
        working: todayStats.filter(log => log.status === 'working').length,
        worked: todayStats.filter(log => log.status === 'worked').length,
        notWorked: todayStats.filter(log => log.status === 'not_worked').length
      },
      week: {
        totalLogs: weekStats.length,
        uniqueUsers: new Set(weekStats.map(log => log.userId)).size
      },
      users: {
        total: totalUsers,
        active: activeUsers,
        suspended: totalUsers - activeUsers
      }
    });

  } catch (error) {
    console.error('❌ Ошибка получения статистики:', error);
    res.status(500).json({ error: 'Ошибка сервера при получении статистики' });
  }
});

/**
 * DELETE /api/telegram-admin/logs/:id
 * Удалить лог работы
 */
router.delete('/logs/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const log = await WorkLog.findByPk(id, {
      include: [{ model: User, as: 'user', attributes: ['name'] }]
    });

    if (!log) {
      return res.status(404).json({ error: 'Лог не найден' });
    }

    const logData = {
      id: log.id,
      userId: log.userId,
      userName: log.user.name,
      date: log.date,
      status: log.status
    };

    await log.destroy();

    await auditLogger.logUserAction(req.user.id, 'admin_delete_worklog', {
      deletedLog: logData,
      via: 'telegram_admin'
    });

    // // console.log(`🗑️ Админ ${req.user.username} удалил лог ${id} пользователя ${log.user.name}`);

    res.json({ message: 'Лог успешно удален' });

  } catch (error) {
    console.error('❌ Ошибка удаления лога:', error);
    res.status(500).json({ error: 'Ошибка сервера при удалении лога' });
  }
});

// Вспомогательная функция для текста отпуска
function getAbsenceText(type) {
  const texts = {
    vacation: 'В отпуске',
    sick: 'На больничном',
    business_trip: 'В командировке',
    day_off: 'Выходной'
  };
  return texts[type] || 'Отсутствует';
}

/**
 * GET /api/telegram-admin/users
 * Получение списка пользователей с пагинацией и фильтрацией
 */
router.get('/users', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      role, 
      team, 
      search,
      status = 'active' 
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    // Фильтры
    if (role && role !== 'all') {
      where.role = role;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (search) {
      where[Op.or] = [
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } },
        { username: { [Op.like]: `%${search}%` } },
        { telegramId: { [Op.like]: `%${search}%` } }
      ];
    }

    const include = [
      {
        model: Team,
        as: 'teams',
        through: { attributes: [] },
        required: false
      }
    ];

    // Фильтр по команде
    if (team && team !== 'all') {
      include[0].where = { id: team };
      include[0].required = true;
    }

    const { count, rows: users } = await User.findAndCountAll({
      where,
      include,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      distinct: true
    });

    // Форматируем данные
    const formattedUsers = users.map(user => ({
      id: user.id,
      telegramId: user.telegramId,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      role: user.role,
      status: user.status,
      teams: user.teams?.map(team => ({
        id: team.id,
        name: team.name
      })) || [],
      createdAt: user.createdAt,
      lastActivity: user.updatedAt
    }));

    res.json({
      success: true,
      data: {
        users: formattedUsers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    console.error('Ошибка получения пользователей:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения пользователей'
    });
  }
});

/**
 * GET /api/telegram-admin/teams
 * Получение списка команд
 */
router.get('/teams', authenticateToken, isAdmin, async (req, res) => {
  try {
    const teams = await Team.findAll({
      include: [
        {
          model: User,
          as: 'members',
          through: { attributes: [] },
          attributes: ['id', 'firstName', 'lastName', 'role', 'status']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const formattedTeams = teams.map(team => ({
      id: team.id,
      name: team.name,
      memberCount: team.members?.length || 0,
      members: team.members?.map(member => ({
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        role: member.role,
        status: member.status
      })) || [],
      createdAt: team.createdAt
    }));

    res.json({
      success: true,
      data: formattedTeams
    });

  } catch (error) {
    console.error('Ошибка получения команд:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения команд'
    });
  }
});

/**
 * PATCH /api/telegram-admin/users/:id/role
 * Изменение роли пользователя
 */
router.patch('/users/:id/role', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ['employee', 'manager', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Недопустимая роль'
      });
    }

    // Проверяем, что администратор не меняет роль самому себе
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Нельзя изменить роль самому себе'
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }

    const oldRole = user.role;
    await user.update({ role });

    // Записываем в аудит
    await AuditLog.create({
      action: 'user_role_changed',
      userId: req.user.id,
      targetUserId: user.id,
      details: {
        oldRole,
        newRole: role,
        userName: `${user.firstName} ${user.lastName}`
      }
    });

    // Эмитируем событие повышения
    if (global.emitEvent) {
      global.emitEvent('user.promoted', {
        telegramId: user.telegramId,
        firstName: user.firstName,
        lastName: user.lastName,
        oldRole,
        newRole: role,
        promotedBy: {
          firstName: req.user.firstName,
          lastName: req.user.lastName
        }
      });
    }

    res.json({
      success: true,
      message: 'Роль пользователя успешно изменена',
      data: {
        userId: user.id,
        oldRole,
        newRole: role
      }
    });

  } catch (error) {
    console.error('Ошибка изменения роли:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка изменения роли'
    });
  }
});

/**
 * PATCH /api/telegram-admin/users/:id/team
 * Изменение команды пользователя
 */
router.patch('/users/:id/team', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { teamId, action = 'set' } = req.body; // set, add, remove

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }

    let team = null;
    if (teamId) {
      team = await Team.findByPk(teamId);
      if (!team) {
        return res.status(404).json({
          success: false,
          error: 'Команда не найдена'
        });
      }
    }

    // Выполняем действие
    switch (action) {
      case 'set':
        // Удаляем из всех команд и добавляем в новую
        await user.setTeams(teamId ? [teamId] : []);
        break;
      case 'add':
        if (teamId) {
          await user.addTeam(teamId);
        }
        break;
      case 'remove':
        if (teamId) {
          await user.removeTeam(teamId);
        }
        break;
    }

    // Записываем в аудит
    await AuditLog.create({
      action: 'user_team_changed',
      userId: req.user.id,
      targetUserId: user.id,
      details: {
        action,
        teamId,
        teamName: team?.name,
        userName: `${user.firstName} ${user.lastName}`
      }
    });

    res.json({
      success: true,
      message: 'Команда пользователя успешно изменена',
      data: {
        userId: user.id,
        action,
        teamId,
        teamName: team?.name
      }
    });

  } catch (error) {
    console.error('Ошибка изменения команды:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка изменения команды'
    });
  }
});

/**
 * POST /api/telegram-admin/teams
 * Создание новой команды
 */
router.post('/teams', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Название команды должно содержать минимум 2 символа'
      });
    }

    // Проверяем уникальность имени
    const existingTeam = await Team.findOne({ where: { name: name.trim() } });
    if (existingTeam) {
      return res.status(400).json({
        success: false,
        error: 'Команда с таким названием уже существует'
      });
    }

    const team = await Team.create({
      name: name.trim(),
      description: description?.trim() || null
    });

    // Записываем в аудит (если пользователь определён)
    if (req.user && req.user.id) {
      await AuditLog.create({
        action: 'team_created',
        userId: req.user.id,
        details: {
          teamId: team.id,
          teamName: team.name
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Команда успешно создана',
      data: {
        id: team.id,
        name: team.name,
        description: team.description,
        createdAt: team.createdAt
      }
    });

  } catch (error) {
    console.error('Ошибка создания команды:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка создания команды'
    });
  }
});

/**
 * DELETE /api/telegram-admin/teams/:id
 * Удаление команды
 */
router.delete('/teams/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const team = await Team.findByPk(id, {
      include: [
        {
          model: User,
          as: 'members',
          through: { attributes: [] }
        }
      ]
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Команда не найдена'
      });
    }

    // Проверяем, есть ли участники
    if (team.members && team.members.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Нельзя удалить команду с участниками. Сначала переместите пользователей в другие команды.'
      });
    }

    await team.destroy();

    // Записываем в аудит
    await AuditLog.create({
      action: 'team_deleted',
      userId: req.user.id,
      details: {
        teamId: team.id,
        teamName: team.name
      }
    });

    res.json({
      success: true,
      message: 'Команда успешно удалена'
    });

  } catch (error) {
    console.error('Ошибка удаления команды:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка удаления команды'
    });
  }
});

/**
 * GET /api/telegram-admin/stats
 * Статистика для администратора
 */
router.get('/stats', authenticateToken, isAdmin, async (req, res) => {
  try {
    const [totalUsers, totalTeams, activeUsers] = await Promise.all([
      User.count(),
      Team.count(),
      User.count({ where: { status: 'active' } })
    ]);

    const roleStats = await User.findAll({
      attributes: [
        'role',
        [User.sequelize.fn('COUNT', User.sequelize.col('id')), 'count']
      ],
      group: 'role'
    });

    const formattedRoleStats = roleStats.reduce((acc, stat) => {
      acc[stat.role] = parseInt(stat.get('count'));
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        totalUsers,
        totalTeams,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        roleDistribution: {
          admin: formattedRoleStats.admin || 0,
          manager: formattedRoleStats.manager || 0,
          employee: formattedRoleStats.employee || 0
        }
      }
    });

  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения статистики'
    });
  }
});

module.exports = router; 