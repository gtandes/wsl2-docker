module.exports = {
  async up(knex) {
    await knex("directus_permissions").insert([
      {
        role: "8be9ecec-947d-4f53-932a-bdd6a779d8f8",
        collection: "junction_sc_definitions_directus_users",
        action: "update",
        permissions: {
          _and: [
            {
              sc_definitions_id: {
                id: {
                  _in: ["$CURRENT_USER.sc_definitions.sc_definitions_id.id"],
                },
              },
            },
          ],
        },
        validation: {},
        presets: null,
        fields: "*",
      },
    ]);
  },
  async down() {},
};
