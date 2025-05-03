const ats = "1d46885c-b28e-401b-952e-0dc77a01c1ce";

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

module.exports = {
  async up(knex) {
    await knex("directus_permissions").insert([
      permission(
        ats,
        "directus_users",
        "update",
        { _and: [{ id: { _eq: "$CURRENT_USER.id" } }] },
        { _and: [{ token: { _regex: "/^HSH_ATS_[a-zA-Z0-9]{28}$/" } }] },
        "token",
      ),
    ]);
  },

  async down() {},
};
