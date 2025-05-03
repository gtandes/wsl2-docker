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
  permission("junction_modules_definition_directus_users", "read", {
    _and: [{ id: { _in: ["$CURRENT_USER.modules.id"] } }],
  }),
];

module.exports = {
  async up(knex) {
    await knex("directus_permissions").insert(permissions);
  },

  async down() {},
};
