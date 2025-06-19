// Минимальная версия API для тестирования на Vercel
const express = require('express');
const cors = require('cors');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Test route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: 'production',
    message: 'API is running on Vercel'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: 'production',
    message: 'API is running on Vercel'
  });
});

app.get('/api', (req, res) => {
  res.json({
    name: 'HR Management API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      test: '/health'
    }
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'HR API is running',
    health: '/health',
    api: '/api'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    path: req.originalUrl 
  });
});

module.exports = app; 