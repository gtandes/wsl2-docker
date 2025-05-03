const platformUser = "3f9c2b6e-8d47-4a60-bf3c-12e9a0f5d2b8";

const COLLECTION_NAME = "feature_flags";
const FIELDS = "id,enabled,flag_key";

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

const permissions = [permission(platformUser, COLLECTION_NAME, "read", {}, {}, FIELDS)];

module.exports = {
  async up(knex) {
    await knex("directus_permissions").insert(permissions);
  },

  async down() {},
};
