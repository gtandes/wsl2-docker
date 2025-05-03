const atsRoleId = "1d46885c-b28e-401b-952e-0dc77a01c1ce";

module.exports = {
  async up(knex) {
    await knex("directus_roles")
      .update({
        app_access: false,
      })
      .where("id", atsRoleId);
  },

  async down(knex) {},
};
