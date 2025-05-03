module.exports = {
  async up(knex) {
    await knex("directus_roles").insert({
      id: "3f9c2b6e-8d47-4a60-bf3c-12e9a0f5d2b8",
      name: "Platform User",
      icon: "code",
      admin_access: false,
      app_access: false,
    });
  },

  async down(knex) {
    await knex("directus_roles").where("id", "3f9c2b6e-8d47-4a60-bf3c-12e9a0f5d2b8").del();
  },
};
