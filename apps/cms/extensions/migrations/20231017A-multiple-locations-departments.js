const hshAdmin = "cc987fae-dbb9-4d72-8199-21243fa13c92";
const agencyUser = "122c0248-4037-49ae-8c82-43a5e7f1d9c5";

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
  permission(hshAdmin, "junction_directus_users_agencies_specialties", "read"),
  permission(hshAdmin, "junction_directus_users_agencies_specialties", "create"),
  permission(hshAdmin, "junction_directus_users_agencies_specialties", "update"),
  permission(hshAdmin, "junction_directus_users_agencies_locations", "read"),
  permission(hshAdmin, "junction_directus_users_agencies_locations", "create"),
  permission(hshAdmin, "junction_directus_users_agencies_locations", "update"),
  permission(hshAdmin, "junction_directus_users_agencies_departments", "read"),
  permission(hshAdmin, "junction_directus_users_agencies_departments", "create"),
  permission(hshAdmin, "junction_directus_users_agencies_departments", "update"),
  permission(agencyUser, "junction_directus_users_agencies_specialties", "read"),
  permission(agencyUser, "junction_directus_users_agencies_specialties", "create"),
  permission(agencyUser, "junction_directus_users_agencies_specialties", "update"),
  permission(agencyUser, "junction_directus_users_agencies_locations", "read"),
  permission(agencyUser, "junction_directus_users_agencies_locations", "create"),
  permission(agencyUser, "junction_directus_users_agencies_locations", "update"),
  permission(agencyUser, "junction_directus_users_agencies_departments", "read"),
  permission(agencyUser, "junction_directus_users_agencies_departments", "create"),
  permission(agencyUser, "junction_directus_users_agencies_departments", "update"),
];

module.exports = {
  async up(knex) {
    await knex("directus_permissions").insert(permissions);
  },

  async down() {},
};
