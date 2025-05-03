const ats = "1d46885c-b28e-401b-952e-0dc77a01c1ce";

function permission(collection, action, permissions = {}, validation = {}, fields = "*", presets = null) {
  return {
    role: ats,
    collection,
    action,
    permissions,
    validation,
    presets,
    fields,
  };
}

const permissions = [
  permission(
    "junction_directus_users_documents",
    "read",
    {
      _and: [
        {
          _and: [
            { agency: { id: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } } },
            { status: { _neq: "archived" } },
          ],
        },
      ],
    },
    {},
    "documents_id,status,read,assigned_on,expires_on,due_date,agency",
  ),
  permission(
    "junction_directus_users_policies",
    "read",
    {},
    {
      _and: [
        {
          _and: [
            { agency: { id: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } } },
            { status: { _neq: "archived" } },
          ],
        },
      ],
    },
    "policies_id,status,signed_on,read,assigned_on,expires_on,due_date,agency",
  ),
  permission(
    "junction_directus_users_exams",
    "read",
    {
      _and: [
        {
          _and: [
            { agency: { id: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } } },
            { status: { _neq: "archived" } },
          ],
        },
      ],
    },
    {},
    "allowed_attempts,exams_id,status,score,finished_on,started_on,expires_on,due_date,exam_versions_id,agency",
  ),
  permission(
    "junction_modules_definition_directus_users",
    "read",
    {
      _and: [
        {
          _and: [
            { agency: { id: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } } },
            { status: { _neq: "archived" } },
          ],
        },
      ],
    },
    {},
    "modules_definition_id,status,score,finished_on,assigned_on,started_on,due_date,expires_on,agency",
  ),
  permission(
    "junction_sc_definitions_directus_users",
    "read",
    {
      _and: [
        {
          _and: [
            { agency: { id: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } } },
            { status: { _neq: "archived" } },
          ],
        },
      ],
    },
    {},
    "sc_definitions_id,status,assigned_on,due_date,finished_on,expires_on,agency",
  ),
];

module.exports = {
  async up(knex) {
    await knex("directus_permissions")
      .where("role", ats)
      .where("collection", "junction_directus_users_documents")
      .where("action", "read")
      .del();
    await knex("directus_permissions")
      .where("role", ats)
      .where("collection", "junction_directus_users_policies")
      .where("action", "read")
      .del();
    await knex("directus_permissions")
      .where("role", ats)
      .where("collection", "junction_directus_users_exams")
      .where("action", "read")
      .del();
    await knex("directus_permissions")
      .where("role", ats)
      .where("collection", "junction_modules_definition_directus_users")
      .where("action", "read")
      .del();
    await knex("directus_permissions")
      .where("role", ats)
      .where("collection", "junction_sc_definitions_directus_users")
      .where("action", "read")
      .del();
    await knex("directus_permissions").insert(permissions);
  },

  async down() {},
};
