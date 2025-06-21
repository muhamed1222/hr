#!/bin/bash

echo "🔍 Начинаем тестирование и запуск проекта..."

# Функция для проверки статуса команды
check_status() {
    if [ $? -eq 0 ]; then
        echo "✅ $1"
    else
        echo "❌ $1"
        exit 1
    fi
}

# 1. Проверка наличия необходимых программ
echo "\n📋 Проверка зависимостей..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js не установлен"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm не установлен"; exit 1; }
command -v psql >/dev/null 2>&1 || { echo "❌ PostgreSQL не установлен"; exit 1; }
check_status "Все необходимые программы установлены"

# 2. Проверка конфигурации
echo "\n📝 Проверка конфигурации..."
if [ ! -f .env ]; then
    echo "❌ Файл .env не найден"
    exit 1
fi
check_status "Конфигурация в порядке"

# 3. Проверка подключения к базе данных
echo "\n🔌 Проверка подключения к PostgreSQL..."
psql -h localhost -p 5432 -U hr_user -d hr_db -c "\q" >/dev/null 2>&1
check_status "Подключение к базе данных работает"

# 4. Остановка существующих процессов
echo "\n🛑 Остановка существующих процессов..."
pkill -f "node start-server.js" || true
pkill -f "vite" || true
check_status "Процессы остановлены"

# 5. Установка зависимостей
echo "\n📦 Установка зависимостей бэкенда..."
npm install --no-audit
check_status "Зависимости бэкенда установлены"

echo "\n📦 Установка зависимостей фронтенда..."
cd frontend && npm install --no-audit && cd ..
check_status "Зависимости фронтенда установлены"

# 6. Запуск бэкенда
echo "\n🚀 Запуск бэкенда..."
PORT=3001 node start-server.js &
BACKEND_PID=$!
sleep 5

# Проверка, что бэкенд запустился
curl -s http://localhost:3001/health >/dev/null 2>&1
check_status "Бэкенд запущен и отвечает"

# 7. Запуск фронтенда
echo "\n🚀 Запуск фронтенда..."
cd frontend && npm run dev &
FRONTEND_PID=$!
sleep 5

# Проверка, что фронтенд запустился
curl -s http://localhost:3000 >/dev/null 2>&1
check_status "Фронтенд запущен и отвечает"

echo "\n✨ Проект успешно запущен!"
echo "📱 Фронтенд: http://localhost:3000"
echo "⚙️  Бэкенд: http://localhost:3001"
echo "💡 Для остановки нажмите Ctrl+C"

# Ожидание сигнала завершения
wait 