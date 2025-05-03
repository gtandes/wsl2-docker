const roles = {
  agency: "122c0248-4037-49ae-8c82-43a5e7f1d9c5",
  hshAdmin: "cc987fae-dbb9-4d72-8199-21243fa13c92",
  developer: "cd4bfb95-9145-4bad-aa88-a3810f15a976",
  usersManager: "fb7c8da4-685c-11ee-8c99-0242ac120002",
};

const isNotIn = (rolesToExclude) => {
  return {
    _and: [{ role: { _nin: rolesToExclude } }],
  };
};

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

module.exports = {
  async up(knex) {
    const permissions_collection = "directus_permissions";
    const collection = "directus_users";

    async function getRecord(permissionsCollection, role, collection, action) {
      return await knex(permissionsCollection)
        .where("role", role)
        .where("collection", collection)
        .where("action", action)
        .select();
    }

    async function deleteRecord(permissionsCollection, role, collection, action) {
      return await knex(permissionsCollection)
        .where("role", role)
        .where("collection", collection)
        .where("action", action)
        .del();
    }

    const prevPermissions = {
      agencyCreate: (await getRecord(permissions_collection, roles.agency, collection, "create"))?.permission || {},
      agencyUpdate: (await getRecord(permissions_collection, roles.agency, collection, "update")).permission || {},
      usersMngrCreate:
        (await getRecord(permissions_collection, roles.usersManager, collection, "create")).permission || {},
      usersMngrUpdate:
        (await getRecord(permissions_collection, roles.usersManager, collection, "update")).permission || {},
    };

    await deleteRecord(permissions_collection, roles.agency, collection, "create");
    await deleteRecord(permissions_collection, roles.agency, collection, "update");
    await deleteRecord(permissions_collection, roles.usersManager, collection, "create");
    await deleteRecord(permissions_collection, roles.usersManager, collection, "update");

    await knex(permissions_collection).insert([
      // Agency Users
      permission(
        roles.agency,
        "directus_users",
        "create",
        prevPermissions.agencyCreate,
        isNotIn([roles.developer, roles.hshAdmin]),
      ),
      permission(
        roles.agency,
        "directus_users",
        "update",
        prevPermissions.agencyUpdate,
        isNotIn([roles.developer, roles.hshAdmin]),
      ),
      // Users Manangers
      permission(
        roles.usersManager,
        "directus_users",
        "create",
        prevPermissions.usersMngrCreate,
        isNotIn([roles.developer, roles.hshAdmin]),
      ),
      permission(
        roles.usersManager,
        "directus_users",
        "update",
        prevPermissions.usersMngrUpdate,
        isNotIn([roles.developer, roles.hshAdmin]),
      ),
    ]);
  },
  async down() {},
};
