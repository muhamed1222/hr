'use strict';

const express = require('express');
const router = express.Router();
const { Workbook } = require('excel-builder-vanilla');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { WorkLog, User } = require('../models');
const { Op } = require('sequelize');
const { notifyReportExported } = require('../utils/sendTelegramMessage');
const { info, error } = require('../utils/logger');

// Константы 
const SLICE_TIME_LENGTH = 5;
const CLEANUP_DELAY_MINUTES = 5;
const CLEANUP_DELAY_SECONDS = 60;
const MILLISECONDS_PER_SECOND = 1000;
const FILE_CLEANUP_DELAY = CLEANUP_DELAY_MINUTES * CLEANUP_DELAY_SECONDS * MILLISECONDS_PER_SECOND; // 5 минут
const PDF_FONT_TITLE = 18;
const PDF_FONT_SUBTITLE = 12;
const PDF_FONT_CONTENT = 10;
const PDF_MARGIN = 50;
const PDF_RECORDS_PER_PAGE = 15;
const PDF_LINE_HEIGHT = 15;
const PDF_Y_OFFSET = 2;
const HTTP_SERVER_ERROR = 500;
const REPORT_MAX_LENGTH = 100;

// Создать директорию для экспорта, если её нет
const exportsDir = path.join(__dirname, '../public/exports');
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true });
}

// Экспорт в Excel
router.post('/excel', async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.body;
    
    // Формируем фильтры
    const whereConditions = {};
    
    if (startDate && endDate) {
      whereConditions.workDate = {
        [Op.between]: [startDate, endDate]
      };
    }
    
    if (userId) {
      whereConditions.userId = userId;
    }

    // Получаем данные
    const workLogs = await WorkLog.findAll({
      where: whereConditions,
      include: [{
        model: User,
        as: 'user',
        attributes: ['name', 'username', 'telegramId']
      }],
      order: [['workDate', 'DESC']]
    });

    // Подготавливаем данные для Excel
    const excelData = [];
    
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
    
    excelData.push(headers);

    // Добавляем данные
    workLogs.forEach(log => {
      const row = [
        log.workDate,
        log.user?.name || 'Неизвестный',
        log.user?.telegramId || '',
        log.arrivedAt ? log.arrivedAt.slice(0, SLICE_TIME_LENGTH) : '',
        log.lunchStart ? log.lunchStart.slice(0, SLICE_TIME_LENGTH) : '',
        log.lunchEnd ? log.lunchEnd.slice(0, SLICE_TIME_LENGTH) : '',
        log.leftAt ? log.leftAt.slice(0, SLICE_TIME_LENGTH) : '',
        log.workMode === 'office' ? 'Офис' : log.workMode === 'remote' ? 'Удалённо' : 'Гибрид',
        log.totalMinutes || 0,
        log.dailyReport || '',
        log.problems || ''
      ];
      excelData.push(row);
    });

    // Создаём Excel файл с excel-builder-vanilla
    const workbook = new Workbook();
    const worksheet = workbook.createWorksheet({ name: 'Отчёт по времени' });
    worksheet.setData(excelData);
    workbook.addWorksheet(worksheet);

    // Генерируем файл
    const filename = `timebot_report_${Date.now()}.xlsx`;
    const filepath = path.join(exportsDir, filename);
    
    // Получаем буфер и сохраняем файл  
    const buffer = await workbook.createFile();
    fs.writeFileSync(filepath, new Uint8Array(buffer));

    // Отправляем уведомление об экспорте
    try {
      const reportPeriod = `${startDate || 'Начало'} - ${endDate || 'Конец'}`;
      const managerTelegramId = req.user?.telegramId;
      
      if (managerTelegramId) {
        await notifyReportExported(managerTelegramId, 'Excel отчёт', reportPeriod);
      }
    } catch (telegramError) {
      error('Ошибка отправки Telegram уведомления', { error: telegramError.message });
      // Не прерываем выполнение из-за ошибки Telegram
    }

    // Отправляем файл
    res.download(filepath, filename, (err) => {
      if (err) {
        error('Ошибка отправки файла', { error: err.message });
      } else {
        info('Excel отчёт успешно отправлен', { filename, recordsCount: workLogs.length });
      }
      // Удаляем файл через 5 минут
      setTimeout(() => {
        fs.unlink(filepath, () => {});
      }, FILE_CLEANUP_DELAY);
    });

  } catch (err) {
    error('Ошибка экспорта Excel', { error: err.message, stack: err.stack });
    res.status(HTTP_SERVER_ERROR).json({ error: 'Ошибка создания Excel отчёта' });
  }
});

// Экспорт в PDF
router.post('/pdf', async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.body;
    
    // Формируем фильтры
    const whereConditions = {};
    
    if (startDate && endDate) {
      whereConditions.workDate = {
        [Op.between]: [startDate, endDate]
      };
    }
    
    if (userId) {
      whereConditions.userId = userId;
    }

    // Получаем данные
    const workLogs = await WorkLog.findAll({
      where: whereConditions,
      include: [{
        model: User,
        as: 'user',
        attributes: ['name', 'username', 'telegramId']
      }],
      order: [['workDate', 'DESC']]
    });

    // Создаём PDF
    const doc = new PDFDocument({ margin: PDF_MARGIN });
    const filename = `timebot_report_${Date.now()}.pdf`;
    const filepath = path.join(exportsDir, filename);
    
    doc.pipe(fs.createWriteStream(filepath));

    // Заголовок
    doc.fontSize(PDF_FONT_TITLE).text('Отчёт по учёту времени', { align: 'center' });
    doc.fontSize(PDF_FONT_SUBTITLE).text(`Период: ${startDate || 'Начало'} - ${endDate || 'Конец'}`, { align: 'center' });
    doc.moveDown(PDF_Y_OFFSET);

    // Таблица с данными
    workLogs.forEach((log, index) => {
      if (index > 0 && index % PDF_RECORDS_PER_PAGE === 0) {
        doc.addPage(); // Новая страница каждые 15 записей
      }

      doc.fontSize(PDF_FONT_CONTENT)
        .text(`${log.workDate} | ${log.user?.name || 'Неизвестный'}`, PDF_MARGIN, doc.y)
        .text(`Пришёл: ${log.arrivedAt ? log.arrivedAt.slice(0, SLICE_TIME_LENGTH) : 'Не указано'}`, PDF_MARGIN, doc.y + PDF_LINE_HEIGHT)
        .text(`Ушёл: ${log.leftAt ? log.leftAt.slice(0, SLICE_TIME_LENGTH) : 'Не указано'}`, PDF_MARGIN * SLICE_TIME_LENGTH, doc.y - PDF_LINE_HEIGHT)
        .text(`Отработано: ${log.totalMinutes || 0} мин`, PDF_MARGIN * PDF_FONT_CONTENT, doc.y - PDF_LINE_HEIGHT)
        .text(`Режим: ${log.workMode === 'office' ? 'Офис' : log.workMode === 'remote' ? 'Удалённо' : 'Гибрид'}`, PDF_MARGIN, doc.y + PDF_LINE_HEIGHT);
      
      if (log.dailyReport) {
        const reportText = log.dailyReport.length > REPORT_MAX_LENGTH 
          ? `${log.dailyReport.substring(0, REPORT_MAX_LENGTH)}...` 
          : log.dailyReport;
        doc.text(`Отчёт: ${reportText}`, PDF_MARGIN, doc.y + PDF_LINE_HEIGHT);
      }
      
      doc.moveDown();
    });

    doc.end();

    // Ждём завершения записи файла
    doc.on('end', () => {
      // Отправляем уведомление об экспорте
      try {
        const reportPeriod = `${startDate || 'Начало'} - ${endDate || 'Конец'}`;
        const managerTelegramId = req.user?.telegramId;
        
        if (managerTelegramId) {
          notifyReportExported(managerTelegramId, 'PDF отчёт', reportPeriod);
        }
      } catch (telegramError) {
        error('Ошибка отправки Telegram уведомления для PDF', { error: telegramError.message });
        // Не прерываем выполнение из-за ошибки Telegram
      }

      res.download(filepath, filename, (err) => {
        if (err) {
          error('Ошибка отправки PDF файла', { error: err.message });
        } else {
          info('PDF отчёт успешно отправлен', { filename, recordsCount: workLogs.length });
        }
        // Удаляем файл через 5 минут
        setTimeout(() => {
          fs.unlink(filepath, () => {});
        }, FILE_CLEANUP_DELAY);
      });
    });

  } catch (err) {
    error('Ошибка экспорта PDF', { error: err.message, stack: err.stack });
    res.status(HTTP_SERVER_ERROR).json({ error: 'Ошибка создания PDF отчёта' });
  }
});

// Аналитика
router.get('/analytics', async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;
    
    const whereConditions = {};
    
    if (startDate && endDate) {
      whereConditions.workDate = {
        [Op.between]: [startDate, endDate]
      };
    }
    
    if (userId) {
      whereConditions.userId = userId;
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

  } catch (err) {
    error('Ошибка аналитики', { error: err.message, stack: err.stack });
    res.status(HTTP_SERVER_ERROR).json({ error: 'Ошибка получения аналитики' });
  }
});

module.exports = router; 