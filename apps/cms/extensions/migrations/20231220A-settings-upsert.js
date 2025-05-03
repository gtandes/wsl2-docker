module.exports = {
  async up(knex) {
    const settingsData = {
      project_name: "HSH",
      project_descriptor: "Health Staffing Hire",
      auth_password_policy: "/(?=^.{8,}$)(?=.*d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+}{';'?>.<,])(?!.*s).*$/",
      auth_login_attempts: 25,
    };

    const table = knex("directus_settings");

    const settings = await table.select(
      "id",
      "project_name",
      "project_descriptor",
      "auth_password_policy",
      "auth_login_attempts",
    );

    if (settings?.[0]?.id) {
      await table.where({ id: settings[0].id }).update(settingsData);
    } else {
      await table.insert(settingsData);
    }
  },
  async down(knex) {},
};
