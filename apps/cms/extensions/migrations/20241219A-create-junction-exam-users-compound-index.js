module.exports = {
  async up(knex) {
    await knex.schema.raw(`
      CREATE INDEX idx_junction_users_exams_status_finished 
      ON junction_directus_users_exams (status, finished_on DESC)
    `);
  },
  async down(knex) {
    await knex.schema.raw(`
      DROP INDEX IF EXISTS idx_junction_users_exams_status_finished
    `);
  },
};
