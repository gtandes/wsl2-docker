module.exports = {
  async up(knex) {
    await knex("directus_users").insert({
      id: "ec5132a9-177a-40ca-8d4e-d87f8a6a6f1f",
      email: "test@test.com",
      password: "$argon2id$v=19$m=65536,t=3,p=4$k+wAcI/51V/xw7PZbXJSZw$6UtuANqixq60B/16/zOovKBsXf6TlSzW/VGFJ/bJ7FE",
      role: "cd4bfb95-9145-4bad-aa88-a3810f15a976",
      first_name: "Germinate",
      last_name: "Developer",
      status: "active",
      token: "NtNAXoiAxbgFmN9VlW5mNlvzt5BVjXGG",
    });
  },

  async down(knex) {
    await knex("directus_users").where("id", "ec5132a9-177a-40ca-8d4e-d87f8a6a6f1f").del();
  },
};
