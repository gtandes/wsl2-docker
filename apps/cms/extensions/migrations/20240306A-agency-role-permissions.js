const agency = "122c0248-4037-49ae-8c82-43a5e7f1d9c5";

function permission(collection, action, permissions = {}, validation = {}, fields = "*", presets = null) {
  return {
    role: agency,
    collection,
    action,
    permissions,
    validation,
    presets,
    fields,
  };
}

const permissions = [
  permission("junction_modules_definition_agencies", "read", {
    _and: [
      {
        _or: [
          { agencies_id: { id: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } } },
          { agencies_id: { id: { _null: true } } },
        ],
      },
    ],
  }),
];

module.exports = {
  async up(knex) {
    await knex("directus_permissions").insert(permissions);
  },

  async down() {},
};
