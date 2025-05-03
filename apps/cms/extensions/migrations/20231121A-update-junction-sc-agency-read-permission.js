const usersManagerRoleId = "fb7c8da4-685c-11ee-8c99-0242ac120002";

module.exports = {
  async up(knex) {
    await knex("directus_permissions")
      .where("role", usersManagerRoleId)
      .where("collection", "junction_sc_definitions_agencies")
      .where("action", "read")
      .update({
        permissions: {},
      });
  },
  async down(knex) {},
};
