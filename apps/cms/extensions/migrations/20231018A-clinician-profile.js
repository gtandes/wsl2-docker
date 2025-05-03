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

const permissions = [permission(clinician, "directus_users", "update", { _and: [{ id: { _eq: "$CURRENT_USER" } }] })];

module.exports = {
  async up(knex) {
    await knex("directus_permissions").insert(permissions);
  },

  async down() {},
};
