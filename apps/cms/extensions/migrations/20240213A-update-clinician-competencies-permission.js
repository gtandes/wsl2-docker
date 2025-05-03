const clinician = "8be9ecec-947d-4f53-932a-bdd6a779d8f8";

function permission(collection, action, permissions = {}, validation = {}, fields = "*", presets = null) {
  return {
    role: clinician,
    collection,
    action,
    permissions,
    validation,
    presets,
    fields,
  };
}

const permissions = [
  permission("bundles", "read", { _and: [{ agency: { id: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } } }] }),
  permission("junction_bundles_documents", "read"),
  permission("junction_bundles_exams", "read"),
  permission("junction_bundles_modules_definition", "read"),
  permission("junction_bundles_policies", "read"),
  permission("junction_bundles_sc_definitions", "read"),
  permission("junction_directus_users_documents", "create"),
  permission("junction_directus_users_exams", "create"),
  permission("junction_directus_users_policies", "create"),
  permission("junction_modules_definition_directus_users", "create"),
];

module.exports = {
  async up(knex) {
    await knex("directus_permissions").insert(permissions);
  },

  async down() {},
};
