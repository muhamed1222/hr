const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { WorkLog, User } = require('../src/models');
const { Op } = require('sequelize');

// Создать директорию для экспорта, если её нет
const exportsDir = path.join(__dirname, '../src/public/exports');
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true });
}

// Экспорт в Excel
router.post('/excel', async (req, res) => {
  try {
    const { startDate, endDate, format, userId } = req.body;
    
    // Формируем фильтры
    const whereConditions = {};
    
    if (startDate && endDate) {
      whereConditions.work_date = {
        [Op.between]: [startDate, endDate]
      };
    }
    
    if (userId) {
      whereConditions.user_id = userId;
    }

    // Получаем данные
    const workLogs = await WorkLog.findAll({
      where: whereConditions,
      include: [{
        model: User,
        attributes: ['name', 'username', 'telegram_id']
      }],
      order: [['work_date', 'DESC']]
    });

    // Создаём Excel файл
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Отчёт по времени');

    // Заголовки
    const headers = [
      'Дата',
      'Сотрудник',
      'Telegram ID',
      'Время прихода',
      'Начало обеда',
      'Окончание обеда',
      'Время ухода',
      'Режим работы',
      'Всего отработано (мин)',
      'Отчёт о работе',
      'Проблемы'
    ];

    worksheet.addRow(headers);

    // Применяем стили к заголовкам
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E2E2' }
    };

    // Добавляем данные
    workLogs.forEach(log => {
      const row = [
        log.work_date,
        log.User?.name || 'Неизвестный',
        log.User?.telegram_id || '',
        log.arrived_at ? new Date(log.arrived_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '',
        log.lunch_started_at ? new Date(log.lunch_started_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '',
        log.lunch_ended_at ? new Date(log.lunch_ended_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '',
        log.left_at ? new Date(log.left_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '',
        log.work_mode === 'office' ? 'Офис' : log.work_mode === 'remote' ? 'Удалённо' : 'Гибрид',
        log.total_minutes || 0,
        log.daily_report || '',
        log.problems || ''
      ];
      worksheet.addRow(row);
    });

    // Автоширина столбцов
    worksheet.columns.forEach(column => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, cell => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = maxLength < 10 ? 10 : maxLength + 2;
    });

    // Сохраняем файл
    const filename = `timebot_report_${Date.now()}.xlsx`;
    const filepath = path.join(exportsDir, filename);
    
    await workbook.xlsx.writeFile(filepath);

    // Отправляем файл
    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('Ошибка отправки файла:', err);
      }
      // Удаляем файл через 5 минут
      setTimeout(() => {
        fs.unlink(filepath, () => {});
      }, 5 * 60 * 1000);
    });

  } catch (error) {
    console.error('Ошибка экспорта Excel:', error);
    res.status(500).json({ error: 'Ошибка создания Excel отчёта' });
  }
});

// Экспорт в PDF
router.post('/pdf', async (req, res) => {
  try {
    const { startDate, endDate, format, userId } = req.body;
    
    // Формируем фильтры
    const whereConditions = {};
    
    if (startDate && endDate) {
      whereConditions.work_date = {
        [Op.between]: [startDate, endDate]
      };
    }
    
    if (userId) {
      whereConditions.user_id = userId;
    }

    // Получаем данные
    const workLogs = await WorkLog.findAll({
      where: whereConditions,
      include: [{
        model: User,
        attributes: ['name', 'username', 'telegram_id']
      }],
      order: [['work_date', 'DESC']]
    });

    // Создаём PDF
    const doc = new PDFDocument({ margin: 50 });
    const filename = `timebot_report_${Date.now()}.pdf`;
    const filepath = path.join(exportsDir, filename);
    
    doc.pipe(fs.createWriteStream(filepath));

    // Заголовок
    doc.fontSize(18).text('Отчёт по учёту времени', { align: 'center' });
    doc.fontSize(12).text(`Период: ${startDate || 'Начало'} - ${endDate || 'Конец'}`, { align: 'center' });
    doc.moveDown(2);

    // Таблица с данными
    workLogs.forEach((log, index) => {
      if (index > 0 && index % 15 === 0) {
        doc.addPage(); // Новая страница каждые 15 записей
      }

      doc.fontSize(10)
        .text(`${log.work_date} | ${log.User?.name || 'Неизвестный'}`, 50, doc.y)
        .text(`Пришёл: ${log.arrived_at ? new Date(log.arrived_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : 'Не указано'}`, 50, doc.y + 15)
        .text(`Ушёл: ${log.left_at ? new Date(log.left_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : 'Не указано'}`, 250, doc.y - 15)
        .text(`Отработано: ${log.total_minutes || 0} мин`, 400, doc.y - 15)
        .text(`Режим: ${log.work_mode === 'office' ? 'Офис' : log.work_mode === 'remote' ? 'Удалённо' : 'Гибрид'}`, 50, doc.y + 15);
      
      if (log.daily_report) {
        doc.text(`Отчёт: ${log.daily_report.substring(0, 100)}${log.daily_report.length > 100 ? '...' : ''}`, 50, doc.y + 15);
      }
      
      doc.moveDown();
    });

    doc.end();

    // Ждём завершения записи файла
    doc.on('end', () => {
      res.download(filepath, filename, (err) => {
        if (err) {
          console.error('Ошибка отправки PDF:', err);
        }
        // Удаляем файл через 5 минут
        setTimeout(() => {
          fs.unlink(filepath, () => {});
        }, 5 * 60 * 1000);
      });
    });

  } catch (error) {
    console.error('Ошибка экспорта PDF:', error);
    res.status(500).json({ error: 'Ошибка создания PDF отчёта' });
  }
});

// Аналитика
router.get('/analytics', async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;
    
    const whereConditions = {};
    
    if (startDate && endDate) {
      whereConditions.work_date = {
        [Op.between]: [startDate, endDate]
      };
    }
    
    if (userId) {
      whereConditions.user_id = userId;
    }

    const analytics = await WorkLog.findAll({
      where: whereConditions,
      include: [{
        model: User,
        as: 'user',
        attributes: ['name']
      }],
      attributes: [
        'userId',
        [WorkLog.sequelize.fn('AVG', WorkLog.sequelize.col('totalMinutes')), 'avgMinutes'],
        [WorkLog.sequelize.fn('SUM', WorkLog.sequelize.col('totalMinutes')), 'totalMinutes'],
        [WorkLog.sequelize.fn('COUNT', WorkLog.sequelize.col('id')), 'workDays']
      ],
      group: ['userId', 'user.name'],
      order: [[WorkLog.sequelize.fn('SUM', WorkLog.sequelize.col('totalMinutes')), 'DESC']]
    });

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Ошибка аналитики:', error);
    res.status(500).json({ error: 'Ошибка получения аналитики' });
  }
});

module.exports = router; 