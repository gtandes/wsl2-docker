module.exports = {
  async up(knex) {
    await knex.schema.table("junction_directus_users_agencies", function (table) {
      table.index("agencies_id", "idx_agencies_id");
      table.index("directus_users_id", "idx_directus_users_id");
    });

    await knex.schema.table("directus_users", function (table) {
      table.index("last_name", "idx_last_name");
      table.index("role", "idx_role");
      table.index("status", "idx_status");
    });
  },

  async down(knex) {
    await knex.schema.table("junction_directus_users_agencies", function (table) {
      table.dropIndex("agencies_id", "idx_agencies_id");
      table.dropIndex("directus_users_id", "idx_directus_users_id");
    });

    await knex.schema.table("directus_users", function (table) {
      table.dropIndex("last_name", "idx_last_name");
      table.dropIndex("role", "idx_role");
      table.dropIndex("status", "idx_status");
    });
  },
};
