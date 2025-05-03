module.exports = {
  async up(knex) {
    await knex("categories").insert([
      {
        id: "2b7f8c12-38fa-48ab-85d3-4f6e29c7e3b1",
        status: "published",
        title: "Test Modality 1",
        type: "modality",
      },
      {
        id: "4c1e7d2a-92b4-4f39-8a1d-5f7f3c6d9b2a",
        status: "published",
        title: "Test Modality 2",
        type: "modality",
      },
      {
        id: "9e4a6d1b-1f5c-4f3e-b7c2-2a9f8b3e0c5d",
        status: "published",
        title: "Test Modality 3",
        type: "modality",
      },
    ]);
  },
  async down() {},
};
