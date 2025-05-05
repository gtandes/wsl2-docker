const agency = "122c0248-4037-49ae-8c82-43a5e7f1d9c5";
const manager = "fb7c8da4-685c-11ee-8c99-0242ac120002";

function permission(role, collection, action, permissions = {}, validation = {}, fields = "*", presets = null) {
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

const examsReadPermissions = {
  _and: [
    {
      _or: [
        { bundles_id: { agency: { id: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } } } },
        {
          _or: [
            { exams_id: { agencies: { agencies_id: { id: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } } } } },
            { exams_id: { agencies: { agencies_id: { id: { _null: true } } } } },
          ],
        },
      ],
    },
  ],
};
const documentsReadPermissions = {
  _and: [
    {
      _or: [
        { bundles_id: { agency: { id: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } } } },
        {
          _or: [
            { documents_id: { agencies: { agencies_id: { id: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } } } } },
            { documents_id: { agencies: { agencies_id: { id: { _null: true } } } } },
          ],
        },
      ],
    },
  ],
};
const modulesReadPermissions = {
  _and: [
    {
      _or: [
        { bundles_id: { agency: { id: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } } } },
        {
          _or: [
            {
              modules_definition_id: {
                agencies: { agencies_id: { id: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } } },
              },
            },
            { modules_definition_id: { agencies: { agencies_id: { id: { _null: true } } } } },
          ],
        },
      ],
    },
  ],
};
const policiesReadPermissions = {
  _and: [
    {
      _or: [
        { bundles_id: { agency: { id: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } } } },
        {
          _or: [
            { policies_id: { agencies: { agencies_id: { id: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } } } } },
            { policies_id: { agencies: { agencies_id: { id: { _null: true } } } } },
          ],
        },
      ],
    },
  ],
};
const scReadPermissions = {
  _and: [
    {
      _or: [
        { bundles_id: { agency: { id: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } } } },
        {
          _or: [
            { sc_definitions_id: { agency: { agencies_id: { id: { _null: true } } } } },
            {
              sc_definitions_id: {
                agency: { agencies_id: { id: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } } },
              },
            },
          ],
        },
      ],
    },
  ],
};

const permissions = [
  permission(agency, "junction_bundles_exams", "read", examsReadPermissions),
  permission(manager, "junction_bundles_exams", "read", examsReadPermissions),
  permission(agency, "junction_bundles_documents", "read", documentsReadPermissions),
  permission(manager, "junction_bundles_documents", "read", documentsReadPermissions),
  permission(agency, "junction_bundles_modules_definition", "read", modulesReadPermissions),
  permission(manager, "junction_bundles_modules_definition", "read", modulesReadPermissions),
  permission(agency, "junction_bundles_policies", "read", policiesReadPermissions),
  permission(manager, "junction_bundles_policies", "read", policiesReadPermissions),
  permission(agency, "junction_bundles_sc_definitions", "read", scReadPermissions),
  permission(manager, "junction_bundles_sc_definitions", "read", scReadPermissions),
];

module.exports = {
  async up(knex) {
    await knex("directus_permissions")
      .where("role", agency)
      .where("collection", "junction_bundles_exams")
      .where("action", "read")
      .del();
    await knex("directus_permissions")
      .where("role", manager)
      .where("collection", "junction_bundles_exams")
      .where("action", "read")
      .del();
    await knex("directus_permissions")
      .where("role", agency)
      .where("collection", "junction_bundles_documents")
      .where("action", "read")
      .del();
    await knex("directus_permissions")
      .where("role", manager)
      .where("collection", "junction_bundles_documents")
      .where("action", "read")
      .del();
    await knex("directus_permissions")
      .where("role", agency)
      .where("collection", "junction_bundles_modules_definition")
      .where("action", "read")
      .del();
    await knex("directus_permissions")
      .where("role", manager)
      .where("collection", "junction_bundles_modules_definition")
      .where("action", "read")
      .del();
    await knex("directus_permissions")
      .where("role", agency)
      .where("collection", "junction_bundles_policies")
      .where("action", "read")
      .del();
    await knex("directus_permissions")
      .where("role", manager)
      .where("collection", "junction_bundles_policies")
      .where("action", "read")
      .del();
    await knex("directus_permissions")
      .where("role", agency)
      .where("collection", "junction_bundles_sc_definitions")
      .where("action", "read")
      .del();
    await knex("directus_permissions")
      .where("role", manager)
      .where("collection", "junction_bundles_sc_definitions")
      .where("action", "read")
      .del();

    await knex("directus_permissions").insert(permissions);
  },

  async down() {},
};
