const { AuditLog } = require('../models');

/**
 * Класс для логирования действий пользователей
 */
class AuditLogger {
  /**
   * Логирует действие пользователя
   * @param {Object} params - параметры для логирования
   * @param {number} params.adminId - ID администратора выполняющего действие
   * @param {number} params.userId - ID пользователя над которым выполняется действие (может быть null)
   * @param {string} params.action - тип действия (create, update, delete, login, export, etc.)
   * @param {string} params.resource - ресурс (users, teams, work_logs, reports)
   * @param {string} params.resourceId - ID ресурса
   * @param {string} params.description - описание действия
   * @param {Object} params.oldValues - старые значения (для update)
   * @param {Object} params.newValues - новые значения
   * @param {string} params.ipAddress - IP адрес
   * @param {string} params.userAgent - User Agent
   * @param {Object} params.metadata - дополнительные данные
   */
  static async log({
    adminId,
    userId = null,
    action,
    resource,
    resourceId = null,
    description,
    oldValues = null,
    newValues = null,
    ipAddress = null,
    userAgent = null,
    metadata = {}
  }) {
    try {
      await AuditLog.create({
        adminId,
        userId,
        action,
        resource,
        resourceId: resourceId?.toString(),
        description,
        oldValues,
        newValues,
        ipAddress,
        userAgent,
        metadata
      });
      
      // // console.log(`📝 Аудит лог: ${action} ${resource} by admin ${adminId}`);
    } catch (error) {
      console.error('❌ Ошибка записи аудит лога:', error);
      // Не прерываем выполнение основного действия
    }
  }

  /**
   * Логирует создание пользователя
   */
  static async logUserCreated(adminId, newUser, req) {
    return this.log({
      adminId,
      action: 'create',
      resource: 'users',
      resourceId: newUser.id,
      description: `Создан новый пользователь: ${newUser.name} (${newUser.username})`,
      newValues: {
        id: newUser.id,
        name: newUser.name,
        username: newUser.username,
        role: newUser.role,
        status: newUser.status
      },
      ipAddress: req?.clientIP,
      userAgent: req?.userAgent
    });
  }

  /**
   * Логирует обновление пользователя
   */
  static async logUserUpdated(adminId, userId, oldValues, newValues, req) {
    const changes = this.getChangedFields(oldValues, newValues);
    
    return this.log({
      adminId,
      userId,
      action: 'update',
      resource: 'users',
      resourceId: userId,
      description: `Обновлены данные пользователя. Изменения: ${changes.join(', ')}`,
      oldValues,
      newValues,
      ipAddress: req?.clientIP,
      userAgent: req?.userAgent,
      metadata: { changedFields: changes }
    });
  }

  /**
   * Логирует деактивацию пользователя
   */
  static async logUserDeactivated(adminId, userId, userInfo, req) {
    return this.log({
      adminId,
      userId,
      action: 'deactivate',
      resource: 'users',
      resourceId: userId,
      description: `Деактивирован пользователь: ${userInfo.name} (${userInfo.username})`,
      oldValues: { status: 'active' },
      newValues: { status: 'inactive' },
      ipAddress: req?.clientIP,
      userAgent: req?.userAgent
    });
  }

  /**
   * Логирует создание команды
   */
  static async logTeamCreated(adminId, newTeam, req) {
    return this.log({
      adminId,
      action: 'create',
      resource: 'teams',
      resourceId: newTeam.id,
      description: `Создана новая команда: ${newTeam.name}`,
      newValues: {
        id: newTeam.id,
        name: newTeam.name,
        managerId: newTeam.managerId,
        status: newTeam.status
      },
      ipAddress: req?.clientIP,
      userAgent: req?.userAgent
    });
  }

  /**
   * Логирует изменение состава команды
   */
  static async logTeamMembershipChanged(adminId, teamId, userId, action, req) {
    const actions = {
      add: 'Добавлен в команду',
      remove: 'Удалён из команды',
      role_change: 'Изменена роль в команде'
    };

    return this.log({
      adminId,
      userId,
      action: `team_${action}`,
      resource: 'teams',
      resourceId: teamId,
      description: `${actions[action]} пользователь ID: ${userId}`,
      ipAddress: req?.clientIP,
      userAgent: req?.userAgent,
      metadata: { teamId, memberAction: action }
    });
  }

  /**
   * Логирует редактирование рабочего лога
   */
  static async logWorkLogEdited(adminId, userId, workLogId, oldValues, newValues, req) {
    const changes = this.getChangedFields(oldValues, newValues);
    
    return this.log({
      adminId,
      userId,
      action: 'update',
      resource: 'work_logs',
      resourceId: workLogId,
      description: `Отредактирован рабочий лог. Изменения: ${changes.join(', ')}`,
      oldValues,
      newValues,
      ipAddress: req?.clientIP,
      userAgent: req?.userAgent,
      metadata: { changedFields: changes }
    });
  }

  /**
   * Логирует экспорт отчёта
   */
  static async logReportExported(adminId, reportType, params, req) {
    return this.log({
      adminId,
      action: 'export',
      resource: 'reports',
      description: `Экспортирован отчёт: ${reportType}`,
      ipAddress: req?.clientIP,
      userAgent: req?.userAgent,
      metadata: {
        reportType,
        exportParams: params
      }
    });
  }

  /**
   * Логирует вход в систему
   */
  static async logLogin(userId, req) {
    return this.log({
      adminId: userId,
      action: 'login',
      resource: 'auth',
      description: 'Вход в систему',
      ipAddress: req?.clientIP,
      userAgent: req?.userAgent
    });
  }

  /**
   * Определяет изменённые поля
   */
  static getChangedFields(oldValues, newValues) {
    const changes = [];
    
    for (const key in newValues) {
      if (oldValues[key] !== newValues[key]) {
        changes.push(key);
      }
    }
    
    return changes;
  }

  /**
   * Получает логи с фильтрацией
   */
  static async getLogs({
    adminId = null,
    userId = null,
    resource = null,
    action = null,
    startDate = null,
    endDate = null,
    limit = 50,
    offset = 0
  }) {
    const where = {};
    
    if (adminId) where.adminId = adminId;
    if (userId) where.userId = userId;
    if (resource) where.resource = resource;
    if (action) where.action = action;
    
    if (startDate && endDate) {
      where.createdAt = {
        [require('sequelize').Op.between]: [startDate, endDate]
      };
    }

    const { rows: logs, count } = await AuditLog.findAndCountAll({
      where,
      include: [
        {
          model: require('../models').User,
          as: 'admin',
          attributes: ['id', 'name', 'username']
        },
        {
          model: require('../models').User,
          as: 'user',
          attributes: ['id', 'name', 'username'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    return { logs, total: count };
  }

  // Операции с отсутствиями
  static async logAbsenceCreated(userId, absenceId, req) {
    return this.log({
      adminId: userId,
      userId,
      action: 'create',
      resource: 'absences',
      resourceId: absenceId,
      description: `Создана заявка на отсутствие #${absenceId}`,
      ipAddress: req?.clientIP,
      userAgent: req?.userAgent,
      metadata: { absenceId }
    });
  }

  static async logAbsenceApproved(adminId, absenceId, req) {
    return this.log({
      adminId,
      action: 'approve',
      resource: 'absences',
      resourceId: absenceId,
      description: `Одобрена заявка на отсутствие #${absenceId}`,
      oldValues: { status: 'pending' },
      newValues: { status: 'approved' },
      ipAddress: req?.clientIP,
      userAgent: req?.userAgent,
      metadata: { absenceId, action: 'approve' }
    });
  }

  static async logAbsenceRejected(adminId, absenceId, reason, req) {
    return this.log({
      adminId,
      action: 'reject',
      resource: 'absences',
      resourceId: absenceId,
      description: `Отклонена заявка на отсутствие #${absenceId}. Причина: ${reason}`,
      oldValues: { status: 'pending' },
      newValues: { status: 'rejected', rejectionReason: reason },
      ipAddress: req?.clientIP,
      userAgent: req?.userAgent,
      metadata: { absenceId, action: 'reject', reason }
    });
  }

  static async logAbsenceDeleted(adminId, absenceId, req) {
    return this.log({
      adminId,
      action: 'delete',
      resource: 'absences',
      resourceId: absenceId,
      description: `Удалена заявка на отсутствие #${absenceId}`,
      ipAddress: req?.clientIP,
      userAgent: req?.userAgent,
      metadata: { absenceId }
    });
  }
}

module.exports = AuditLogger; 