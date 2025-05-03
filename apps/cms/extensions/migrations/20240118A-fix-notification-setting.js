module.exports = {
  async up(knex) {
    const settingsData = {
      user_manager: {
        exam_completion: false,
        exam_completion_after_final_attempt: false,
        module_completion: false,
        module_completion_after_final_attempt: false,
        sc_submitted: false,
        policy_signed: false,
        document_read: false,
        competency_due_report: false,
        competency_expiration_report: false,
      },
      agency_admin: {
        exam_completion: false,
        exam_completion_after_final_attempt: false,
        module_completion: false,
        module_completion_after_final_attempt: false,
        sc_submitted: false,
        policy_signed: false,
        document_read: false,
        competency_due_report: false,
        competency_expiration_report: false,
      },
      clinician: {
        pending_assignment_reminder: false,
        expiring_competencies_reminder: false,
        due_date_reminder: false,
        nagging_email: false,
        forgot_password: false,
        new_assignment: false,
        welcome_email: false,
        success_failure: false,
      },
    };

    const agencies = await knex("agencies").select("id", "notifications_settings");

    return knex.transaction((trx) => {
      const queries = [];

      agencies.forEach((agency) => {
        let query = null;
        const notificationsSettings = agency.notifications_settings || {};

        if (Object.keys(notificationsSettings).length > 0) {
          const agencyAdmin = {
            exam_completion: notificationsSettings.agency_admin.exam_failure,
            exam_completion_after_final_attempt: notificationsSettings.agency_admin.exam_failure_after_final_attempt,
            module_completion: notificationsSettings.agency_admin.module_failure,
            module_completion_after_final_attempt:
              notificationsSettings.agency_admin.module_failure_after_final_attempt,
            sc_submitted: false,
            policy_signed: false,
            document_read: false,
            competency_due_report: false,
            competency_expiration_report: false,
          };

          const userManager = {
            exam_completion: notificationsSettings.user_manager.exam_failure,
            exam_completion_after_final_attempt: notificationsSettings.user_manager.exam_failure_after_final_attempt,
            module_completion: notificationsSettings.user_manager.module_failure,
            module_completion_after_final_attempt:
              notificationsSettings.user_manager.module_failure_after_final_attempt,
            sc_submitted: false,
            policy_signed: false,
            document_read: false,
            competency_due_report: false,
            competency_expiration_report: false,
          };

          const newNotificationsSettings = {
            agency_admin: {
              ...agencyAdmin,
            },
            user_manager: {
              ...userManager,
            },
            clinician: {
              ...notificationsSettings.clinician,
              success_failure: false,
            },
          };

          query = knex("agencies")
            .where("id", agency.id)
            .update({ notifications_settings: newNotificationsSettings })
            .transacting(trx);
          queries.push(query);
        } else {
          query = knex("agencies")
            .where("id", agency.id)
            .update({ notifications_settings: settingsData })
            .transacting(trx);
          queries.push(query);
        }
      });

      Promise.all(queries)
        .then(() => {
          trx.commit();
        })
        .catch(() => {
          trx.rollback();
        });
    });
  },
  async down(knex) {},
};
