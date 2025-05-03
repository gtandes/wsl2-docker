module.exports = {
  async up(knex) {
    await knex("directus_roles").insert({
      id: "fb7c8da4-685c-11ee-8c99-0242ac120002",
      name: "Users Manager",
      icon: "supervised_user_circle",
      admin_access: false,
      app_access: false,
    });
  },

  async down(knex) {
    await knex("directus_roles").where("id", "fb7c8da4-685c-11ee-8c99-0242ac120002").del();
  },
};
