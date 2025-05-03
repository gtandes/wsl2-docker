module.exports = {
  async up(knex) {
    await knex("directus_permissions").insert([
      {
        role: "8be9ecec-947d-4f53-932a-bdd6a779d8f8",
        collection: "junction_modules_definition_directus_users",
        action: "read",
        permissions: {},
        validation: {},
        presets: null,
        fields: "*",
      },
    ]);
  },
  async down() {},
};
