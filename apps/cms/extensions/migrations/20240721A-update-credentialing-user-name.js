module.exports = {
  async up(knex) {
    const credentialingUserExists = await knex("directus_roles").where("name", "Credentialing User").first();
    const userCredentialingExists = await knex("directus_roles").where("name", "User Credentialing").first();

    if (credentialingUserExists) {
      return;
    } else {
      if (userCredentialingExists) {
        await knex("directus_roles").where("name", "User Credentialing").update({ name: "Credentialing User" });
      } else {
        await knex("directus_roles").insert({
          id: "05bdccb9-dbff-4a45-bfb7-47abe151badb",
          name: "Credentialing User",
          icon: "supervised_user_circle",
          admin_access: false,
          app_access: false,
        });
      }
    }
  },

  async down(knex) {
    await knex("directus_roles").where("id", "05bdccb9-dbff-4a45-bfb7-47abe151badb").del();
  },
};
