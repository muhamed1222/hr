import type { Knex } from 'knex';
import dotenv from 'dotenv';

dotenv.config();

interface IKnexConfig {
  [key: string]: Knex.Config;
}

const config: IKnexConfig = {
  development: {
    client: 'pg',
    connection: process.env.DATABASE_URL || {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'hr_db',
      user: process.env.DB_USER || 'user',
      password: process.env.DB_PASSWORD || 'password',
    },
    migrations: {
      directory: './src/database/migrations',
      extension: 'ts',
    },
    seeds: {
      directory: './src/database/seeds',
      extension: 'ts',
    },
  },

  test: {
    client: 'better-sqlite3',
    connection: ':memory:',
    useNullAsDefault: true,
    migrations: {
      directory: './src/database/migrations',
      extension: 'ts',
    },
    seeds: {
      directory: './src/database/seeds',
      extension: 'ts',
    },
  },

  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      directory: './dist/database/migrations',
    },
    seeds: {
      directory: './dist/database/seeds',
    },
  },
};

export default config; 