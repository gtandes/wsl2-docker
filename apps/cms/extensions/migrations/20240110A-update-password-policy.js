module.exports = {
  async up(knex) {
    const settingsData = {
      auth_password_policy: "/(?=^.{8,}$)(?=.*\\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+}{';'?>.<,])(?!.*\\s).*$/",
    };

    const table = knex("directus_settings");

    const settings = await table.select("id");

    await table.where({ id: settings[0].id }).update(settingsData);
  },
  async down(knex) {},
};
