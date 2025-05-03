const ats = "1d46885c-b28e-401b-952e-0dc77a01c1ce";
const clinician = "8be9ecec-947d-4f53-932a-bdd6a779d8f8";

const belongsToAgency = { _and: [{ id: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } }] };
const userFieldsAllow = "id,first_name,last_name,email,exams,agencies,documents,policies,modules,sc_definitions";

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
  permission("agencies", "read", belongsToAgency, {}, "id,name,logo"),
  permission("directus_users", "read", {}, {}, userFieldsAllow),
  permission("directus_users", "create", {}, {}, userFieldsAllow, {
    status: "active",
    role: clinician,
  }),
  permission(
    "junction_directus_users_agencies",
    "create",
    {},
    {
      _and: [{ agencies_id: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } }],
    },
    "id,directus_users_id,agencies_id",
  ),
  permission("directus_files", "read", {}, {}, "id"),
  permission("bundles", "read", {}, {}, "id,name,agency,exams,modules,skills_checklists,policies,documents"),
  permission("exams", "read", {}, {}, "id,title,status,exam_versions"),
  permission("exam_versions", "read", {}, {}, "id,allowed_attempts,expiration"),
  permission("modules_definition", "read", {}, {}, "id,title,last_version,status"),
  permission("modules_versions", "read", {}, {}, "allowed_attempts,expiration"),
  permission("sc_definitions", "read", {}, {}, "id,title,status"),
  permission("policies", "read", {}, {}, "id,name,status"),
  permission("documents", "read", {}, {}, "id,title,status"),
  permission("junction_bundles_exams", "read", {}, {}, "exams_id"),
  permission("junction_bundles_modules_definition", "read", {}, {}, "modules_definition_id"),
  permission("junction_bundles_sc_definitions", "read", {}, {}, "sc_definitions_id"),
  permission("junction_bundles_policies", "read", {}, {}, "policies_id"),
  permission("junction_bundles_documents", "read", {}, {}, "documents_id"),
  permission(
    "junction_directus_users_agencies",
    "read",
    { _and: [{ agencies_id: { id: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } } }] },
    {},
    "directus_users_id,specialties,locations,departments,supervisors,agencies_id,id",
  ),
  permission(
    "junction_directus_users_exams",
    "create",
    {},
    { _and: [{ agency: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } }] },
    "agency,exams_id,allowed_attempts,directus_users_id,status,due_date,exam_versions_id,expires_on,bundle_id",
  ),
  permission(
    "junction_directus_users_exams",
    "read",
    { _and: [{ agency: { id: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } } }] },
    {},
    "allowed_attempts,exams_id,status",
  ),
  permission(
    "junction_directus_users_documents",
    "create",
    {},
    { _and: [{ agency: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } }] },
    "directus_users_id,documents_id,due_date,expires_on,bundle_id,agency",
  ),
  permission(
    "junction_directus_users_documents",
    "read",
    { _and: [{ agency: { id: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } } }] },
    {},
    "documents_id,status",
  ),
  permission(
    "junction_directus_users_policies",
    "create",
    {},
    { _and: [{ agency: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } }] },
    "agency,policies_id,directus_users_id,expires_on,due_date,bundle_id",
  ),
  permission(
    "junction_directus_users_policies",
    "read",
    {},
    { _and: [{ agency: { id: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } } }] },
    "policies_id,status",
  ),
  permission(
    "junction_modules_definition_directus_users",
    "create",
    {},
    { _and: [{ agency: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } }] },
    "agency,directus_users_id,status,modules_definition_id,cert_code,allowed_attempts,expires_on,bundle_id,assigned_on,due_date",
  ),
  permission(
    "junction_modules_definition_directus_users",
    "read",
    { _and: [{ agency: { id: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } } }] },
    {},
    "modules_definition_id,status",
  ),
  permission(
    "junction_sc_definitions_directus_users",
    "create",
    {},
    { _and: [{ agency: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } }] },
    "agency,directus_users_id,sc_definitions_id,status,due_date,assigned_on,expires_on,bundle_id",
  ),
  permission(
    "junction_sc_definitions_directus_users",
    "read",
    { _and: [{ agency: { id: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } } }] },
    {},
    "sc_definitions_id,status",
  ),
];

module.exports = {
  async up(knex) {
    await knex.raw(
      "CREATE UNIQUE INDEX idx_directus_users_agencies ON junction_directus_users_agencies(agencies_id uuid_ops,directus_users_id uuid_ops);",
    );
    await knex("directus_permissions").insert(permissions);
  },

  async down() {},
};
