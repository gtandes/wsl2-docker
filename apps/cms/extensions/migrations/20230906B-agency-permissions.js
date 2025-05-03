function permission(collection, action, permissions = {}, validation = {}, fields = "*", presets = null) {
  return {
    role: "122c0248-4037-49ae-8c82-43a5e7f1d9c5",
    collection,
    action,
    permissions,
    validation,
    presets,
    fields,
  };
}

function isAgency() {
  return {
    id: {
      _in: ["$CURRENT_USER.agencies.agencies_id.id"],
    },
  };
}

function isFromAgency() {
  return { agencies: { agencies_id: { id: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } } } };
}

function isAgencyReadable() {
  return {
    _and: [
      {
        _or: [
          {
            agencies: {
              id: {
                _null: true,
              },
            },
          },
          {
            agencies: {
              agencies_id: {
                id: {
                  _in: ["$CURRENT_USER.agencies.agencies_id.id"],
                },
              },
            },
          },
        ],
      },
    ],
  };
}

const permissions = [
  // Agencies
  permission("agencies", "create", {}, isAgency()),
  permission("agencies", "read", isAgency()),
  permission("agencies", "update", isAgency()),
  permission("junction_directus_users_agencies", "create"),
  permission("junction_directus_users_agencies", "read"),

  // Categories
  permission("categories", "create"),
  permission("categories", "read"),
  permission("categories", "update"),

  // Documents
  permission("documents", "create"),
  permission("documents", "update"),
  permission("documents", "read", isAgencyReadable()),
  permission("junction_documents_agencies", "create"),
  permission("junction_documents_agencies", "delete", isFromAgency().agencies),
  permission("junction_documents_agencies", "read", isFromAgency().agencies),
  permission("junction_documents_agencies", "update", isFromAgency().agencies),
  permission("junction_documents_categories", "create"),
  permission("junction_documents_categories", "delete"),
  permission("junction_documents_categories", "read"),
  permission("junction_documents_categories", "update"),
  permission("junction_directus_users_documents", "create"),
  permission("junction_directus_users_documents", "update", {
    _and: [{ agency: { id: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } } }],
  }),

  // Exams
  permission("exams", "create"),
  permission("exams", "read", {
    _and: [
      {
        _or: [
          { agencies: { agencies_id: { id: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } } } },
          { agencies: { agencies_id: { id: { _null: true } } } },
        ],
      },
      { status: { _eq: "published" } },
    ],
  }),
  permission("exam_versions", "read"),
  permission("exam_versions", "update"),
  permission("exam_results", "read"),
  permission("exam_versions", "create"),
  permission("questions", "read"),
  permission("question_versions", "read"),
  permission("junction_directus_users_exams", "create"),
  permission("junction_directus_users_exams", "read"),
  permission("junction_directus_users_exams", "update"),
  permission("junction_exam_versions_questions", "read"),
  permission("junction_exams_agencies", "read"),
  permission("junction_exams_questions", "read"),
  permission("junction_exams_categories_specialties", "read"),
  permission("junction_exams_categories_subspecialties", "read"),

  // Skills checklists
  permission("sc_definitions", "create"),
  permission("sc_definitions", "read"),
  permission("sc_definitions", "update"),
  permission("sc_versions", "create"),
  permission("sc_versions", "read"),
  permission("sc_versions", "update"),
  permission("junction_sc_definitions_agencies", "create", {}, isAgency()),
  permission("junction_sc_definitions_agencies", "read", isAgency()),
  permission("junction_sc_definitions_directus_users", "create"),
  permission("junction_sc_definitions_directus_users", "read"),

  // Policies
  permission("policies", "create"),
  permission("policies", "read", isAgencyReadable()),
  permission("policies", "update"),
  permission("junction_policies_agencies", "create"),
  permission("junction_policies_agencies", "read", isFromAgency().agencies),
  permission("junction_policies_agencies", "update", isFromAgency().agencies),
  permission("junction_policies_agencies", "delete", isFromAgency().agencies),
  permission("junction_policies_categories", "create"),
  permission("junction_policies_categories", "read"),
  permission("junction_policies_categories", "update"),
  permission("junction_policies_categories", "delete"),

  // Directus
  permission("directus_files", "read"),
  permission("directus_roles", "read"),
  permission("directus_users", "create"),
  permission("directus_users", "read", isFromAgency()),
  permission("directus_users", "update", isFromAgency()),
];

module.exports = {
  async up(knex) {
    await knex("directus_permissions").insert(permissions);
  },
  async down(knex) {},
};
