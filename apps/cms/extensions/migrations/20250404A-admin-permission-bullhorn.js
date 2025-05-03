const hshAdmin = "cc987fae-dbb9-4d72-8199-21243fa13c92";
const agencyUser = "122c0248-4037-49ae-8c82-43a5e7f1d9c5";
const bhConfig = "bh_config";
const iframeTokens = "iframe_tokens";

const FIELDS = "*";

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
  permission(hshAdmin, bhConfig, "create", {}, {}, FIELDS),
  permission(hshAdmin, bhConfig, "read", {}, {}, FIELDS),
  permission(hshAdmin, bhConfig, "update", {}, {}, FIELDS),

  permission(hshAdmin, iframeTokens, "create", {}, {}, FIELDS),
  permission(hshAdmin, iframeTokens, "read", {}, {}, FIELDS),
  permission(hshAdmin, iframeTokens, "update", {}, {}, FIELDS),

  permission(agencyUser, bhConfig, "create", {}, {}, FIELDS),
  permission(agencyUser, bhConfig, "read", {}, {}, FIELDS),
  permission(agencyUser, bhConfig, "update", {}, {}, FIELDS),

  permission(agencyUser, iframeTokens, "create", {}, {}, FIELDS),
  permission(agencyUser, iframeTokens, "read", {}, {}, FIELDS),
  permission(agencyUser, iframeTokens, "update", {}, {}, FIELDS),
];

module.exports = {
  async up(knex) {
    await knex("directus_permissions").insert(permissions);
  },

  async down(knex) {},
};
