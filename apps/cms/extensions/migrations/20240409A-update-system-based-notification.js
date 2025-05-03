module.exports = {
  async up(knex) {
    const agencies = await knex("agencies").select("id", "notifications_settings");

    return knex.transaction((trx) => {
      const queries = [];

      agencies.forEach((agency) => {
        queries.push(
          knex("agencies")
            .where("id", agency.id)
            .update({
              notifications_settings: {
                ...agency.notifications_settings,
                clinician: {
                  ...agency.notifications_settings.clinician,
                  forgot_password: true,
                  new_assignment: true,
                  success_failure: true,
                  welcome_email: true,
                },
              },
            }),
        );
      });

      return Promise.all(queries).then(trx.commit).catch(trx.rollback);
    });
  },

  async down() {},
};
