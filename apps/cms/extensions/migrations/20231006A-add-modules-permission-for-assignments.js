const roles = {
  hshAdmin: "cc987fae-dbb9-4d72-8199-21243fa13c92",
  agency: "122c0248-4037-49ae-8c82-43a5e7f1d9c5",
};

function permission(role = "", collection, action, permissions = {}, validation = {}, fields = "*", presets = null) {
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
  // HSH Admin User
  permission(roles.hshAdmin, "junction_modules_definition_directus_users", "create"),
  permission(roles.hshAdmin, "junction_modules_definition_directus_users", "read"),
  permission(roles.hshAdmin, "junction_modules_definition_directus_users", "update"),
  permission(roles.hshAdmin, "junction_modules_definition_directus_users", "delete"),

  // Agency User

  permission(roles.agency, "junction_modules_definition_directus_users", "create"),
  permission(roles.agency, "junction_modules_definition_directus_users", "read"),
  permission(roles.agency, "junction_modules_definition_directus_users", "update"),
  permission(roles.agency, "junction_modules_definition_directus_users", "delete"),

  permission(roles.agency, "modules_definition", "create"),
];

module.exports = {
  async up(knex) {
    await knex("directus_permissions").insert(permissions);
  },
  async down() {},
};
