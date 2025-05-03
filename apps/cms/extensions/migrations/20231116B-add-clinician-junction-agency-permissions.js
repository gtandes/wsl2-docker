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
  permission("departments", "read", {
    _and: [
      {
        id: {
          _in: ["$CURRENT_USER.agencies.agencies_id.departments.departments_id.id"],
        },
      },
    ],
  }),
  permission("junction_directus_users_agencies_departments", "read", {
    _and: [
      {
        id: {
          _in: ["$CURRENT_USER.agencies.agencies_id.departments.id"],
        },
      },
    ],
  }),

  permission("specialties", "read", {
    _and: [
      {
        id: {
          _in: ["$CURRENT_USER.agencies.agencies_id.specialties.specialties_id.id"],
        },
      },
    ],
  }),
  permission("junction_directus_users_agencies_specialties", "read", {
    _and: [{ id: { _in: ["$CURRENT_USER.agencies.agencies_id.specialties.id"] } }],
  }),

  permission("locations", "read", {
    _and: [{ id: { _in: ["$CURRENT_USER.agencies.agencies_id.locations.locations_id.id"] } }],
  }),
  permission("junction_directus_users_agencies_locations", "read", {
    _and: [{ id: { _in: ["$CURRENT_USER.agencies.agencies_id.locations.id"] } }],
  }),

  permission("junction_directus_users_agencies_supervisors", "read", {
    _and: [{ id: { _in: ["$CURRENT_USER.agencies.supervisors.id"] } }],
  }),
];

module.exports = {
  async up(knex) {
    await knex("directus_permissions").insert(permissions);
  },

  async down() {},
};
