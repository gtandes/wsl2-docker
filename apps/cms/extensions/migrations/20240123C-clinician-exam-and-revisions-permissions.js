const clinician = "8be9ecec-947d-4f53-932a-bdd6a779d8f8";

const belongsToUser = { _and: [{ directus_users_id: { _eq: "$CURRENT_USER" } }] };

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
  permission("junction_directus_users_exams", "read", belongsToUser),
  permission("junction_directus_users_exams", "update", belongsToUser),
  permission("exam_results", "create"),
  permission("exam_results", "read", { _and: [{ assignment_id: { directus_users_id: { _eq: "$CURRENT_USER" } } }] }),
  permission("exam_version", "read"),
  permission("exam_version", "update"),
  permission("directus_roles", "read"),
  permission("directus_revisions", "read"),
];

module.exports = {
  async up(knex) {
    const directus_permissions = "directus_permissions";
    await knex(directus_permissions)
      .where("role", clinician)
      .where("collection", "junction_directus_users_exams")
      .where("action", "read")
      .del();
    await knex(directus_permissions)
      .where("role", clinician)
      .where("collection", "junction_directus_users_exams")
      .where("action", "update")
      .del();
    await knex(directus_permissions)
      .where("role", clinician)
      .where("collection", "exam_results")
      .where("action", "create")
      .del();
    await knex(directus_permissions)
      .where("role", clinician)
      .where("collection", "exam_results")
      .where("action", "read")
      .del();
    await knex(directus_permissions)
      .where("role", clinician)
      .where("collection", "exam_version")
      .where("action", "read")
      .del();
    await knex(directus_permissions)
      .where("role", clinician)
      .where("collection", "exam_version")
      .where("action", "update")
      .del();
    await knex(directus_permissions)
      .where("role", clinician)
      .where("collection", "directus_roles")
      .where("action", "read")
      .del();
    await knex(directus_permissions)
      .where("role", clinician)
      .where("collection", "directus_revisions")
      .where("action", "read")
      .del();

    await knex(directus_permissions).insert(permissions);
  },

  async down() {},
};
