const roles = {
  hshAdmin: "cc987fae-dbb9-4d72-8199-21243fa13c92",
  agency: "122c0248-4037-49ae-8c82-43a5e7f1d9c5",
};

const collections = {
  definition: "modules_definition",
  versions: "modules_versions",
  junction_agencies: "junction_modules_definition_agencies",
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
  permission(roles.hshAdmin, collections.definition, "create"),
  permission(roles.hshAdmin, collections.definition, "read"),
  permission(roles.hshAdmin, collections.definition, "update"),
  permission(roles.hshAdmin, collections.definition, "delete"),

  permission(roles.hshAdmin, collections.versions, "create"),
  permission(roles.hshAdmin, collections.versions, "read"),
  permission(roles.hshAdmin, collections.versions, "update"),
  permission(roles.hshAdmin, collections.versions, "delete"),

  permission(roles.hshAdmin, collections.junction_agencies, "create"),
  permission(roles.hshAdmin, collections.junction_agencies, "read"),
  permission(roles.hshAdmin, collections.junction_agencies, "update"),
  permission(roles.hshAdmin, collections.junction_agencies, "delete"),

  // Agency User
  permission(roles.agency, collections.definition, "read"),
  permission(roles.agency, collections.versions, "read"),
];

module.exports = {
  async up(knex) {
    await knex("directus_permissions").insert(permissions);
  },
  async down(knex) {},
};
