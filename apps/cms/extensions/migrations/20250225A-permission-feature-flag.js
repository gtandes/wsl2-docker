const agency = "122c0248-4037-49ae-8c82-43a5e7f1d9c5";
const admin = "cc987fae-dbb9-4d72-8199-21243fa13c92";
const clinician = "8be9ecec-947d-4f53-932a-bdd6a779d8f8";
const manager = "fb7c8da4-685c-11ee-8c99-0242ac120002";
const developer = "cd4bfb95-9145-4bad-aa88-a3810f15a976";
const credentialingUser = "05bdccb9-dbff-4a45-bfb7-47abe151badb";

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

const permissions = [
  permission(agency, COLLECTION_NAME, "read", {}, {}, FIELDS),
  permission(admin, COLLECTION_NAME, "read", {}, {}, FIELDS),
  permission(clinician, COLLECTION_NAME, "read", {}, {}, FIELDS),
  permission(manager, COLLECTION_NAME, "read", {}, {}, FIELDS),
  permission(developer, COLLECTION_NAME, "read", {}, {}, FIELDS),
  permission(credentialingUser, COLLECTION_NAME, "read", {}, {}, FIELDS),
  permission(null, COLLECTION_NAME, "read", {}, {}, FIELDS), // reference to the public role
];

module.exports = {
  async up(knex) {
    await knex("directus_permissions").insert(permissions);
  },

  async down() {},
};
