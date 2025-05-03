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

const clinician = "8be9ecec-947d-4f53-932a-bdd6a779d8f8";

const permissions = [
  // Fix Clinician User can't start a SC

  permission(clinician, "junction_sc_definition_directus_users", "update", {
    _and: [
      {
        sc_definitions_id: {
          id: {
            _in: ["$CURRENT_USER.sc_definitions.sc_definitions_id.id"],
          },
        },
      },
    ],
  }),
  permission(clinician, "sc_versions", "update", {
    _and: [
      {
        definition: {
          id: {
            _in: ["$CURRENT_USER.sc_definitions.sc_definitions_id.id"],
          },
        },
      },
    ],
  }),
];

module.exports = {
  async up(knex) {
    await knex("directus_permissions").insert(permissions);
  },
  async down() {},
};
