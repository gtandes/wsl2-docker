module.exports = {
  async up(knex) {
    await knex.schema.table("directus_activity", function (table) {
      table.index(["action", "timestamp"], "idx_directus_activity_action_timestamp");
      table.index(["user", "collection"], "idx_directus_activity_user_collection");
      table.index(["ip", "timestamp"], "idx_directus_activity_ip_timestamp");
    });
  },

  async down(knex) {
    await knex.schema.table("directus_activity", function (table) {
      table.dropIndex(["action", "timestamp"], "idx_directus_activity_action_timestamp");
      table.dropIndex(["user", "collection"], "idx_directus_activity_user_collection");
      table.dropIndex(["ip", "timestamp"], "idx_directus_activity_ip_timestamp");
    });
  },
};
