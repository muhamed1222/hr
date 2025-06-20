import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Обработка ошибок загрузки модулей
window.addEventListener('error', (event) => {
  if (event.target.tagName === 'SCRIPT' && event.target.type === 'module') {
    console.error('Failed to load module:', event.target.src);
  }
});

// Проверка поддержки современного JS
if (!window.Promise || !window.fetch) {
  console.error('Browser not supported. Please update your browser.');
}

// Инициализация React приложения
const root = ReactDOM.createRoot(document.getElementById('root'));

// В production режиме убираем StrictMode для лучшей производительности
const isProduction = import.meta.env.PROD;

root.render(
  isProduction ? (
    <App />
  ) : (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
); 