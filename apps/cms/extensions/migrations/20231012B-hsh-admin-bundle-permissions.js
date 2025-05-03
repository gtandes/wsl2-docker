function permission(collection, action, permissions = {}, validation = {}, fields = "*", presets = null) {
  return {
    role: "cc987fae-dbb9-4d72-8199-21243fa13c92",
    collection,
    action,
    permissions,
    validation,
    presets,
    fields,
  };
}

const permissions = [
  permission("bundles", "create", {}),
  permission("bundles", "read", {}),
  permission("bundles", "update", {}),
  permission("junction_bundles_documents", "create", {}),
  permission("junction_bundles_documents", "read", {}),
  permission("junction_bundles_documents", "update", {}),
  permission("junction_bundles_exams", "create", {}),
  permission("junction_bundles_exams", "read", {}),
  permission("junction_bundles_exams", "update", {}),
  permission("junction_bundles_modules_definition", "create", {}),
  permission("junction_bundles_modules_definition", "read", {}),
  permission("junction_bundles_modules_definition", "update", {}),
  permission("junction_bundles_policies", "create", {}),
  permission("junction_bundles_policies", "read", {}),
  permission("junction_bundles_policies", "update", {}),
  permission("junction_bundles_sc_definitions", "create", {}),
  permission("junction_bundles_sc_definitions", "read", {}),
  permission("junction_bundles_sc_definitions", "update", {}),
];

module.exports = {
  async up(knex) {
    await knex("directus_permissions").insert(permissions);
  },
  async down(knex) {},
};
