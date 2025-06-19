const express = require('express');
const router = express.Router();
const { sendTestMessage, sendTelegramMessage } = require('../utils/sendTelegramMessage');

/**
 * Тестовый endpoint для проверки работы уведомлений
 */
router.post('/test', async (req, res) => {
  try {
    const { chatId } = req.body;

    if (!chatId) {
      return res.status(400).json({
        success: false,
        message: 'Не указан chatId'
      });
    }

    const result = await sendTestMessage(chatId);

    if (result) {
      res.json({
        success: true,
        message: 'Тестовое сообщение отправлено',
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Ошибка отправки сообщения'
      });
    }

  } catch (error) {
    console.error('Ошибка тестирования Telegram:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * Отправка произвольного сообщения
 */
router.post('/send', async (req, res) => {
  try {
    const { chatId, message } = req.body;

    if (!chatId || !message) {
      return res.status(400).json({
        success: false,
        message: 'Не указаны chatId или message'
      });
    }

    const result = await sendTelegramMessage(chatId, message);

    if (result) {
      res.json({
        success: true,
        message: 'Сообщение отправлено',
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Ошибка отправки сообщения'
      });
    }

  } catch (error) {
    console.error('Ошибка отправки Telegram сообщения:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * Получение информации о боте
 */
router.get('/bot-info', async (req, res) => {
  try {
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN === 'placeholder') {
      return res.json({
        success: false,
        message: 'Telegram Bot Token не настроен'
      });
    }

    const axios = require('axios');
    const response = await axios.get(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`);

    res.json({
      success: true,
      data: response.data,
      instructions: {
        getUpdates: `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`,
        testEndpoint: '/api/telegram/test',
        note: 'Для получения chat_id напишите боту /start и посмотрите getUpdates'
      }
    });

  } catch (error) {
    console.error('Ошибка получения информации о боте:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка подключения к Telegram API'
    });
  }
});

module.exports = router; 