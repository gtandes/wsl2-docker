module.exports = {
  async up(knex) {
    await knex.raw("CREATE SCHEMA IF NOT EXISTS lrsql");
  },
  async down(knex) {},
};
