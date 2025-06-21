# SSL Certificates

Эта директория предназначена для хранения SSL-сертификатов.

## Структура

```
certs/
  ├── production/
  │   ├── cert.pem
  │   └── key.pem
  └── development/
      ├── cert.pem
      └── key.pem
```

## Безопасность

- Никогда не коммитьте сертификаты в репозиторий
- Храните резервные копии в безопасном месте
- Используйте разные сертификаты для разработки и продакшена

## Генерация self-signed сертификатов для разработки

```bash
# Создать директорию для development сертификатов
mkdir -p development

# Сгенерировать self-signed сертификат
openssl req -x509 -newkey rsa:4096 -keyout development/key.pem -out development/cert.pem -days 365 -nodes
```

## Продакшен сертификаты

Для продакшена используйте сертификаты от доверенных центров сертификации (CA):
1. Let's Encrypt
2. DigiCert
3. Sectigo
4. GlobalSign

## Настройка

1. Скопируйте ваши сертификаты в соответствующую директорию (production/development)
2. Убедитесь, что права доступа настроены правильно:
   ```bash
   chmod 600 production/key.pem
   chmod 644 production/cert.pem
   ```
3. Обновите конфигурацию в `.env`: 