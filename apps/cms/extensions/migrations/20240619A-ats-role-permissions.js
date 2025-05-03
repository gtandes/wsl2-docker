const ats = "1d46885c-b28e-401b-952e-0dc77a01c1ce";
const rule = {
  _and: [
    { agencies: { agencies_id: { id: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } } } },
    {
      _or: [
        { role: { id: { _eq: "8be9ecec-947d-4f53-932a-bdd6a779d8f8" } } },
        { role: { id: { _eq: "1d46885c-b28e-401b-952e-0dc77a01c1ce" } } },
      ],
    },
  ],
};

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

const permissions = permission(
  ats,
  "directus_users",
  "read",
  rule,
  {},
  "id,first_name,last_name,email,exams,agencies,documents,policies,modules,sc_definitions,role",
);

module.exports = {
  async up(knex) {
    await knex("directus_permissions")
      .where({ collection: "directus_users", action: "read", role: ats })
      .update(permissions)
      .limit(1);
  },

  async down() {},
};
