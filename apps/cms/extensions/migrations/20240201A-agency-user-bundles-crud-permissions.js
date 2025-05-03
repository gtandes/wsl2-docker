const agency = "122c0248-4037-49ae-8c82-43a5e7f1d9c5";

const belongsToAgency = {
  _and: [
    {
      _or: [
        {
          agencies: {
            agencies_id: {
              id: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] },
            },
          },
        },
      ],
    },
    { status: { _eq: "published" } },
  ],
};

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
  permission("exams", "update", belongsToAgency),
  permission("modules_definition", "update", belongsToAgency),
];

module.exports = {
  async up(knex) {
    await knex("directus_permissions").insert(permissions);
  },

  async down() {},
};
