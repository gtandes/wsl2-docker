function permission(collection, action, permissions = {}, validation = {}, fields = "*", presets = null) {
  return {
    role: "8be9ecec-947d-4f53-932a-bdd6a779d8f8",
    collection,
    action,
    permissions,
    validation,
    presets,
    fields,
  };
}

const permissions = [
  // Agencies
  permission("agencies", "read"),
  permission("junction_directus_users_agencies", "read"),

  // Categories
  permission("categories", "read"),

  // Documents
  permission("documents", "read"),
  permission("junction_documents_agencies", "read"),
  permission("junction_documents_categories", "read"),
  permission("junction_directus_users_documents", "read", {
    _and: [{ agency: { id: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } } }],
  }),
  permission("junction_directus_users_documents", "update", {
    _and: [{ agency: { id: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } } }],
  }),

  // Exams
  permission("exams", "read"),
  permission("exam_versions", "read"),
  permission("exam_results", "read"),
  permission("questions", "read"),
  permission("question_versions", "read"),
  permission("junction_directus_users_exams", "read"),
  permission("junction_exam_versions_questions", "read"),
  permission("junction_exams_agencies", "read"),
  permission("junction_exams_questions", "read"),
  permission("junction_exams_categories_specialties", "read"),
  permission("junction_exams_categories_subspecialties", "read"),

  // Modules
  permission("modules_definition", "read"),
  permission("modules_versions", "read"),
  permission("junction_modules_definition_agencies", "read"),

  // Policies
  permission("policies", "read"),
  permission("junction_policies_agencies", "read"),
  permission("junction_policies_categories", "read"),

  // Skills checklists
  permission("sc_definitions", "read"),
  permission("sc_versions", "read"),
  permission("junction_sc_definitions_agencies", "read"),
  permission("junction_sc_definitions_directus_users", "read"),

  // Directus
  permission("directus_files", "read"),
  permission("directus_users", "read"),
];
module.exports = {
  async up(knex) {
    await knex("directus_permissions").insert(permissions);
  },
  async down(knex) {},
};
