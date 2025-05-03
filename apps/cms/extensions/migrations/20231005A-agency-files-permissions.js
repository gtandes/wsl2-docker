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

const permissions = [
  permission("junction_directus_users_documents", "read", {
    _and: [{ agency: { id: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } } }],
  }),
  permission("directus_files", "create"),
  permission("directus_files", "update"),
];

module.exports = {
  async up(knex) {
    await knex("directus_permissions").insert(permissions);
  },
  async down(knex) {},
};
