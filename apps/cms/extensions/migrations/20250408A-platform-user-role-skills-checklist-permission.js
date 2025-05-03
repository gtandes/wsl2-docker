const platformUser = "3f9c2b6e-8d47-4a60-bf3c-12e9a0f5d2b8";

module.exports = {
  async up(knex) {
    await knex("directus_permissions")
      .where({ collection: "junction_sc_definitions_directus_users", action: "update", role: platformUser })
      .update({
        fields: "*",
      })
      .limit(1);
  },

  async down() {},
};
