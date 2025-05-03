module.exports = {
  async up(knex) {
    await knex("directus_permissions").insert([
      {
        role: "122c0248-4037-49ae-8c82-43a5e7f1d9c5",
        collection: "junction_directus_users_exams",
        action: "delete",
        permissions: {
          _and: [
            {
              agency: {
                id: {
                  _in: ["$CURRENT_USER.agencies.agencies_id.id"],
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
