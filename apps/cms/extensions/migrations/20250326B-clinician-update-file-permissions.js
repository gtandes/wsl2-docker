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
  permission("directus_files", "create"),
  permission("directus_files", "update", {}, { uploaded_by: { _eq: "$CURRENT_USER" } }),
];

module.exports = {
  async up(knex) {
    await knex("directus_permissions").insert(permissions);
  },
  async down(knex) {},
};
