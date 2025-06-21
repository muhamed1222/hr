import { Sequelize } from 'sequelize';
import { logger } from './logging';

const sequelize = new Sequelize({
  dialect: process.env.DB_DIALECT as 'postgres' | 'mysql' | 'sqlite' | 'mariadb' | 'mssql',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  logging: (msg) => logger.debug(msg)
});

export { sequelize }; 