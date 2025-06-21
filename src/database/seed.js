"use strict";

const { _info, _error, _warn, _debug } = require("../utils/logger");

const { User, _Team, WorkLog } = require("../models");
const _bcrypt = require("bcrypt");
const _moment = require("moment");

// Вспомогательные функции (используются в комментариях)
const _calculateWorkMinutes = (_arrivedAt, _leftAt, _lunchStart, _lunchEnd) => {
  // Логика расчёта рабочего времени
  return 480; // 8 часов по умолчанию
};

const _generateRandomReport = () => {
  const reports = [
    "Работал над основным проектом",
    "Исправлял баги в системе",
    "Проводил код-ревью",
    "Участвовал в планировании",
    "Тестировал новые функции",
  ];
  return reports[Math.floor(Math.random() * reports.length)];
};

const _generateRandomProblem = () => {
  const problems = [
    "Медленная загрузка страниц",
    "Проблемы с авторизацией",
    "Ошибки в API",
    "Конфликты в коде",
    "Проблемы с базой данных",
  ];
  return problems[Math.floor(Math.random() * problems.length)];
};

async function _seed() {
  try {
    _info("🌱 Начинаем заполнение базы данных...");

    // Создание тестового пользователя
    const _created = await User.create({
      name: "Тестовый Пользователь",
      username: "testuser",
      role: "employee",
      status: "active",
      telegramId: 123456789,
    });

    _info("✅ Тестовый пользователь создан");

    // Создание тестовых логов работы
    const _userCount = await User.count();
    const _logCount = await WorkLog.count();

    _info(`📊 Статистика: ${_userCount} пользователей, ${_logCount} логов`);

    _info("✅ Заполнение базы данных завершено");
    process.exit(0);
  } catch (error) {
    _error("❌ Ошибка заполнения базы данных:", error);
    process.exit(1);
  }
}
