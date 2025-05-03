const password = "$argon2id$v=19$m=65536,t=3,p=4$k+wAcI/51V/xw7PZbXJSZw$6UtuANqixq60B/16/zOovKBsXf6TlSzW/VGFJ/bJ7FE";
const usersManagerRoleId = "fb7c8da4-685c-11ee-8c99-0242ac120002";

const marvelAgencyId = "eb4c04d4-91aa-44b1-9169-1f3c6a5cf263";
const capcomAgencyId = "f212578f-47b6-4ee0-9203-584d82974ee4";

module.exports = {
  async up(knex) {
    await knex("directus_users").insert({
      id: "913842b6-685d-11ee-8c99-0242ac120002",
      first_name: "Users Manager",
      last_name: "Capcom",
      email: "users-manager@capcom.com",
      password,
      status: "active",
      role: usersManagerRoleId,
      last_access: null,
      provider: "default",
    });
    await knex("junction_directus_users_agencies").insert({
      agencies_id: capcomAgencyId,
      directus_users_id: "913842b6-685d-11ee-8c99-0242ac120002",
    });

    await knex("directus_users").insert({
      id: "bf4b05e4-685d-11ee-8c99-0242ac120002",
      first_name: "Users Manager",
      last_name: "Marvel",
      email: "users-manager@marvel.com",
      password,
      status: "active",
      role: usersManagerRoleId,
      last_access: null,
      provider: "default",
    });
    await knex("junction_directus_users_agencies").insert({
      agencies_id: marvelAgencyId,
      directus_users_id: "bf4b05e4-685d-11ee-8c99-0242ac120002",
    });
  },
  async down(knex) {},
};
