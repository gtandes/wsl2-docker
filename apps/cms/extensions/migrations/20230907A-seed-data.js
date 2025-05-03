const password = "$argon2id$v=19$m=65536,t=3,p=4$k+wAcI/51V/xw7PZbXJSZw$6UtuANqixq60B/16/zOovKBsXf6TlSzW/VGFJ/bJ7FE";
const clinicianRoleId = "8be9ecec-947d-4f53-932a-bdd6a779d8f8";
const hshAdminRoleId = "cc987fae-dbb9-4d72-8199-21243fa13c92";
const agencyUserRoleId = "122c0248-4037-49ae-8c82-43a5e7f1d9c5";

const marvelAgencyId = "eb4c04d4-91aa-44b1-9169-1f3c6a5cf263";
const capcomAgencyId = "f212578f-47b6-4ee0-9203-584d82974ee4";

module.exports = {
  async up(knex) {
    await knex("agencies").insert([
      {
        date_created: "2023-08-10T00:56:12.330Z",
        id: marvelAgencyId,
        name: "Marvel",
        status: "published",
      },
      {
        date_created: "2023-08-10T01:01:11.776Z",
        id: capcomAgencyId,
        name: "Capcom",
        status: "published",
      },
    ]);

    await knex("directus_users").insert({
      id: "05bdccb9-7881-4f74-af56-d3f7f47d8139",
      first_name: "Clinician",
      last_name: "Capcom",
      email: "clinician@capcom.com",
      password,
      status: "active",
      role: clinicianRoleId,
      last_access: null,
      provider: "default",
    });
    await knex("junction_directus_users_agencies").insert({
      agencies_id: capcomAgencyId,
      directus_users_id: "05bdccb9-7881-4f74-af56-d3f7f47d8139",
    });

    await knex("directus_users").insert({
      id: "2e7f9b15-ae91-4be7-9286-d843d1a0eac8",
      first_name: "Agency",
      last_name: "Capcom",
      email: "agency@capcom.com",
      password,
      status: "active",
      role: agencyUserRoleId,
      last_access: null,
      provider: "default",
    });
    await knex("junction_directus_users_agencies").insert({
      agencies_id: capcomAgencyId,
      directus_users_id: "2e7f9b15-ae91-4be7-9286-d843d1a0eac8",
    });

    await knex("directus_users").insert({
      id: "a5e735c0-6c01-4433-b763-f1594dcce9c6",
      first_name: "Agency",
      last_name: "Marvel",
      email: "agency@marvel.com",
      password,
      status: "active",
      role: agencyUserRoleId,
      last_access: null,
      provider: "default",
    });
    await knex("junction_directus_users_agencies").insert({
      agencies_id: marvelAgencyId,
      directus_users_id: "a5e735c0-6c01-4433-b763-f1594dcce9c6",
    });

    await knex("directus_users").insert({
      id: "ad4c2955-3056-4583-b249-61b57c01fec2",
      first_name: "Clinician",
      last_name: "Marvel",
      email: "clinician@marvel.com",
      password,
      status: "active",
      role: clinicianRoleId,
      last_access: null,
      provider: "default",
    });
    await knex("junction_directus_users_agencies").insert({
      agencies_id: marvelAgencyId,
      directus_users_id: "ad4c2955-3056-4583-b249-61b57c01fec2",
    });

    await knex("directus_users").insert({
      id: "d0623226-6a25-4511-b20f-1e91e055716e",
      first_name: "Admin",
      last_name: "HSH",
      email: "admin@hsh.com",
      password,
      status: "active",
      role: hshAdminRoleId,
      last_access: null,
      provider: "default",
    });

    await knex("categories").insert([
      {
        id: "2a7fd283-28fc-403b-95b4-239069b2b7d0",
        status: "published",
        title: "Subspecialty cat 1",
        type: "sub_speciality",
      },
      {
        id: "76c2e9fc-1177-4eb3-bc25-83b20f81ca90",
        status: "published",
        title: "Document cat 1",
        type: "document",
      },
      {
        id: "903d9f7f-b30a-4164-8e32-d9e6db60fdff",
        status: "published",
        title: "Specialty cat 1",
        type: "speciality",
      },
      {
        id: "a1e6682a-cb8f-4e3f-8a45-2bc6252f93a0",
        status: "published",
        title: "Modality cat 1",
        type: "modality",
      },
      {
        id: "e9b2ebcd-6a8c-4665-bcda-cc109d42630d",
        status: "published",
        title: "Question cat 1",
        type: "question",
      },
      {
        id: "f83591d6-b1fa-47c6-984b-f8cb2816ccb1",
        status: "published",
        title: "Policy cat 1",
        type: "policy",
      },
    ]);
  },
  async down(knex) {},
};
