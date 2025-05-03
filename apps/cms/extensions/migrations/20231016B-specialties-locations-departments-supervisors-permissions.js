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
  permission(hshAdmin, "specialties", "create"),
  permission(hshAdmin, "specialties", "read"),
  permission(hshAdmin, "specialties", "update"),
  permission(hshAdmin, "departments", "create"),
  permission(hshAdmin, "departments", "read"),
  permission(hshAdmin, "departments", "update"),
  permission(hshAdmin, "locations", "create"),
  permission(hshAdmin, "locations", "read"),
  permission(hshAdmin, "locations", "update"),
  permission(hshAdmin, "junction_directus_users_agencies_supervisors", "read"),
  permission(hshAdmin, "junction_directus_users_agencies_supervisors", "create"),
  permission(hshAdmin, "junction_directus_users_agencies_supervisors", "update"),
  permission(agencyUser, "specialties", "create"),
  permission(agencyUser, "specialties", "read"),
  permission(agencyUser, "specialties", "update"),
  permission(agencyUser, "departments", "create"),
  permission(agencyUser, "departments", "read"),
  permission(agencyUser, "departments", "update"),
  permission(agencyUser, "locations", "create"),
  permission(agencyUser, "locations", "read"),
  permission(agencyUser, "locations", "update"),
  permission(agencyUser, "junction_directus_users_agencies_supervisors", "read"),
  permission(agencyUser, "junction_directus_users_agencies_supervisors", "create"),
  permission(agencyUser, "junction_directus_users_agencies_supervisors", "update"),
];

module.exports = {
  async up(knex) {
    await knex("directus_permissions").insert(permissions);
    await knex("departments").insert([
      {
        id: "6767c280-6c0a-11ee-b962-0242ac120002",
        agency: "f212578f-47b6-4ee0-9203-584d82974ee4",
        name: "Department Capcom 1",
        status: "published",
      },
      {
        id: "8235b824-6c0a-11ee-b962-0242ac120002",
        agency: "f212578f-47b6-4ee0-9203-584d82974ee4",
        name: "Department Capcom 2",
        status: "published",
      },
      {
        id: "8701d1f8-6c0a-11ee-b962-0242ac120002",
        agency: "eb4c04d4-91aa-44b1-9169-1f3c6a5cf263",
        name: "Department Marvel 1",
        status: "published",
      },
      {
        id: "8ad991b2-6c0a-11ee-b962-0242ac120002",
        agency: "eb4c04d4-91aa-44b1-9169-1f3c6a5cf263",
        name: "Department Marvel 2",
        status: "published",
      },
    ]);
    await knex("locations").insert([
      {
        id: "ab3d6406-6c0a-11ee-b962-0242ac120002",
        agency: "f212578f-47b6-4ee0-9203-584d82974ee4",
        name: "Location Capcom 1",
        status: "published",
      },
      {
        id: "c44163d0-6c0a-11ee-b962-0242ac120002",
        agency: "f212578f-47b6-4ee0-9203-584d82974ee4",
        name: "Location Capcom 2",
        status: "published",
      },
      {
        id: "bf843a2a-6c0a-11ee-b962-0242ac120002",
        agency: "eb4c04d4-91aa-44b1-9169-1f3c6a5cf263",
        name: "Location Marvel 1",
        status: "published",
      },
      {
        id: "c7879af0-6c0a-11ee-b962-0242ac120002",
        agency: "eb4c04d4-91aa-44b1-9169-1f3c6a5cf263",
        name: "Location Marvel 2",
        status: "published",
      },
    ]);
    await knex("specialties").insert([
      {
        id: "f020ef66-6c0a-11ee-b962-0242ac120002",
        name: "Pediatrics",
        status: "published",
      },
      {
        id: "0c8ebe58-6c0b-11ee-b962-0242ac120002",
        name: "Critical Care",
        status: "published",
      },
    ]);
  },

  async down() {},
};
