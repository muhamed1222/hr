#!/bin/bash

# 🚀 Outcast TimeBot - Production Deployment Script
# Автоматический скрипт развёртывания в продакшн

set -e  # Остановка при любой ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функции для вывода
print_step() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo -e "${BLUE}"
    echo "🚀 ======================================================"
    echo "   Outcast TimeBot v4.0 - Production Deployment"
    echo "=======================================================${NC}"
    echo
}

# Проверка требований
check_requirements() {
    print_step "Проверка системных требований..."
    
    # Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js не установлен! Установите Node.js 18+ и повторите попытку."
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Требуется Node.js 18+. Текущая версия: $(node -v)"
        exit 1
    fi
    
    # npm
    if ! command -v npm &> /dev/null; then
        print_error "npm не установлен!"
        exit 1
    fi
    
    # git (опционально)
    if command -v git &> /dev/null; then
        print_success "Git найден: $(git --version)"
    else
        print_warning "Git не найден, но это не критично"
    fi
    
    print_success "Node.js $(node -v) и npm $(npm -v) готовы к работе"
}

# Проверка переменных окружения
check_env() {
    print_step "Проверка переменных окружения..."
    
    if [ ! -f ".env" ]; then
        print_warning "Файл .env не найден, создаём из шаблона..."
        if [ -f "env.example" ]; then
            cp env.example .env
            print_warning "Файл .env создан. ОБЯЗАТЕЛЬНО заполните все переменные!"
            print_warning "Редактируйте файл .env перед продолжением."
            read -p "Нажмите Enter после заполнения .env файла..."
        else
            print_error "Шаблон env.example не найден!"
            exit 1
        fi
    fi
    
    # Проверяем ключевые переменные
    source .env 2>/dev/null || true
    
    MISSING_VARS=()
    
    [ -z "$TELEGRAM_BOT_TOKEN" ] && MISSING_VARS+=("TELEGRAM_BOT_TOKEN")
    [ -z "$JWT_SECRET" ] && MISSING_VARS+=("JWT_SECRET")
    [ -z "$ADMIN_USERNAME" ] && MISSING_VARS+=("ADMIN_USERNAME")
    [ -z "$ADMIN_PASSWORD" ] && MISSING_VARS+=("ADMIN_PASSWORD")
    
    if [ ${#MISSING_VARS[@]} -ne 0 ]; then
        print_error "Не заполнены обязательные переменные:"
        for var in "${MISSING_VARS[@]}"; do
            echo "  - $var"
        done
        print_warning "Заполните эти переменные в файле .env и перезапустите скрипт"
        exit 1
    fi
    
    print_success "Переменные окружения настроены"
}

# Установка зависимостей
install_dependencies() {
    print_step "Установка зависимостей backend..."
    npm ci --production
    print_success "Backend зависимости установлены"
    
    print_step "Установка зависимостей admin-panel..."
    cd admin-panel
    npm ci
    cd ..
    print_success "Frontend зависимости установлены"
}

# Инициализация базы данных
setup_database() {
    print_step "Настройка базы данных..."
    
    # Проверяем тип БД из переменных
    if [ "$NODE_ENV" = "production" ] && [ -n "$DB_HOST" ]; then
        print_step "Используется PostgreSQL для продакшена"
        
        # Проверяем подключение к PostgreSQL
        if command -v psql &> /dev/null && [ -n "$DB_HOST" ]; then
            print_step "Тестирование подключения к PostgreSQL..."
            PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1;" &> /dev/null
            if [ $? -eq 0 ]; then
                print_success "Подключение к PostgreSQL успешно"
            else
                print_error "Не удалось подключиться к PostgreSQL"
                print_warning "Проверьте настройки DB_* в .env файле"
                exit 1
            fi
        fi
    else
        print_step "Используется SQLite для разработки"
    fi
    
    # Запуск миграций
    print_step "Запуск миграций базы данных..."
    npm run migrate 2>/dev/null || {
        print_warning "Команда migrate не найдена, выполняем инициализацию..."
        node src/database/migrate.js || true
    }
    
    print_success "База данных настроена"
}

# Сборка frontend
build_frontend() {
    print_step "Сборка admin-panel для продакшена..."
    
    cd admin-panel
    
    # Проверяем конфиг
    if [ ! -f ".env" ]; then
        print_step "Создаём .env для admin-panel..."
        echo "VITE_API_URL=http://localhost:3000/api" > .env
    fi
    
    # Сборка
    npm run build
    
    if [ $? -eq 0 ]; then
        print_success "Admin-panel собран в admin-panel/dist/"
    else
        print_error "Ошибка сборки admin-panel"
        cd ..
        exit 1
    fi
    
    cd ..
}

# Выбор метода развёртывания
choose_deployment() {
    echo
    print_step "Выберите метод развёртывания:"
    echo "1) 🔄 PM2 (рекомендуется для VPS)"
    echo "2) 🐳 Docker"
    echo "3) 🖥️  Обычный запуск (для тестирования)"
    echo "4) ❌ Пропустить запуск"
    echo
    
    read -p "Введите номер (1-4): " DEPLOY_CHOICE
    
    case $DEPLOY_CHOICE in
        1) deploy_pm2 ;;
        2) deploy_docker ;;
        3) deploy_normal ;;
        4) print_warning "Запуск пропущен" ;;
        *) print_error "Неверный выбор"; exit 1 ;;
    esac
}

# Развёртывание с PM2
deploy_pm2() {
    print_step "Развёртывание с PM2..."
    
    # Установка PM2 если нужно
    if ! command -v pm2 &> /dev/null; then
        print_step "Установка PM2..."
        npm install -g pm2
    fi
    
    # Остановка если уже запущен
    pm2 stop timebot 2>/dev/null || true
    pm2 delete timebot 2>/dev/null || true
    
    # Запуск
    pm2 start index.js --name "timebot" --env production
    pm2 save
    
    # Настройка автозапуска
    pm2 startup || true
    
    print_success "TimeBot запущен с PM2!"
    print_step "Полезные команды PM2:"
    echo "  pm2 logs timebot     - просмотр логов"
    echo "  pm2 restart timebot  - перезапуск"
    echo "  pm2 stop timebot     - остановка"
    echo "  pm2 monit           - мониторинг"
}

# Развёртывание с Docker
deploy_docker() {
    print_step "Развёртывание с Docker..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker не установлен!"
        exit 1
    fi
    
    # Остановка если запущен
    docker-compose down 2>/dev/null || true
    
    # Сборка и запуск
    docker-compose up -d --build
    
    if [ $? -eq 0 ]; then
        print_success "TimeBot запущен в Docker!"
        print_step "Полезные команды Docker:"
        echo "  docker-compose logs -f    - просмотр логов"
        echo "  docker-compose restart    - перезапуск"
        echo "  docker-compose down       - остановка"
    else
        print_error "Ошибка запуска Docker"
        exit 1
    fi
}

# Обычный запуск
deploy_normal() {
    print_step "Тестовый запуск приложения..."
    
    export NODE_ENV=production
    
    print_step "Запуск backend на http://localhost:3000"
    print_warning "Нажмите Ctrl+C для остановки"
    
    node index.js
}

# Проверка работоспособности
health_check() {
    print_step "Проверка работоспособности..."
    
    sleep 3  # Ждём запуска
    
    # Проверка API
    HEALTH_RESPONSE=$(curl -s http://localhost:3000/health 2>/dev/null || echo "error")
    
    if [[ $HEALTH_RESPONSE == *"healthy"* ]] || [[ $HEALTH_RESPONSE == *"OK"* ]]; then
        print_success "Backend работает: http://localhost:3000"
    else
        print_warning "Backend может быть не готов (запуск занимает время)"
    fi
    
    # Проверка статических файлов admin-panel
    if [ -d "admin-panel/dist" ]; then
        print_success "Admin-panel собран: admin-panel/dist/"
    fi
}

# Итоговая информация
show_final_info() {
    echo
    print_success "🎉 Развёртывание завершено!"
    echo
    print_step "📋 Доступные сервисы:"
    echo "  🔗 Backend API: http://localhost:3000"
    echo "  🔗 Health Check: http://localhost:3000/health"
    echo "  📁 Admin Panel: admin-panel/dist/ (статические файлы)"
    echo
    print_step "📖 Документация:"
    echo "  📄 README.md - полная документация"
    echo "  📱 EMPLOYEE_GUIDE.md - инструкция для сотрудников"
    echo
    print_step "🛠️ Следующие шаги:"
    echo "  1. Настройте веб-сервер (nginx) для статических файлов admin-panel"
    echo "  2. Добавьте SSL сертификат для HTTPS"
    echo "  3. Настройте мониторинг и резервное копирование"
    echo "  4. Протестируйте бота в Telegram"
    echo
    print_step "🤖 Тестирование Telegram бота:"
    echo "  1. Найдите бота в Telegram: @YourBotName"
    echo "  2. Отправьте /start"
    echo "  3. Проверьте все функции"
    echo
    print_warning "Не забудьте настроить домен и SSL для продакшена!"
}

# Основная функция
main() {
    print_header
    
    print_step "Начинаем развёртывание Outcast TimeBot v4.0..."
    echo
    
    check_requirements
    check_env
    install_dependencies
    setup_database
    build_frontend
    choose_deployment
    
    if [ "$DEPLOY_CHOICE" != "4" ]; then
        health_check
    fi
    
    show_final_info
}

# Обработка ошибок
trap 'print_error "Развёртывание прервано!"; exit 1' ERR

# Запуск
main "$@" 