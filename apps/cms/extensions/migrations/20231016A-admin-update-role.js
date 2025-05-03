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
  permission(hshAdmin, "directus_roles", "update"),
  permission(agencyUser, "directus_roles", "update"),
  permission(agencyUser, "junction_directus_users_agencies", "update"),
];

module.exports = {
  async up(knex) {
    await knex("directus_permissions").insert(permissions);
    await knex("directus_permissions")
      .update({ permissions: {} })
      .where({ collection: "directus_users", action: "read", role: agencyUser });
    await knex("directus_permissions")
      .update({ permissions: {} })
      .where({ collection: "directus_users", action: "update", role: agencyUser });
  },
  async down() {},
};
