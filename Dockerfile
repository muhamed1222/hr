# Используем официальный Node.js образ
FROM node:18-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Устанавливаем системные зависимости для нативных модулей
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite \
    sqlite-dev

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production && npm cache clean --force

# Копируем исходный код
COPY . .

# Создаем непривилегированного пользователя
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Создаем директории для данных
RUN mkdir -p /app/data /app/logs /app/src/public/exports && \
    chown -R nodejs:nodejs /app

# Переключаемся на непривилегированного пользователя
USER nodejs

# Открываем порт
EXPOSE 3000

# Проверка здоровья контейнера
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Запускаем приложение
CMD ["npm", "start"] 