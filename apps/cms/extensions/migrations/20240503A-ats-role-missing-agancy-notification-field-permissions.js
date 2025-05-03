const ats = "1d46885c-b28e-401b-952e-0dc77a01c1ce";

function permission(collection, action, permissions = {}, validation = {}, fields = "*", presets = null) {
  return {
    role: ats,
    collection,
    action,
    permissions,
    validation,
    presets,
    fields,
  };
}

const permissions = [
  permission(
    "agencies",
    "read",
    { _and: [{ id: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } }] },
    {},
    "id,name,logo,notifications_settings",
  ),
];

module.exports = {
  async up(knex) {
    await knex("directus_permissions").where("role", ats).where("collection", "agencies").where("action", "read").del();

    await knex("directus_permissions").insert(permissions);
  },

  async down() {},
};
