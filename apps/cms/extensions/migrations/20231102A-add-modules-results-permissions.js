const hshAdmin = "cc987fae-dbb9-4d72-8199-21243fa13c92";
const agencyUser = "122c0248-4037-49ae-8c82-43a5e7f1d9c5";
const clinician = "8be9ecec-947d-4f53-932a-bdd6a779d8f8";

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
  permission(hshAdmin, "modules_results", "create"),
  permission(hshAdmin, "modules_results", "read"),
  permission(hshAdmin, "modules_results", "update"),
  permission(hshAdmin, "modules_results", "delete"),

  permission(agencyUser, "modules_results", "create"),
  permission(agencyUser, "modules_results", "read"),

  permission(clinician, "junction_sc_definitions_directus_users", "create", {
    _and: [{ id: { _in: ["$CURRENT_USER.modules.id"] } }],
  }),
  permission(clinician, "modules_definition", "create", {
    _and: [{ id: { _in: ["$CURRENT_USER.modules.modules_definition_id.id"] } }],
  }),
  permission(clinician, "modules_versions", "create", {
    _and: [{ id: { _in: ["$CURRENT_USER.modules.modules_definition_id.versions.id"] } }],
  }),

  permission(clinician, "modules_results", "create"),
  permission(clinician, "modules_results", "read"),
];

module.exports = {
  async up(knex) {
    await knex("directus_permissions").insert(permissions);
  },

  async down() {},
};
