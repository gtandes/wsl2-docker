const agency = "122c0248-4037-49ae-8c82-43a5e7f1d9c5";
const manager = "fb7c8da4-685c-11ee-8c99-0242ac120002";
const rule = { _and: [{ agency: { id: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } } }] };

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

const permissions = [
  permission(agency, "junction_sc_definitions_directus_users", "update", rule, {}, "status"),
  permission(manager, "junction_sc_definitions_directus_users", "update", rule, {}, "status"),
];

module.exports = {
  async up(knex) {
    await knex("directus_permissions").insert(permissions);
  },

  async down() {},
};
