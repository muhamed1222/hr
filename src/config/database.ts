import { Sequelize } from 'sequelize';
import logger from './logging';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'hr_user',
  password: process.env.DB_PASSWORD || 'your_password',
  database: process.env.DB_NAME || 'hr_db',
  logging: (msg) => logger.debug(msg)
});

export { sequelize }; 