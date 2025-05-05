module.exports = {
  async up(knex) {
    await knex.schema.table("directus_revisions", function (table) {
      table.index(["activity", "collection", "item"], "idx_directus_revisions_activity_collection_item");
    });
  },

  async down(knex) {
    await knex.schema.table("directus_revisions", function (table) {
      table.dropIndex(["activity", "collection", "item"], "idx_directus_revisions_activity_collection_item");
    });
  },
};
