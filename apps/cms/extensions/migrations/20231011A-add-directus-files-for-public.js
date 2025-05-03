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

const permissions = [permission(null, "directus_files", "read")];

module.exports = {
  async up(knex) {
    await knex("directus_permissions").insert(permissions);
  },
  async down() {},
};
