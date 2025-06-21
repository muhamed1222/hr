"use strict";

const { info: _info, error: _error, warn: _warn, debug: _debug } = require("../utils/logger");

/**
 * Конфигурация SSL/HTTPS
 * Для разработки используются самоподписанные сертификаты
 * Для продакшена необходимо использовать реальные сертификаты
 */

const fs = require("fs");
const path = require("path");
const forge = require("node-forge");

// Пути к сертификатам
const certPath = path.join(__dirname, "../../certs");
const keyFile = path.join(certPath, "key.pem");
const certFile = path.join(certPath, "cert.pem");

// Проверяем наличие сертификатов
const hasCertificates = fs.existsSync(keyFile) && fs.existsSync(certFile);

// Конфигурация SSL
const sslConfig = {
  enabled: process.env.NODE_ENV === "production" || hasCertificates,
  options: hasCertificates
    ? {
        key: fs.readFileSync(keyFile),
        cert: fs.readFileSync(certFile),
      }
    : null,

  // Настройки для продакшена
  production: {
    // Для продакшена рекомендуется использовать Let's Encrypt или другие CA
    // cert: fs.readFileSync('/path/to/cert.pem'),
    // key: fs.readFileSync('/path/to/key.pem'),
    // ca: fs.readFileSync('/path/to/ca.pem')
  },
};

// Функция для создания самоподписанных сертификатов
const generateSelfSignedCert = () => {
  if (hasCertificates) {
    _info("✅ SSL сертификаты уже существуют");
    return;
  }

  _info("🔐 Генерация самоподписанных SSL сертификатов...");

  // Создаем директорию для сертификатов
  if (!fs.existsSync(certPath)) {
    fs.mkdirSync(certPath, { recursive: true });
  }

  // Генерируем сертификаты с помощью OpenSSL
  const { execSync } = require("child_process");

  try {
    // Генерируем приватный ключ
    execSync(`openssl genrsa -out "${keyFile}" 2048`, { stdio: "inherit" });

    // Генерируем самоподписанный сертификат
    execSync(
      `openssl req -new -x509 -key "${keyFile}" -out "${certFile}" -days 365 -subj "/C=RU/ST=Development/L=Development/O=HR System/CN=localhost"`,
      { stdio: "inherit" },
    );

    _info("✅ SSL сертификаты успешно созданы");
    sslConfig.enabled = true;
    sslConfig.options = {
      key: fs.readFileSync(keyFile),
      cert: fs.readFileSync(certFile),
    };
  } catch (error) {
    _warn("⚠️ Не удалось создать SSL сертификаты:", error.message);
    _info("💡 Для HTTPS установите OpenSSL или используйте HTTP в разработке");
  }
};

module.exports = {
  sslConfig,
  generateSelfSignedCert,
  hasCertificates,
};
