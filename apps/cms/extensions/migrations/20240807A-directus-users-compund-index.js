module.exports = {
  async up(knex) {
    await knex.schema.table("directus_users", function (table) {
      table.index(["status", "id"], "idx_directus_users_status_id");
    });
  },

  async down(knex) {
    await knex.schema.table("directus_users", function (table) {
      table.dropIndex(["status", "id"], "idx_directus_users_status_id");
    });
  },
};
