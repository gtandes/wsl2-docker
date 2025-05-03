module.exports = {
  async up(knex) {
    await knex("directus_roles").insert({
      id: "1d46885c-b28e-401b-952e-0dc77a01c1ce",
      name: "Generic ATS",
      icon: "code",
      admin_access: false,
      app_access: true,
    });
  },

  async down(knex) {
    await knex("directus_roles").where("id", "1d46885c-b28e-401b-952e-0dc77a01c1ce").del();
  },
};
