const { User, Team, UserTeam, Absence } = require('../models');

/**
 * Проверка разрешений для работы с отсутствиями
 */
const checkAbsencePermissions = {
  
  /**
   * Может ли пользователь создавать заявки на отсутствие
   */
  canCreate: async (req, res, next) => {
    try {
      const user = req.user;
      
      // Все авторизованные пользователи могут создавать заявки
      if (!user || user.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Доступ запрещен'
        });
      }
      
      next();
    } catch (error) {
      console.error('Ошибка проверки разрешений на создание:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка проверки разрешений'
      });
    }
  },
  
  /**
   * Может ли пользователь просматривать заявки
   */
  canView: async (req, res, next) => {
    try {
      const user = req.user;
      const { userId, teamId } = req.query;
      
      if (user.role === 'admin') {
        // Админы видят все
        return next();
      }
      
      if (user.role === 'manager') {
        // Менеджеры видят заявки своих команд
        if (teamId) {
          const team = await Team.findByPk(teamId);
          if (!team || team.managerId !== user.id) {
            return res.status(403).json({
              success: false,
              message: 'Нет доступа к данной команде'
            });
          }
        } else if (userId) {
          // Проверяем, что пользователь в команде менеджера
          const userTeams = await UserTeam.findAll({
            where: { userId },
            include: [{
              model: Team,
              as: 'team',
              where: { managerId: user.id }
            }]
          });
          
          if (userTeams.length === 0) {
            return res.status(403).json({
              success: false,
              message: 'Нет доступа к данному пользователю'
            });
          }
        }
        
        return next();
      }
      
      // Обычные сотрудники видят только свои заявки
      if (userId && parseInt(userId) !== user.id) {
        return res.status(403).json({
          success: false,
          message: 'Доступ только к собственным заявкам'
        });
      }
      
      // Устанавливаем фильтр на собственные заявки
      req.query.userId = user.id;
      next();
      
    } catch (error) {
      console.error('Ошибка проверки разрешений на просмотр:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка проверки разрешений'
      });
    }
  },
  
  /**
   * Может ли пользователь одобрять/отклонять заявки
   */
  canApprove: async (req, res, next) => {
    try {
      const user = req.user;
      const absenceId = req.params.id;
      
      if (user.role === 'admin') {
        // Админы могут одобрять все
        return next();
      }
      
      if (user.role !== 'manager') {
        return res.status(403).json({
          success: false,
          message: 'Только менеджеры и админы могут одобрять заявки'
        });
      }
      
      // Менеджеры могут одобрять только заявки своих подчиненных
      const absence = await Absence.findByPk(absenceId, {
        include: [{
          model: User,
          as: 'user'
        }]
      });
      
      if (!absence) {
        return res.status(404).json({
          success: false,
          message: 'Заявка не найдена'
        });
      }
      
      // Проверяем, что пользователь из команды менеджера
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
          message: 'Нет права одобрять заявки данного сотрудника'
        });
      }
      
      next();
      
    } catch (error) {
      console.error('Ошибка проверки разрешений на одобрение:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка проверки разрешений'
      });
    }
  },
  
  /**
   * Может ли пользователь редактировать/удалять заявку
   */
  canEdit: async (req, res, next) => {
    try {
      const user = req.user;
      const absenceId = req.params.id;
      
      const absence = await Absence.findByPk(absenceId);
      
      if (!absence) {
        return res.status(404).json({
          success: false,
          message: 'Заявка не найдена'
        });
      }
      
      // Админы могут редактировать все
      if (user.role === 'admin') {
        return next();
      }
      
      // Сотрудники могут редактировать только свои нерассмотренные заявки
      if (absence.userId === user.id && absence.status === 'pending') {
        return next();
      }
      
      return res.status(403).json({
        success: false,
        message: 'Нельзя редактировать чужую или уже рассмотренную заявку'
      });
      
    } catch (error) {
      console.error('Ошибка проверки разрешений на редактирование:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка проверки разрешений'
      });
    }
  },
  
  /**
   * Может ли пользователь просматривать календарь команды
   */
  canViewSchedule: async (req, res, next) => {
    try {
      const user = req.user;
      const { teamId } = req.query;
      
      if (user.role === 'admin') {
        // Админы видят все календари
        return next();
      }
      
      if (user.role === 'manager') {
        // Менеджеры видят календари своих команд
        if (teamId) {
          const team = await Team.findByPk(teamId);
          if (!team || team.managerId !== user.id) {
            return res.status(403).json({
              success: false,
              message: 'Нет доступа к календарю данной команды'
            });
          }
        }
        return next();
      }
      
      // Обычные сотрудники видят календари своих команд
      if (teamId) {
        const userTeam = await UserTeam.findOne({
          where: { userId: user.id, teamId, status: 'active' }
        });
        
        if (!userTeam) {
          return res.status(403).json({
            success: false,
            message: 'Нет доступа к календарю данной команды'
          });
        }
      }
      
      next();
      
    } catch (error) {
      console.error('Ошибка проверки разрешений на календарь:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка проверки разрешений'
      });
    }
  }
};

module.exports = checkAbsencePermissions; 