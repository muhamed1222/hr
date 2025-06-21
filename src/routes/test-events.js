"use strict";

const express = require("express");
const router = express.Router();

// Тестовый эндпоинт для проверки событий
router.post("/trigger", async (req, res) => {
  try {
    const { eventType, data } = req.body;

    // Здесь можно добавить логику для тестирования событий
    res.json({
      success: true,
      message: `Тестовое событие ${eventType} успешно обработано`,
      data: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Ошибка при обработке тестового события",
      error: error.message
    });
  }
});

// Тестовый эндпоинт для проверки обработчиков событий
router.get("/handlers", (req, res) => {
  res.json({
    success: true,
    handlers: [
      {
        type: "user.created",
        description: "Обработчик создания пользователя"
      },
      {
        type: "user.updated",
        description: "Обработчик обновления пользователя"
      },
      {
        type: "worklog.created",
        description: "Обработчик создания рабочего лога"
      }
    ]
  });
});

module.exports = router; 