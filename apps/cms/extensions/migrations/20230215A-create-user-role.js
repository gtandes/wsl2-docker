module.exports = {
  async up(knex) {
    await knex("directus_roles").insert({
      id: "8be9ecec-947d-4f53-932a-bdd6a779d8f8",
      name: "User",
      icon: "supervised_user_circle",
      admin_access: false,
      app_access: false,
    });
  },

  async down(knex) {
    await knex("directus_roles").where("id", "8be9ecec-947d-4f53-932a-bdd6a779d8f8").del();
  },
};
