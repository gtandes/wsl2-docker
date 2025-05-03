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

const permissions = [permission("junction_directus_users_exams", "update"), permission("exam_results", "create")];

module.exports = {
  async up(knex) {
    await knex("directus_permissions").insert(permissions);
  },

  async down() {},
};
