"use strict";

const express = require("express");
const router = express.Router();
const { Workbook } = require("excel-builder-vanilla");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const { WorkLog, User } = require("../models");
const { Op } = require("sequelize");
const { notifyReportExported } = require("../utils/sendTelegramMessage");
const { info: _info, error: _error } = require("../utils/logger");
const { authenticateToken } = require("../middleware/auth");

// Константы
const LIMITS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MAX_PAGE_SIZE0: 1000,
  MAX_TEAM_MEMBERS: 50,
  MAX_TEAM_MEMBERS0: 500,
};

const SLICE_TIME_LENGTH = 5;
const CLEANUP_DELAY_MINUTES = 5;
const CLEANUP_DELAY_SECONDS = 60;
const MILLISECONDS_PER_SECOND = 1000;
const FILE_CLEANUP_DELAY =
  CLEANUP_DELAY_MINUTES * CLEANUP_DELAY_SECONDS * MILLISECONDS_PER_SECOND; // 5 минут
const PDF_FONT_TITLE = 18;
const PDF_FONT_SUBTITLE = 12;
const PDF_FONT_CONTENT = 10;
const PDF_MARGIN = 20;
const PDF_RECORDS_PER_PAGE = 15;
const PDF_LINE_HEIGHT = 15;
const PDF_Y_OFFSET = 2;
const HTTP_SERVER_ERROR = 500;
const REPORT_MAX_LENGTH = 100;

// Создать директорию для экспорта, если её нет
const exportsDir = path.join(__dirname, "../public/exports");
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true });
}

// Экспорт в Excel
router.post("/excel", async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.body;

    // Формируем фильтры
    const whereConditions = {};

    if (startDate && endDate) {
      whereConditions.workDate = {
        [Op.between]: [startDate, endDate],
      };
    }

    if (userId) {
      whereConditions.userId = userId;
    }

    // Получаем данные
    const workLogs = await WorkLog.findAll({
      where: whereConditions,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["name", "username", "telegramId"],
        },
      ],
      order: [["workDate", "DESC"]],
    });

    // Подготавливаем данные для Excel
    const excelData = [];

    // Заголовки
    const headers = [
      "Дата",
      "Сотрудник",
      "Telegram ID",
      "Время прихода",
      "Начало обеда",
      "Окончание обеда",
      "Время ухода",
      "Режим работы",
      "Всего отработано (мин)",
      "Отчёт о работе",
      "Проблемы",
    ];

    excelData.push(headers);

    // Добавляем данные
    workLogs.forEach((log) => {
      const row = [
        log.workDate,
        log.user?.name || "Неизвестный",
        log.user?.telegramId || "",
        log.arrivedAt ? log.arrivedAt.slice(0, SLICE_TIME_LENGTH) : "",
        log.lunchStart ? log.lunchStart.slice(0, SLICE_TIME_LENGTH) : "",
        log.lunchEnd ? log.lunchEnd.slice(0, SLICE_TIME_LENGTH) : "",
        log.leftAt ? log.leftAt.slice(0, SLICE_TIME_LENGTH) : "",
        log.workMode === "office"
          ? "Офис"
          : log.workMode === "remote"
            ? "Удалённо"
            : "Гибрид",
        log.totalMinutes || 0,
        log.dailyReport || "",
        log.problems || "",
      ];
      excelData.push(row);
    });

    // Создаём Excel файл с excel-builder-vanilla
    const workbook = new Workbook();
    const worksheet = workbook.createWorksheet({ name: "Отчёт по времени" });
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
      const reportPeriod = `${startDate || "Начало"} - ${endDate || "Конец"}`;
      const managerTelegramId = req.user?.telegramId;

      if (managerTelegramId) {
        await notifyReportExported(
          managerTelegramId,
          "Excel отчёт",
          reportPeriod,
        );
      }
    } catch (telegramError) {
      _error("Ошибка отправки Telegram уведомления", {
        error: telegramError.message,
      });
      // Не прерываем выполнение из-за ошибки Telegram
    }

    // Отправляем файл
    res.download(filepath, filename, (err) => {
      if (err) {
        _error("Ошибка отправки файла", { error: err.message });
      } else {
        _info("Excel отчёт успешно отправлен", {
          filename,
          recordsCount: workLogs.length,
        });
      }
      // Удаляем файл через 5 минут
      setTimeout(() => {
        fs.unlink(filepath, () => {});
      }, FILE_CLEANUP_DELAY);
    });
  } catch (err) {
    _error("Ошибка экспорта Excel", { error: err.message, stack: err.stack });
    res
      .status(HTTP_SERVER_ERROR)
      .json({ error: "Ошибка создания Excel отчёта" });
  }
});

// Экспорт в PDF
router.post("/pdf", async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.body;

    // Формируем фильтры
    const whereConditions = {};

    if (startDate && endDate) {
      whereConditions.workDate = {
        [Op.between]: [startDate, endDate],
      };
    }

    if (userId) {
      whereConditions.userId = userId;
    }

    // Получаем данные
    const workLogs = await WorkLog.findAll({
      where: whereConditions,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["name", "username", "telegramId"],
        },
      ],
      order: [["workDate", "DESC"]],
    });

    // Создаём PDF
    const doc = new PDFDocument({ margin: PDF_MARGIN });
    const filename = `timebot_report_${Date.now()}.pdf`;
    const filepath = path.join(exportsDir, filename);

    doc.pipe(fs.createWriteStream(filepath));

    // Заголовок
    doc
      .fontSize(PDF_FONT_TITLE)
      .text("Отчёт по учёту времени", { align: "center" });
    doc
      .fontSize(PDF_FONT_SUBTITLE)
      .text(`Период: ${startDate || "Начало"} - ${endDate || "Конец"}`, {
        align: "center",
      });
    doc.moveDown(PDF_Y_OFFSET);

    // Таблица с данными
    workLogs.forEach((log, index) => {
      if (index > 0 && index % PDF_RECORDS_PER_PAGE === 0) {
        doc.addPage(); // Новая страница каждые 15 записей
      }

      doc
        .fontSize(PDF_FONT_CONTENT)
        .text(
          `${log.workDate} | ${log.user?.name || "Неизвестный"}`,
          PDF_MARGIN,
          doc.y,
        )
        .text(
          `Пришёл: ${log.arrivedAt ? log.arrivedAt.slice(0, SLICE_TIME_LENGTH) : "Не указано"}`,
          PDF_MARGIN,
          doc.y + PDF_LINE_HEIGHT,
        )
        .text(
          `Ушёл: ${log.leftAt ? log.leftAt.slice(0, SLICE_TIME_LENGTH) : "Не указано"}`,
          PDF_MARGIN * SLICE_TIME_LENGTH,
          doc.y - PDF_LINE_HEIGHT,
        )
        .text(
          `Отработано: ${log.totalMinutes || 0} мин`,
          PDF_MARGIN * PDF_FONT_CONTENT,
          doc.y - PDF_LINE_HEIGHT,
        )
        .text(
          `Режим: ${log.workMode === "office" ? "Офис" : log.workMode === "remote" ? "Удалённо" : "Гибрид"}`,
          PDF_MARGIN,
          doc.y + PDF_LINE_HEIGHT,
        );

      if (log.dailyReport) {
        const reportText =
          log.dailyReport.length > REPORT_MAX_LENGTH
            ? `${log.dailyReport.substring(0, REPORT_MAX_LENGTH)}...`
            : log.dailyReport;
        doc.text(`Отчёт: ${reportText}`, PDF_MARGIN, doc.y + PDF_LINE_HEIGHT);
      }

      doc.moveDown();
    });

    doc.end();

    // Ждём завершения записи файла
    doc.on("end", () => {
      // Отправляем уведомление об экспорте
      try {
        const reportPeriod = `${startDate || "Начало"} - ${endDate || "Конец"}`;
        const managerTelegramId = req.user?.telegramId;

        if (managerTelegramId) {
          notifyReportExported(managerTelegramId, "PDF отчёт", reportPeriod);
        }
      } catch (telegramError) {
        _error("Ошибка отправки Telegram уведомления для PDF", {
          error: telegramError.message,
        });
        // Не прерываем выполнение из-за ошибки Telegram
      }

      res.download(filepath, filename, (err) => {
        if (err) {
          _error("Ошибка отправки PDF файла", { error: err.message });
        } else {
          _info("PDF отчёт успешно отправлен", {
            filename,
            recordsCount: workLogs.length,
          });
        }
        // Удаляем файл через 5 минут
        setTimeout(() => {
          fs.unlink(filepath, () => {});
        }, FILE_CLEANUP_DELAY);
      });
    });
  } catch (err) {
    _error("Ошибка экспорта PDF", { error: err.message, stack: err.stack });
    res.status(HTTP_SERVER_ERROR).json({ error: "Ошибка создания PDF отчёта" });
  }
});

// Аналитика
router.get("/analytics", authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;

    const whereConditions = {};

    if (startDate && endDate) {
      whereConditions.workDate = {
        [Op.between]: [startDate, endDate],
      };
    }

    if (userId) {
      whereConditions.userId = userId;
    }

    // Получаем все рабочие логи с пользователями
    const workLogs = await WorkLog.findAll({
      where: whereConditions,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "username"],
        },
      ],
      order: [["workDate", "DESC"]],
    });

    // Группируем данные по пользователям в JavaScript
    const userStats = {};

    workLogs.forEach((log) => {
      const userId = log.userId;
      if (!userStats[userId]) {
        userStats[userId] = {
          userId: userId,
          userName: log.user?.name || "Неизвестный",
          username: log.user?.username || "",
          totalMinutes: 0,
          workDays: 0,
          avgMinutes: 0,
        };
      }

      userStats[userId].totalMinutes += log.totalMinutes || 0;
      userStats[userId].workDays += 1;
    });

    // Рассчитываем средние значения
    Object.values(userStats).forEach((stat) => {
      stat.avgMinutes =
        stat.workDays > 0 ? Math.round(stat.totalMinutes / stat.workDays) : 0;
    });

    // Сортируем по общему времени (убывание)
    const analytics = Object.values(userStats).sort(
      (a, b) => b.totalMinutes - a.totalMinutes,
    );

    res.json(analytics);
  } catch (err) {
    _error("Ошибка аналитики", { error: err.message, stack: err.stack });
    res.status(HTTP_SERVER_ERROR).json({ error: "Ошибка получения аналитики" });
  }
});

module.exports = router;
