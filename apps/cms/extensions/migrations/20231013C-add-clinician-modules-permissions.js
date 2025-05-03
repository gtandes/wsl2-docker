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
  permission("8be9ecec-947d-4f53-932a-bdd6a779d8f8", "junction_modules_definition_directus_users", "update"),
  permission("8be9ecec-947d-4f53-932a-bdd6a779d8f8", "modules_versions", "update"),
];

module.exports = {
  async up(knex) {
    await knex("directus_permissions").insert(permissions);
  },
  async down() {},
};
