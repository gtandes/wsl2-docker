const roles = {
  hshAdmin: "cc987fae-dbb9-4d72-8199-21243fa13c92",
  agency: "122c0248-4037-49ae-8c82-43a5e7f1d9c5",
  clinician: "8be9ecec-947d-4f53-932a-bdd6a779d8f8",
};

const isFromAgency = {
  _and: [{ agency: { id: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } } }],
};

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

const permissions = [
  // Admin
  permission(roles.hshAdmin, "junction_directus_users_policies", "create"),
  permission(roles.hshAdmin, "junction_directus_users_policies", "read"),
  permission(roles.hshAdmin, "junction_directus_users_policies", "update"),
  permission(roles.hshAdmin, "junction_directus_users_policies", "delete"),
  // Agency Users
  permission(roles.agency, "junction_directus_users_policies", "create"),
  permission(roles.agency, "junction_directus_users_policies", "read", isFromAgency),
  permission(roles.agency, "junction_directus_users_policies", "update", isFromAgency),
  // Clinicians
  permission(roles.clinician, "junction_directus_users_policies", "read", isFromAgency),
  permission(roles.clinician, "junction_directus_users_policies", "update", isFromAgency),
];

module.exports = {
  async up(knex) {
    await knex("directus_permissions").insert(permissions);
  },
  async down() {},
};
