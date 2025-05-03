const manager = "fb7c8da4-685c-11ee-8c99-0242ac120002";

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

module.exports = {
  async up(knex) {
    await knex("directus_permissions").insert([permission(manager, "modules_results", "read")]);
  },

  async down() {},
};
