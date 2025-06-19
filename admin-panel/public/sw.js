// Минимальный Service Worker для админ-панели HR системы
self.addEventListener('install', function(event) {
  console.log('Service Worker установлен');
  // Активировать немедленно
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('Service Worker активирован');
  // Захватить всех клиентов
  event.waitUntil(self.clients.claim());
});

// Не обрабатываем fetch события - пропускаем всё
// Это предотвратит ошибки "Failed to fetch" 