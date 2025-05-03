module.exports = {
  async up(knex) {
    const table = knex("directus_permissions");

    const bundlesPermissions = await table
      .where({
        role: "122c0248-4037-49ae-8c82-43a5e7f1d9c5", // Agency User Role ID
        collection: "bundles",
      })
      .select("id", "action");

    if (bundlesPermissions.length === 0) throw new Error("No bundles permissions found");

    const readPermission = bundlesPermissions.find((permission) => permission.action === "read");
    const updatePermission = bundlesPermissions.find((permission) => permission.action === "update");

    return knex.transaction((trx) => {
      const queries = [
        knex("directus_permissions")
          .where({ id: readPermission.id })
          .update({
            permissions: {
              _and: [
                {
                  _or: [
                    { agency: { id: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } } },
                    { agency: { id: { _null: true } } },
                  ],
                },
              ],
            },
          })
          .transacting(trx),
        knex("directus_permissions")
          .where({ id: updatePermission.id })
          .update({
            permissions: { _and: [{ agency: { id: { _in: ["$CURRENT_USER.agencies.agencies_id.id"] } } }] },
          })
          .transacting(trx),
      ];

      Promise.all(queries).then(trx.commit).catch(trx.rollback);
    });
  },
  async down(knex) {},
};
