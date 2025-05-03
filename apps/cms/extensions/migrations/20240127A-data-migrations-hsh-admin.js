const HSHAdmin = "cc987fae-dbb9-4d72-8199-21243fa13c92";
function permission(collection, action, permissions = {}, validation = {}, fields = "*", presets = null) {
  return {
    role: HSHAdmin,
    collection,
    action,
    permissions,
    validation,
    presets,
    fields,
  };
}

const permissions = [permission("data_migrations", "read"), permission("data_migration_records", "read")];

module.exports = {
  async up(knex) {
    await knex("directus_permissions").insert(permissions);
  },

  async down() {},
};
