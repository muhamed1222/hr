const express = require('express');
const router = express.Router();
const { Team, User } = require('../models');
const { authenticateToken } = require('../middleware/auth');

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
 * POST /api/test-teams/create
 * Создание новой команды (тестовый API)
 */
router.post('/create', authenticateToken, isAdmin, async (req, res) => {
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
      error: 'Ошибка создания команды',
      details: error.message
    });
  }
});

/**
 * GET /api/test-teams/list
 * Получение списка команд (тестовый API)
 */
router.get('/list', authenticateToken, isAdmin, async (req, res) => {
  try {
    const teams = await Team.findAll({
      order: [['createdAt', 'DESC']]
    });

    const formattedTeams = teams.map(team => ({
      id: team.id,
      name: team.name,
      description: team.description,
      status: team.status,
      managerId: team.managerId,
      createdAt: team.createdAt
    }));

    res.json({
      success: true,
      data: formattedTeams,
      count: formattedTeams.length
    });

  } catch (error) {
    console.error('Ошибка получения команд:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения команд',
      details: error.message
    });
  }
});

/**
 * GET /api/test-teams/users
 * Получение списка пользователей (тестовый API)
 */
router.get('/users', authenticateToken, isAdmin, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'username', 'role', 'status', 'telegramId', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: users,
      count: users.length
    });

  } catch (error) {
    console.error('Ошибка получения пользователей:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения пользователей',
      details: error.message
    });
  }
});

/**
 * PATCH /api/test-teams/user/:id/role
 * Изменение роли пользователя (тестовый API)
 */
router.patch('/user/:id/role', authenticateToken, isAdmin, async (req, res) => {
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

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }

    const oldRole = user.role;
    await user.update({ role });

    res.json({
      success: true,
      message: 'Роль пользователя успешно изменена',
      data: {
        userId: user.id,
        userName: user.name,
        oldRole,
        newRole: role
      }
    });

  } catch (error) {
    console.error('Ошибка изменения роли:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка изменения роли',
      details: error.message
    });
  }
});

module.exports = router; 