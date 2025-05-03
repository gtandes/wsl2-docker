function permission(collection, action, permissions = {}, validation = {}, fields = "*", presets = null) {
  return {
    role: "122c0248-4037-49ae-8c82-43a5e7f1d9c5",
    collection,
    action,
    permissions,
    validation,
    presets,
    fields,
  };
}

const permissions = [permission("junction_sc_definitions_agencies", "read"), permission("agencies", "read")];

module.exports = {
  async up(knex) {
    await knex("directus_permissions").insert(permissions);
  },
  async down(knex) {},
};
