"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
async function up(knex) {
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
async function down(knex) {
    return knex.schema.dropTable('users');
}
