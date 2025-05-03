const agency = "122c0248-4037-49ae-8c82-43a5e7f1d9c5";
const manager = "fb7c8da4-685c-11ee-8c99-0242ac120002";
const rule = {
  _and: [
    {
      _or: [
        { agencies_id: { id: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } } },
        { agencies_id: { id: { _null: true } } },
      ],
    },
  ],
};

function permission(role, collection, action, permissions = {}, validation = {}, fields = "*", presets = null) {
  return {
    role,
    collection,
    action,
    permissions,
    validation,
    presets,
    fields,
  };
}

const permissions = [
  permission(agency, "junction_modules_definition_agencies", "read", rule),
  permission(manager, "junction_modules_definition_agencies", "read", rule),
];

module.exports = {
  async up(knex) {
    await knex("directus_permissions")
      .where("role", agency)
      .where("collection", "junction_modules_definition_agencies")
      .where("action", "read")
      .del();
    await knex("directus_permissions").insert(permissions);
  },

  async down() {},
};
