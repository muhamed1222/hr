const express = require('express');
const { Op } = require('sequelize');
const moment = require('moment');
const { User, Absence, Team, UserTeam, WorkLog } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const checkAbsencePermissions = require('../middleware/absencePermissions');
const AuditLogger = require('../utils/auditLogger');

const router = express.Router();

// Применяем аутентификацию ко всем маршрутам
router.use(authenticateToken);

/**
 * GET /api/absences - Получить список заявок на отсутствие
 */
router.get('/', checkAbsencePermissions.canView, async (req, res) => {
  try {
    const {
      userId,
      teamId,
      type,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};
    const includeClause = [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'username', 'role']
      },
      {
        model: User,
        as: 'approver',
        attributes: ['id', 'name', 'username'],
        required: false
      }
    ];

    // Фильтры
    if (userId) {
      whereClause.userId = userId;
    }
    
    if (type) {
      whereClause.type = type;
    }
    
    if (status) {
      whereClause.status = status;
    }
    
    if (startDate || endDate) {
      whereClause[Op.or] = [];
      if (startDate) {
        whereClause[Op.or].push({
          startDate: { [Op.gte]: startDate }
        });
      }
      if (endDate) {
        whereClause[Op.or].push({
          endDate: { [Op.lte]: endDate }
        });
      }
    }

    // Фильтр по команде
    if (teamId) {
      includeClause[0].include = [{
        model: Team,
        as: 'teams',
        where: { id: teamId },
        through: { attributes: [] }
      }];
    }

    const { count, rows } = await Absence.findAndCountAll({
      where: whereClause,
      include: includeClause,
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: offset,
      distinct: true
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Ошибка получения заявок:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения заявок'
    });
  }
});

/**
 * GET /api/absences/:id - Получить конкретную заявку
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const absence = await Absence.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'username', 'role']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'name', 'username'],
          required: false
        }
      ]
    });

    if (!absence) {
      return res.status(404).json({
        success: false,
        message: 'Заявка не найдена'
      });
    }

    // Проверка доступа
    if (user.role === 'employee' && absence.userId !== user.id) {
      return res.status(403).json({
        success: false,
        message: 'Доступ запрещен'
      });
    }

    if (user.role === 'manager') {
      const userTeams = await UserTeam.findAll({
        where: { userId: absence.userId },
        include: [{
          model: Team,
          as: 'team',
          where: { managerId: user.id }
        }]
      });
      
      if (userTeams.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Доступ запрещен'
        });
      }
    }

    res.json({
      success: true,
      data: absence
    });

  } catch (error) {
    console.error('Ошибка получения заявки:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения заявки'
    });
  }
});

/**
 * POST /api/absences - Создать заявку на отсутствие
 */
router.post('/', checkAbsencePermissions.canCreate, async (req, res) => {
  try {
    const user = req.user;
    const { type, startDate, endDate, reason } = req.body;

    // Валидация
    if (!type || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Обязательные поля: type, startDate, endDate'
      });
    }

    // Проверяем корректность дат
    const start = moment(startDate);
    const end = moment(endDate);
    
    if (!start.isValid() || !end.isValid()) {
      return res.status(400).json({
        success: false,
        message: 'Некорректный формат даты'
      });
    }
    
    if (start.isAfter(end)) {
      return res.status(400).json({
        success: false,
        message: 'Дата начала не может быть позже даты окончания'
      });
    }

    // Проверяем пересечения с существующими заявками
    const existingAbsences = await Absence.findAll({
      where: {
        userId: user.id,
        status: { [Op.in]: ['pending', 'approved'] },
        [Op.or]: [
          {
            startDate: { [Op.between]: [startDate, endDate] }
          },
          {
            endDate: { [Op.between]: [startDate, endDate] }
          },
          {
            [Op.and]: [
              { startDate: { [Op.lte]: startDate } },
              { endDate: { [Op.gte]: endDate } }
            ]
          }
        ]
      }
    });

    if (existingAbsences.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'На указанные даты уже есть заявка'
      });
    }

    // Создаем заявку
    const absence = await Absence.create({
      userId: user.id,
      type,
      startDate,
      endDate,
      reason: reason || null
    });

    // Загружаем созданную заявку с пользователем
    const createdAbsence = await Absence.findByPk(absence.id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'username']
      }]
    });

    // Логируем создание
    await AuditLogger.logAbsenceCreated(user.id, absence.id, req);

    // Уведомляем менеджеров
    try {
      await notifyManagersAboutNewRequest(user, absence);
    } catch (notificationError) {
      console.error('Ошибка отправки уведомления:', notificationError);
    }

    res.status(201).json({
      success: true,
      data: createdAbsence,
      message: 'Заявка успешно создана'
    });

  } catch (error) {
    console.error('Ошибка создания заявки:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка создания заявки'
    });
  }
});

/**
 * PATCH /api/absences/:id/approve - Одобрить заявку
 */
router.patch('/:id/approve', checkAbsencePermissions.canApprove, async (req, res) => {
  try {
    const { id } = req.params;
    const approver = req.user;

    const absence = await Absence.findByPk(id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'username', 'telegramId', 'vacationDays']
      }]
    });

    if (!absence) {
      return res.status(404).json({
        success: false,
        message: 'Заявка не найдена'
      });
    }

    if (absence.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Заявка уже рассмотрена'
      });
    }

    // Проверяем баланс отпускных дней для отпуска
    if (absence.type === 'vacation') {
      const currentUser = await User.findByPk(absence.userId);
      if (currentUser.vacationDays < absence.daysCount) {
        return res.status(400).json({
          success: false,
          message: `Недостаточно дней отпуска. Доступно: ${currentUser.vacationDays}, требуется: ${absence.daysCount}`
        });
      }
    }

    // Одобряем заявку
    await absence.update({
      status: 'approved',
      approvedBy: approver.id,
      approvedAt: new Date()
    });

    // Списываем дни отпуска
    if (absence.type === 'vacation') {
      await User.update(
        { vacationDays: absence.user.vacationDays - absence.daysCount },
        { where: { id: absence.userId } }
      );
    }

    // Создаем записи в work_logs для каждого дня отсутствия
    await createWorkLogsForAbsence(absence);

    // Логируем одобрение
    await AuditLogger.logAbsenceApproved(approver.id, absence.id, req);

    // Уведомляем сотрудника
    try {
      await notifyUserAboutDecision(absence.user, absence, 'approved');
    } catch (notificationError) {
      console.error('Ошибка отправки уведомления:', notificationError);
    }

    const updatedAbsence = await Absence.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'username']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'name', 'username']
        }
      ]
    });

    res.json({
      success: true,
      data: updatedAbsence,
      message: 'Заявка одобрена'
    });

  } catch (error) {
    console.error('Ошибка одобрения заявки:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка одобрения заявки'
    });
  }
});

/**
 * PATCH /api/absences/:id/reject - Отклонить заявку
 */
router.patch('/:id/reject', checkAbsencePermissions.canApprove, async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const approver = req.user;

    const absence = await Absence.findByPk(id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'username', 'telegramId']
      }]
    });

    if (!absence) {
      return res.status(404).json({
        success: false,
        message: 'Заявка не найдена'
      });
    }

    if (absence.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Заявка уже рассмотрена'
      });
    }

    // Отклоняем заявку
    await absence.update({
      status: 'rejected',
      approvedBy: approver.id,
      approvedAt: new Date(),
      rejectionReason: rejectionReason || 'Не указана'
    });

    // Логируем отклонение
    await AuditLogger.logAbsenceRejected(approver.id, absence.id, rejectionReason, req);

    // Уведомляем сотрудника
    try {
      await notifyUserAboutDecision(absence.user, absence, 'rejected', rejectionReason);
    } catch (notificationError) {
      console.error('Ошибка отправки уведомления:', notificationError);
    }

    const updatedAbsence = await Absence.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'username']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'name', 'username']
        }
      ]
    });

    res.json({
      success: true,
      data: updatedAbsence,
      message: 'Заявка отклонена'
    });

  } catch (error) {
    console.error('Ошибка отклонения заявки:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка отклонения заявки'
    });
  }
});

/**
 * DELETE /api/absences/:id - Удалить заявку
 */
router.delete('/:id', checkAbsencePermissions.canEdit, async (req, res) => {
  try {
    const { id } = req.params;

    const absence = await Absence.findByPk(id);

    if (!absence) {
      return res.status(404).json({
        success: false,
        message: 'Заявка не найдена'
      });
    }

    // Нельзя удалять одобренные заявки
    if (absence.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Нельзя удалить одобренную заявку'
      });
    }

    await absence.destroy();

    // Логируем удаление
    await AuditLogger.logAbsenceDeleted(req.user.id, id, req);

    res.json({
      success: true,
      message: 'Заявка удалена'
    });

  } catch (error) {
    console.error('Ошибка удаления заявки:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка удаления заявки'
    });
  }
});

/**
 * Вспомогательные функции
 */

// Создание записей в work_logs для одобренного отсутствия
async function createWorkLogsForAbsence(absence) {
  const startDate = moment(absence.startDate);
  const endDate = moment(absence.endDate);
  const workLogs = [];

  let currentDate = startDate.clone();
  while (currentDate.isSameOrBefore(endDate)) {
    // Пропускаем выходные (суббота = 6, воскресенье = 0)
    if (currentDate.day() !== 0 && currentDate.day() !== 6) {
      workLogs.push({
        userId: absence.userId,
        workDate: currentDate.format('YYYY-MM-DD'),
        workMode: 'absent',
        dailyReport: `${getAbsenceTypeText(absence.type)} (заявка #${absence.id})`,
        totalMinutes: 0,
        arrivedAt: null,
        leftAt: null,
        lunchStart: null,
        lunchEnd: null
      });
    }
    currentDate.add(1, 'day');
  }

  if (workLogs.length > 0) {
    await WorkLog.bulkCreate(workLogs, {
      updateOnDuplicate: ['workMode', 'dailyReport']
    });
  }
}

// Получение текста типа отсутствия
function getAbsenceTypeText(type) {
  const types = {
    vacation: 'Отпуск',
    sick: 'Больничный',
    business_trip: 'Командировка',
    day_off: 'Отгул'
  };
  return types[type] || type;
}

// Уведомление менеджеров о новой заявке
async function notifyManagersAboutNewRequest(user, absence) {
  // TODO: Реализовать Telegram уведомления
  console.log(`Новая заявка от ${user.name}: ${getAbsenceTypeText(absence.type)} с ${absence.startDate} по ${absence.endDate}`);
}

// Уведомление пользователя о решении
async function notifyUserAboutDecision(user, absence, decision, reason = null) {
  // TODO: Реализовать Telegram уведомления
  const status = decision === 'approved' ? 'одобрена' : 'отклонена';
  console.log(`Заявка ${user.name} ${status}. ${reason ? `Причина: ${reason}` : ''}`);
}

module.exports = router; 