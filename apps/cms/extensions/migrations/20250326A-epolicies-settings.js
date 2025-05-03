module.exports = {
  async up(knex) {
    await knex("directus_folders").insert([
      {
        id: "0ef0a03f-3df9-4d3f-8960-86f1efc56287",
        name: "policies-esign",
        parent: null,
      },
    ]);
  },
  async down(knex) {},
};
