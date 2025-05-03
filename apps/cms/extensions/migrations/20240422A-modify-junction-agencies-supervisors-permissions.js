const clinician = "8be9ecec-947d-4f53-932a-bdd6a779d8f8";

module.exports = {
  async up(knex) {
    await knex("directus_permissions")
      .where("role", clinician)
      .where("collection", "junction_directus_users_agencies_supervisors")
      .where("action", "read")
      .update({
        permissions: {},
      });
  },

  async down() {},
};
