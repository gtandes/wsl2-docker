const ats = "1d46885c-b28e-401b-952e-0dc77a01c1ce";
const rule = {
  _and: [
    {
      _or: [
        { id: { _eq: "8be9ecec-947d-4f53-932a-bdd6a779d8f8" } },
        { id: { _eq: "1d46885c-b28e-401b-952e-0dc77a01c1ce" } },
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

const permissions = permission(ats, "directus_roles", "read", rule, null, "id,name");

module.exports = {
  async up(knex) {
    await knex("directus_permissions").insert(permissions);
  },

  async down() {},
};
