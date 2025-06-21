"use strict";

const express = require("express");
const router = express.Router();

// Тестовый эндпоинт для проверки API команд
router.get("/", (req, res) => {
  res.json({
    success: true,
    teams: [
      {
        id: 1,
        name: "Тестовая команда 1",
        members: [
          { id: 1, name: "Иван Иванов", role: "developer" },
          { id: 2, name: "Петр Петров", role: "designer" }
        ]
      },
      {
        id: 2,
        name: "Тестовая команда 2",
        members: [
          { id: 3, name: "Анна Сидорова", role: "manager" },
          { id: 4, name: "Мария Козлова", role: "developer" }
        ]
      }
    ]
  });
});

// Тестовый эндпоинт для проверки создания команды
router.post("/", (req, res) => {
  try {
    const { name, members } = req.body;

    res.json({
      success: true,
      message: "Тестовая команда успешно создана",
      team: {
        id: Math.floor(Math.random() * 1000),
        name,
        members
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Ошибка при создании тестовой команды",
      error: error.message
    });
  }
});

// Тестовый эндпоинт для проверки обновления команды
router.put("/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { name, members } = req.body;

    res.json({
      success: true,
      message: "Тестовая команда успешно обновлена",
      team: {
        id: parseInt(id),
        name,
        members
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Ошибка при обновлении тестовой команды",
      error: error.message
    });
  }
});

module.exports = router; 