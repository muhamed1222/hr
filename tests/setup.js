const { sequelize } = require('../src/config/database');

beforeAll(async () => {
  // Очищаем базу данных перед всеми тестами
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  // Закрываем соединение с базой данных
  await sequelize.close();
}); 