module.exports = {
  async up(knex) {
    await knex.schema.table("exam_results", function (table) {
      table.index("assignment_id", "id_assignment_id");
    });
  },

  async down(knex) {
    await knex.schema.table("exam_results", function (table) {
      table.dropIndex("assignment_id", "id_assignment_id");
    });
  },
};
