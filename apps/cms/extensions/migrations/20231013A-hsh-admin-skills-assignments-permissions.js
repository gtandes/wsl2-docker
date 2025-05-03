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

const permissions = [permission("junction_sc_definitions_directus_users", "create", {})];

module.exports = {
  async up(knex) {
    await knex("directus_permissions").insert(permissions);
  },
  async down(knex) {},
};
