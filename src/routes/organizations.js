const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const { Organization, User, Team } = require('../models');
const ImportService = require('../services/ImportService');
const { auditLogger } = require('../utils/auditLogger');

// Настройка загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.xlsx', '.xls'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Разрешены только CSV и Excel файлы'));
    }
  }
});

// Middleware для проверки доступа к организации
const checkOrgAccess = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const userId = req.user.id;
    
    // Супер админ имеет доступ ко всем организациям
    if (req.user.role === 'superadmin') {
      return next();
    }
    
    // Проверяем доступ пользователя к организации
    const user = await User.findByPk(userId, {
      include: [{
        model: Organization,
        as: 'organization'
      }]
    });
    
    if (!user.organization || user.organization.id != orgId) {
      return res.status(403).json({ error: 'Нет доступа к этой организации' });
    }
    
    // Проверяем права администратора в организации
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Требуются права администратора' });
    }
    
    req.organization = user.organization;
    next();
  } catch (error) {
    console.error('Ошибка проверки доступа к организации:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};

// Получить список организаций (только для супер админа)
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    const { page = 1, limit = 10, search, subscription } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (search) {
      whereClause.name = { [require('sequelize').Op.like]: `%${search}%` };
    }
    if (subscription) {
      whereClause.subscriptionType = subscription;
    }

    const { rows: organizations, count } = await Organization.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'owner',
        attributes: ['id', 'name', 'username']
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    // Добавляем статистику для каждой организации
    const organizationsWithStats = await Promise.all(
      organizations.map(async (org) => {
        const userCount = await User.count({ where: { organizationId: org.id } });
        const teamCount = await Team.count({ where: { organizationId: org.id } });
        
        return {
          ...org.toJSON(),
          stats: {
            userCount,
            teamCount,
            usagePercent: org.maxUsers ? Math.round((userCount / org.maxUsers) * 100) : null
          }
        };
      })
    );

    res.json({
      success: true,
      data: {
        organizations: organizationsWithStats,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(count / limit),
          count,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Ошибка получения организаций:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить информацию о своей организации
router.get('/current', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [{
        model: Organization,
        as: 'organization'
      }]
    });

    if (!user.organization) {
      return res.status(404).json({ error: 'Организация не найдена' });
    }

    const userCount = await User.count({ where: { organizationId: user.organization.id } });
    const teamCount = await Team.count({ where: { organizationId: user.organization.id } });

    const orgData = {
      ...user.organization.toJSON(),
      branding: user.organization.getBranding(),
      stats: {
        userCount,
        teamCount,
        usagePercent: user.organization.maxUsers ? 
          Math.round((userCount / user.organization.maxUsers) * 100) : null
      }
    };

    res.json({
      success: true,
      data: orgData
    });
  } catch (error) {
    console.error('Ошибка получения текущей организации:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Создать организацию (только супер админ)
router.post('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    const {
      name, slug, description, subscriptionType = 'free',
      maxUsers, timezone = 'Europe/Moscow', locale = 'ru',
      settings = {}, telegramBotToken
    } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ error: 'Название и slug обязательны' });
    }

    // Проверяем уникальность slug
    const existingOrg = await Organization.findOne({ where: { slug } });
    if (existingOrg) {
      return res.status(400).json({ error: 'Организация с таким slug уже существует' });
    }

    const organization = await Organization.create({
      name,
      slug,
      description,
      subscriptionType,
      maxUsers,
      timezone,
      locale,
      settings: JSON.stringify(settings),
      telegramBotToken
    });

    await auditLogger({
      action: 'organization_created',
      userId: req.user.id,
      details: {
        organizationId: organization.id,
        name: organization.name,
        slug: organization.slug
      },
      adminId: req.user.id
    });

    res.status(201).json({
      success: true,
      data: organization
    });
  } catch (error) {
    console.error('Ошибка создания организации:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Обновить настройки организации
router.put('/:orgId', authenticateToken, checkOrgAccess, async (req, res) => {
  try {
    const updates = req.body;
    const allowedFields = [
      'name', 'description', 'timezone', 'locale',
      'maxUsers', 'telegramBotToken'
    ];

    // Фильтруем только разрешённые поля
    const filteredUpdates = {};
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    });

    // Обновляем настройки брендинга отдельно
    if (updates.settings) {
      await req.organization.updateSettings(updates.settings);
    }

    // Обновляем основные поля
    if (Object.keys(filteredUpdates).length > 0) {
      await req.organization.update(filteredUpdates);
    }

    await auditLogger({
      action: 'organization_updated',
      userId: req.user.id,
      details: {
        organizationId: req.organization.id,
        updates: { ...filteredUpdates, settings: updates.settings }
      },
      adminId: req.user.id
    });

    res.json({
      success: true,
      data: await req.organization.reload(),
      message: 'Организация обновлена'
    });
  } catch (error) {
    console.error('Ошибка обновления организации:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Загрузить шаблон для импорта
router.get('/:orgId/import-template', authenticateToken, checkOrgAccess, async (req, res) => {
  try {
    const { format = 'xlsx' } = req.query;

    if (format === 'csv') {
      const csvContent = await ImportService.generateImportTemplate('csv');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="import_template.csv"');
      res.send(csvContent);
    } else {
      const workbook = await ImportService.generateImportTemplate('xlsx');
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="import_template.xlsx"');
      
      const buffer = await workbook.xlsx.writeBuffer();
      res.send(buffer);
    }
  } catch (error) {
    console.error('Ошибка создания шаблона:', error);
    res.status(500).json({ error: 'Ошибка создания шаблона' });
  }
});

// Валидировать файл импорта
router.post('/:orgId/validate-import', authenticateToken, checkOrgAccess, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    const validation = await ImportService.validateImportFile(req.file.path);

    // Удаляем временный файл
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('Ошибка валидации файла:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Ошибка валидации файла' });
  }
});

// Импортировать пользователей
router.post('/:orgId/import-users', authenticateToken, checkOrgAccess, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    const options = {
      generatePasswords: req.body.generatePasswords === 'true',
      sendNotifications: req.body.sendNotifications === 'true'
    };

    const results = await ImportService.importUsersFromFile(
      req.file.path,
      req.organization.id,
      req.user.id,
      options
    );

    // Удаляем временный файл
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      data: results,
      message: `Импорт завершён. Успешно: ${results.successful}, ошибок: ${results.failed}`
    });
  } catch (error) {
    console.error('Ошибка импорта пользователей:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message || 'Ошибка импорта пользователей' });
  }
});

// Получить статистику организации
router.get('/:orgId/stats', authenticateToken, checkOrgAccess, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Базовая статистика
    const userCount = await User.count({ where: { organizationId: req.organization.id } });
    const teamCount = await Team.count({ where: { organizationId: req.organization.id } });
    const activeUsers = await User.count({ 
      where: { 
        organizationId: req.organization.id,
        isActive: true 
      } 
    });

    // Статистика по ролям
    const roleStats = await User.findAll({
      where: { organizationId: req.organization.id },
      attributes: [
        'role',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['role']
    });

    const stats = {
      users: {
        total: userCount,
        active: activeUsers,
        byRole: roleStats.reduce((acc, stat) => {
          acc[stat.role] = parseInt(stat.getDataValue('count'));
          return acc;
        }, {})
      },
      teams: {
        total: teamCount
      },
      limits: {
        maxUsers: req.organization.maxUsers,
        usagePercent: req.organization.maxUsers ? 
          Math.round((userCount / req.organization.maxUsers) * 100) : null
      },
      subscription: {
        type: req.organization.subscriptionType,
        expiresAt: req.organization.subscriptionExpiresAt,
        isActive: req.organization.isSubscriptionActive()
      }
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router; 