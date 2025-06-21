const logger = require('../config/logging');

const apiLogger = (req, res, next) => {
  const start = Date.now();

  // Логируем входящий запрос
  logger.api.request(req);

  // Перехватываем окончание запроса
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.api.response(req, res, { responseTime: duration });
  });

  next();
};

module.exports = apiLogger; 