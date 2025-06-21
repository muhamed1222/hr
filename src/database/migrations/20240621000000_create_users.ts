import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('username').notNullable().unique();
    table.string('email').unique();
    table.string('password_hash');
    table.string('telegram_id').unique();
    table.string('telegram_username');
    table.string('role').defaultTo('user');
    table.boolean('is_active').defaultTo(true);
    table.jsonb('settings').defaultTo('{}');
    table.string('status').defaultTo('active');
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('users');
} 