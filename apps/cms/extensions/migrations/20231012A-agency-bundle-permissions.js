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

function isFromAgency() {
  return { _and: [{ bundles_id: { agency: { id: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } } } }] };
}
function isAgencyReadable() {
  return {
    _and: [
      {
        _or: [
          { agency: { id: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } } },
          { agency: { id: { _null: true } } },
        ],
      },
      { status: { _eq: "published" } },
    ],
  };
}

const permissions = [
  permission("bundles", "create", {}),
  permission("bundles", "read", isAgencyReadable()),
  permission("bundles", "update", { _and: [{ agency: { id: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } } }] }),
  permission("junction_bundles_documents", "create", {}),
  permission("junction_bundles_documents", "read", isFromAgency()),
  permission("junction_bundles_documents", "update", isFromAgency()),
  permission("junction_bundles_exams", "create", {}),
  permission("junction_bundles_exams", "read", isFromAgency()),
  permission("junction_bundles_exams", "update", isFromAgency()),
  permission("junction_bundles_modules_definition", "create", {}),
  permission("junction_bundles_modules_definition", "read", isFromAgency()),
  permission("junction_bundles_modules_definition", "update", isFromAgency()),
  permission("junction_bundles_policies", "create", {}),
  permission("junction_bundles_policies", "read", isFromAgency()),
  permission("junction_bundles_policies", "update", isFromAgency()),
  permission("junction_bundles_sc_definitions", "create", {}),
  permission("junction_bundles_sc_definitions", "read", isFromAgency()),
  permission("junction_bundles_sc_definitions", "update", isFromAgency()),
];

module.exports = {
  async up(knex) {
    await knex("directus_permissions").insert(permissions);
  },
  async down(knex) {},
};
