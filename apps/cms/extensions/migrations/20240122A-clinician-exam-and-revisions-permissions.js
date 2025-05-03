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
  permission("junction_directus_users_exams", "update", { _and: [{ directus_users_id: { _eq: "$CURRENT_USER" } }] }),
  permission("exam_results", "create"),
  permission("exam_results", "read", { _and: [{ assignment_id: { directus_users_id: { _eq: "$CURRENT_USER" } } }] }),
  permission("exam_version", "read"),
  permission("exam_version", "update"),
  permission("directus_roles", "read"),
  permission("directus_revisions", "read"),
];

module.exports = {
  async up(knex) {
    await knex("directus_permissions").insert(permissions);
  },

  async down() {},
};
