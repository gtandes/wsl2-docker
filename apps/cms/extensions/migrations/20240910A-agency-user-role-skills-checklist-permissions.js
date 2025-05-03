const agencyUser = "122c0248-4037-49ae-8c82-43a5e7f1d9c5";

module.exports = {
  async up(knex) {
    await knex("directus_permissions")
      .where({ collection: "junction_sc_definitions_directus_users", action: "update", role: agencyUser })
      .update({
        fields: "due_date,expiration_type",
      })
      .limit(1);
  },

  async down() {},
};
