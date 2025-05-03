const ats = "1d46885c-b28e-401b-952e-0dc77a01c1ce";

module.exports = {
  async up(knex) {
    await knex("directus_permissions")
      .where({ collection: "junction_directus_users_exams", action: "create", role: ats })
      .update({
        fields:
          "agency,exams_id,allowed_attempts,directus_users_id,status,due_date,exam_versions_id,expires_on,bundle_id,expiration_type",
      })
      .limit(1);

    await knex("directus_permissions")
      .where({ collection: "junction_modules_definition_directus_users", action: "create", role: ats })
      .update({
        fields:
          "modules_definition_id,status,score,finished_on,assigned_on,started_on,due_date,expires_on,agency,expiration_type",
      })
      .limit(1);

    await knex("directus_permissions")
      .where({ collection: "junction_sc_definitions_directus_users", action: "create", role: ats })
      .update({
        fields:
          "agency,directus_users_id,sc_definitions_id,status,due_date,assigned_on,expires_on,bundle_id,expiration_date,expiration_type",
      })
      .limit(1);

    await knex("directus_permissions")
      .where({ collection: "junction_directus_users_policies", action: "create", role: ats })
      .update({
        fields: "agency,policies_id,directus_users_id,expires_on,due_date,bundle_id,expiration_type",
      })
      .limit(1);

    await knex("directus_permissions")
      .where({ collection: "junction_directus_users_documents", action: "create", role: ats })
      .update({
        fields: "directus_users_id,documents_id,due_date,expires_on,bundle_id,agency,expiration_type",
      })
      .limit(1);
  },

  async down() {},
};
