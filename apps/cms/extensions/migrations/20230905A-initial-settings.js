module.exports = {
  async up(knex) {
    await knex("directus_folders").insert([
      {
        id: "2e0361f9-0f81-4dd9-82cb-124d601e31ed",
        name: "questions",
        parent: null,
      },
      {
        id: "ab6886a4-232a-4176-a762-b57585120033",
        name: "exams",
        parent: null,
      },
      {
        id: "37f3f9fe-3d12-46c2-aff7-88da35db1ddb",
        name: "packages",
        parent: null,
      },
      {
        id: "55b6d72c-d649-4f23-97d8-b65b7947a0ca",
        name: "documents",
        parent: null,
      },
      {
        id: "d47b3133-9895-4987-82ee-e1db03cea168",
        name: "policies",
        parent: null,
      },
    ]);
    await knex("directus_folders").insert([
      {
        id: "917dc844-d980-484e-8e75-3deabe921fb2",
        name: "outlines",
        parent: "ab6886a4-232a-4176-a762-b57585120033",
      },
    ]);
    await knex("directus_roles").insert([
      {
        id: "122c0248-4037-49ae-8c82-43a5e7f1d9c5",
        name: "Agency User",
        icon: "supervisor_account",
        description: null,
        ip_access: null,
        enforce_tfa: false,
        admin_access: false,
        app_access: false,
      },
      {
        id: "cc987fae-dbb9-4d72-8199-21243fa13c92",
        name: "HSH Admin",
        icon: "admin_panel_settings",
        description: null,
        ip_access: null,
        enforce_tfa: false,
        admin_access: false,
        app_access: false,
      },
    ]);
    await knex("directus_roles").where("id", "8be9ecec-947d-4f53-932a-bdd6a779d8f8").update({
      name: "Clinician",
    });
  },
  async down(knex) {},
};
