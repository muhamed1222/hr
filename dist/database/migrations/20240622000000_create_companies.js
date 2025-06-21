"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
async function up(knex) {
    await knex.schema.createTable('companies', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.string('name').notNullable().unique();
        table.timestamps(true, true);
    });
    // Add company_id to users table
    await knex.schema.alterTable('users', (table) => {
        table.uuid('company_id').references('id').inTable('companies').onDelete('CASCADE');
    });
}
async function down(knex) {
    await knex.schema.alterTable('users', (table) => {
        table.dropColumn('company_id');
    });
    await knex.schema.dropTable('companies');
}
