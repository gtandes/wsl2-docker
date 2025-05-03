const clinician = "8be9ecec-947d-4f53-932a-bdd6a779d8f8";
const rule = { _and: [{ assignment_id: { directus_users_id: { _eq: "$CURRENT_USER" } } }] };

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

const permissions = [permission(clinician, "exam_results", "update", rule, {}, "correct,time_taken")];

module.exports = {
  async up(knex) {
    await knex("directus_permissions").insert(permissions);
  },

  async down() {},
};
