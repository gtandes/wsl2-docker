module.exports = {
  async up(knex) {
    const modules = await knex("modules_definition").select("id", "expiration_date");
    const exams = await knex("exams").select("id", "expiration_date");

    const releaseDate = new Date("2024-03-05").toISOString();

    return knex.transaction((trx) => {
      const queries = [];

      modules.forEach((module) => {
        if (!module.expiration_date) {
          queries.push(
            knex("modules_definition").where("id", module.id).update({
              expiration_date: releaseDate,
            }),
          );
        }
      });

      exams.forEach((exam) => {
        if (!exam.expiration_date) {
          queries.push(
            knex("exams").where("id", exam.id).update({
              expiration_date: releaseDate,
            }),
          );
        }
      });

      return Promise.all(queries).then(trx.commit).catch(trx.rollback);
    });
  },

  async down() {},
};
