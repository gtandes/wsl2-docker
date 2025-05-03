const credentialingUser = "05bdccb9-dbff-4a45-bfb7-47abe151badb";
module.exports = {
  async up(knex) {
    await knex("directus_permissions")
      .where({ collection: "junction_sc_definitions_directus_users", action: "update", role: credentialingUser })
      .update({
        fields: "due_date,expiration_type",
      })
      .limit(1);
  },
  async down() {},
};
