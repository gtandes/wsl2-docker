const agencyRole = "122c0248-4037-49ae-8c82-43a5e7f1d9c5";

module.exports = {
  async up(knex) {
    await knex("directus_permissions")
      .where("role", agencyRole)
      .where("collection", "junction_sc_definitions_agencies")
      .where("action", "read")
      .update({
        permissions: {},
      });
  },
  async down(knex) {},
};
