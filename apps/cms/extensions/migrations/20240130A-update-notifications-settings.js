module.exports = {
  async up(knex) {
    const baseSettings = {
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
          if (
            Object.keys(notificationsSettings.agency_admin).some((key) =>
              ["exam_failure", "module_failure"].includes(key),
            )
          ) {
            const agencyAdmin = {
              exam_completion: !!notificationsSettings.agency_admin.exam_failure,
              exam_completion_after_final_attempt:
                !!notificationsSettings.agency_admin.exam_failure_after_final_attempt,
              module_completion: !!notificationsSettings.agency_admin.module_failure,
              module_completion_after_final_attempt:
                !!notificationsSettings.agency_admin.module_failure_after_final_attempt,
              sc_submitted: notificationsSettings.agency_admin.sc_submitted,
              policy_signed: notificationsSettings.agency_admin.policy_signed,
              document_read: notificationsSettings.agency_admin.document_read,
              competency_due_report: notificationsSettings.agency_admin.competency_due_report,
              competency_expiration_report: notificationsSettings.agency_admin.competency_expiration_report,
            };

            notificationsSettings.agency_admin = agencyAdmin;
          }

          if (
            Object.keys(notificationsSettings.user_manager).some((key) =>
              ["exam_failure", "module_failure"].includes(key),
            )
          ) {
            const userManager = {
              exam_completion: !!notificationsSettings.user_manager.exam_failure,
              exam_completion_after_final_attempt:
                !!notificationsSettings.user_manager.exam_failure_after_final_attempt,
              module_completion: !!notificationsSettings.user_manager.module_failure,
              module_completion_after_final_attempt:
                !!notificationsSettings.user_manager.module_failure_after_final_attempt,
              sc_submitted: notificationsSettings.user_manager.sc_submitted,
              policy_signed: notificationsSettings.user_manager.policy_signed,
              document_read: notificationsSettings.user_manager.document_read,
              competency_due_report: notificationsSettings.user_manager.competency_due_report,
              competency_expiration_report: notificationsSettings.user_manager.competency_expiration_report,
            };

            notificationsSettings.user_manager = userManager;
          }

          const newNotificationsSettings = {
            ...notificationsSettings,
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
            .update({ notifications_settings: baseSettings })
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
