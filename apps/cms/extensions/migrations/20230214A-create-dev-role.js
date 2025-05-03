module.exports = {
  async up(knex) {
    await knex("directus_roles").insert({
      id: "cd4bfb95-9145-4bad-aa88-a3810f15a976",
      name: "Developer",
      icon: "code",
      admin_access: true,
      app_access: true,
    });
  },

  async down(knex) {
    await knex("directus_roles").where("id", "cd4bfb95-9145-4bad-aa88-a3810f15a976").del();
  },
};
