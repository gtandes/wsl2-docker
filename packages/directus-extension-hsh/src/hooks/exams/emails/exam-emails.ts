import { generateEmailPayload } from "emails";
import { DirectusServices } from "../../../common/directus-services";
import { getAgencyRecipients } from "../../../common/get-agency-recipients";
import { entityChangedWithPattern } from "../../../common/revisions";
import { format } from "date-fns";
import { CompetencyState, DirectusStatus, hasInvalidEmailNotification, UserRole } from "types";
import { EventContext, HookExtensionContext } from "@directus/types";
import { getUserInfo } from "../../../common/utils";
import { RoleId } from "../../../common/manager-expiring-competencies-service";

const roleToSetting: Record<RoleId, string> = {
  "122c0248-4037-49ae-8c82-43a5e7f1d9c5": "agency_admin",
  "05bdccb9-dbff-4a45-bfb7-47abe151badb": "agency_admin",
  "fb7c8da4-685c-11ee-8c99-0242ac120002": "user_manager",
};

export interface ManagerRecipient {
  first_name: string;
  last_name: string;
  email: string;
  notifications_settings?: NotificationsSettings;
  role: string;
}

interface NotificationsSettings {
  agency_admin?: {
    invalid_email?: boolean;
  };
  user_manager?: {
    invalid_email?: boolean;
  };
}

export abstract class ExamsEmails {
  private static collection = "junction_directus_users_exams";
  private static assignmentFields = [
    "*",
    "directus_users_id.id",
    "directus_users_id.first_name",
    "directus_users_id.last_name",
    "directus_users_id.email",
    "directus_users_id.status",
    "directus_users_id.agencies.supervisors.directus_users_id.email",
    "directus_users_id.agencies.supervisors.directus_users_id.agencies.agencies_id",
    "directus_users_id.agencies.supervisors.directus_users_id.role.id",
    "agency.name",
    "agency.logo.id",
    "agency.notifications_settings",
    "attempts_used",
    "allowed_attempts",
    "exams_id.*",
    "exams_id.title",
    "exam_versions_id.outline.title",
    "exam_versions_id.outline.id",
    "agency.*.*",
  ];

  /**
   * create exam failed data e-mail  to send it to clinician
   * @param currentAssignment
   * @param hookContext
   * @returns clinician e-mail data format to be send
   */
  private static async clinicianExamFailed(currentAssignment: any, hookContext: HookExtensionContext,isFailedTimedOut?: boolean) {
    return generateEmailPayload(
      "clinician-exam-failed",
      currentAssignment.directus_users_id.email,
      "Update on Your Exam Attempt",
      {
        props: {
          previewText: "Update on Your Exam Attempt",
          user: currentAssignment.directus_users_id,
          agency: {
            name: currentAssignment.agency.name,
            logo: currentAssignment.agency.logo?.id || null,
          },
          exam: {
            title: currentAssignment.exams_id.title,
            attempts_used: currentAssignment.attempts_used,
            allowed_attempts: currentAssignment.allowed_attempts,
            score: isFailedTimedOut ? "-" : currentAssignment.score,
            failed_date: format(new Date(), "PPpp"),
            outlineName: currentAssignment.exam_versions_id?.outline?.title || "",
            outlineUrl: currentAssignment.exam_versions_id?.outline
              ? `${hookContext.env.WEB_URL}/cms/assets/${currentAssignment.exam_versions_id?.outline.id}`
              : "",
          },
        },
      },
    );
  }

  /**
   * create proctored exam failed data e-mail  to send it to clinician
   * @param currentAssignment
   * @param hookContext
   * @returns clinician e-mail data format to be send
   */
  private static async clinicianProctoredExamInvalid(currentAssignment: any, hookContext: HookExtensionContext) {
    return generateEmailPayload(
      "clinician-proctored-exam-invalid",
      currentAssignment.directus_users_id.email,
      `Exam Attempt Marked Invalid: ${currentAssignment.exams_id.title}`,
      {
        props: {
          previewText: `Exam Attempt Marked Invalid: ${currentAssignment.exams_id.title}`,
          user: currentAssignment.directus_users_id,
          agency: {
            name: currentAssignment.agency.name,
            logo: currentAssignment.agency.logo?.id || null,
          },
          exam: {
            title: currentAssignment.exams_id.title,
            attempts_used: currentAssignment.attempts_used,
            allowed_attempts: currentAssignment.allowed_attempts,
            score: currentAssignment.score,
            failed_date: format(new Date(), "PPpp"),
            outlineName: currentAssignment.exam_versions_id?.outline?.title || "",
            outlineUrl: currentAssignment.exam_versions_id?.outline
              ? `${hookContext.env.WEB_URL}/cms/assets/${currentAssignment.exam_versions_id?.outline.id}`
              : "",
          },
        },
      },
    );
  }
  /**
   * create exam failed data e-mail to send it to managers
   * @param recipients
   * @param currentAssignment
   * @returns manager e-mail data format to be send
   */
  private static async managerExamFailed(recipients: string[], currentAssignment: any) {
    return recipients.map((recipient) =>
      generateEmailPayload("exam-failed", recipient, `Notification: Clinician's Failed Exam Attempt`, {
        props: {
          previewText: `Notification: Clinician's Failed Exam Attempt`,
          user: currentAssignment.directus_users_id,
          agency: {
            name: currentAssignment.agency.name,
            logo: currentAssignment.agency.logo?.id || null,
          },
          exam: {
            title: currentAssignment.exams_id.title,
            failed_date: format(Date.now(), "dd MMMM, YYY"),
            score: currentAssignment.score,
            allowed_attempts: currentAssignment.allowed_attempts,
            attempts_used: currentAssignment.attempts_used,
          },
        },
      }),
    );
  }
  /**
   * create exam completed data e-mail to send it to clinician
   * @param currentAssignment
   * @param hookContext
   * @returns clinician e-mail data format to be send
   */
  private static async clinicianExamCompleted(currentAssignment: any, hookContext: HookExtensionContext) {
    return generateEmailPayload(
      "clinician-exam-passed",
      currentAssignment.directus_users_id.email,
      "Update on Your Exam Attempt",
      {
        props: {
          previewText: "Update on Your Exam Attempt",
          user: currentAssignment.directus_users_id,
          agency: {
            name: currentAssignment.agency.name,
            logo: currentAssignment.agency.logo?.id || null,
          },
          competency: {
            type: "Exam",
            title: currentAssignment.exams_id.title,
          },
          exam_props: {
            attempts_used: currentAssignment.attempts_used,
            allowed_attempts: currentAssignment.allowed_attempts,
            score: currentAssignment.score,
            passed_date: format(new Date(), "PPpp"),
            certificate_url: hookContext.env.WEB_URL + "/clinician/exams/" + currentAssignment.id + "/certificate",
          },
        },
      },
    );
  }
  /**
   * create proctored exam completed data e-mail to send it to clinician
   * @param currentAssignment
   * @param hookContext
   * @returns clinician e-mail data format to be send
   */
  private static async clinicianProctoredExamCompleted(currentAssignment: any, hookContext: HookExtensionContext) {
    return generateEmailPayload(
      "clinician-proctored-exam-passed",
      currentAssignment.directus_users_id.email,
      `Exam Passed : ${currentAssignment.exams_id.title}`,
      {
        props: {
          previewText: `Exam Passed : ${currentAssignment.exams_id.title}`,
          user: currentAssignment.directus_users_id,
          agency: {
            name: currentAssignment.agency.name,
            logo: currentAssignment.agency.logo?.id || null,
          },
          competency: {
            type: "Exam",
            title: currentAssignment.exams_id.title,
          },
          exam_props: {
            attempts_used: currentAssignment.attempts_used,
            allowed_attempts: currentAssignment.allowed_attempts,
            score: currentAssignment.score,
            passed_date: format(new Date(), "PPpp"),
            certificate_url: hookContext.env.WEB_URL + "/clinician/exams/" + currentAssignment.id + "/certificate",
          },
        },
      },
    );
  }
  /**
   * create exam completed data e-mail to send it to managers
   * @param recipients
   * @param currentAssignment
   * @param hookContext
   * @returns manager e-mail data format to be send
   */
  private static async managerExamCompleted(
    recipients: string[],
    currentAssignment: any,
    hookContext: HookExtensionContext,
  ) {
    return recipients.map((recipient) =>
      generateEmailPayload(
        "exam-passed",
        recipient,
        `Healthcare Staffing Hire: Congratulations! Successful Exam Completion for ${currentAssignment.directus_users_id.first_name} ${currentAssignment.directus_users_id.last_name}`,
        {
          props: {
            previewText: `Notification: Clinician's Successful Exam Completion`,
            user: currentAssignment.directus_users_id,
            agency: {
              name: currentAssignment.agency.name,
              logo: currentAssignment.agency.logo?.id || null,
            },
            exam: {
              title: currentAssignment.exams_id.title,
              passed_date: format(Date.now(), "dd MMMM, YYY"),
              score: currentAssignment.score,
              allowed_attempts: currentAssignment.allowed_attempts,
              attempts_used: currentAssignment.attempts_used,
              certificate_url: hookContext.env.WEB_URL + "/clinician/exams/" + currentAssignment.id + "/certificate",
            },
          },
        },
      ),
    );
  }
  /**
   * send exams completed email
   * @param currentAssignment
   * @param services
   * @param hookContext
   * @void
   */
  private static async examCompleted(
    currentAssignment: any,
    services: DirectusServices,
    hookContext: HookExtensionContext,
  ) {
    const recipients = await getAgencyRecipients({
      usersService: services.usersService,
      assignment: currentAssignment,
      settingKey: "exam_completion",
    });
    if (currentAssignment.agency?.notifications_settings?.clinician.success_failure) {
      const emailClinicianData = await this.clinicianExamCompleted(currentAssignment, hookContext);
      await services.mailService.send(emailClinicianData);
      hookContext.logger.info(
        `Exam passed notification for clinician "${currentAssignment.directus_users_id.email} and exam "${currentAssignment.id}" sent`,
      );
    }

    if (recipients.length) {
      const emailManagerData = await this.managerExamCompleted(recipients, currentAssignment, hookContext);
      await Promise.allSettled(emailManagerData.map((e: any) => services.mailService.send(e)));
      hookContext.logger.info(
        `Exam Completion notification for users [${recipients.join(", ")}] and exam "${currentAssignment.id}" sent`,
      );
    }
  }
  /**
   * send proctored exams completed email
   * @param currentAssignment
   * @param services
   * @param hookContext
   * @void
   */
  private static async proctoredExamCompleted(
    currentAssignment: any,
    services: DirectusServices,
    hookContext: HookExtensionContext,
  ) {
    const recipients = await getAgencyRecipients({
      usersService: services.usersService,
      assignment: currentAssignment,
      settingKey: "exam_completion",
    });
    if (currentAssignment.agency?.notifications_settings?.clinician.success_failure) {
      const emailClinicianData = await this.clinicianProctoredExamCompleted(currentAssignment, hookContext);
      await services.mailService.send(emailClinicianData);
      hookContext.logger.info(
        `Proctored Exam passed notification for clinician "${currentAssignment.directus_users_id.email} and exam "${currentAssignment.id}" sent`,
      );
    }

    if (recipients.length) {
      const emailManagerData = await this.managerExamCompleted(recipients, currentAssignment, hookContext);
      await Promise.allSettled(emailManagerData.map((e: any) => services.mailService.send(e)));
      hookContext.logger.info(
        `Proctored Exam Completion notification for users [${recipients.join(", ")}] and exam "${
          currentAssignment.id
        }" sent`,
      );
    }
  }
  /**
   * send exams failed email
   * @param currentAssignment
   * @param services
   * @param hookContext
   * @void
   */
  private static async examFailed(
    currentAssignment: any,
    services: DirectusServices,
    hookContext: HookExtensionContext,
    isFailedTimedOut?: boolean
  ) {
    const recipients = await getAgencyRecipients({
      usersService: services.usersService,
      assignment: currentAssignment,
      settingKey: "exam_completion",
    });

    if (currentAssignment.agency?.notifications_settings?.clinician.success_failure) {
      const emailClinicianData = await this.clinicianExamFailed(currentAssignment, hookContext,isFailedTimedOut);
      await services.mailService.send(emailClinicianData);
    }

    if (recipients.length) {
      const emailManagerData = await this.managerExamFailed(recipients, currentAssignment);
      await Promise.allSettled(emailManagerData.map((e: any) => services.mailService.send(e)));
      hookContext.logger.info(
        `Email Failed notification for users [${recipients.join(", ")}] and exam "${currentAssignment.id}" sent`,
      );
    }
    hookContext.logger.info(
      `Exam failed notification for clinician "${currentAssignment.directus_users_id.email} and exam "${currentAssignment.id}" sent`,
    );
  }

  /**
   * send exams invalid email
   * @param currentAssignment
   * @param services
   * @param hookContext
   * @void
   */
  private static async examInvalid(
    currentAssignment: any,
    services: DirectusServices,
    hookContext: HookExtensionContext,
  ) {
    if (currentAssignment.agency?.notifications_settings?.clinician.success_failure) {
      const emailClinicianData = await this.clinicianProctoredExamInvalid(currentAssignment, hookContext);
      await services.mailService.send(emailClinicianData);
    }

    if (currentAssignment.agency?.notifications_settings?.user_manager.invalid_email) {
      const { database } = hookContext;
      const userManager: ManagerRecipient[] = await this.getRecipientsUserManager(
        currentAssignment.agency.id,
        database,
        currentAssignment.directus_users_id.id,
      );

      userManager.forEach(async (recipient: ManagerRecipient) => {
        const { notifications_settings, role } = recipient;
        if (!role || !(role in roleToSetting)) return;
        if (!notifications_settings) return;

        const requiredSetting = roleToSetting[role as RoleId] as keyof typeof notifications_settings;

        const userNotificationSettings = notifications_settings[requiredSetting];

        if (!userNotificationSettings || !hasInvalidEmailNotification(userNotificationSettings)) {
          return;
        }

        const isEnabled = userNotificationSettings.invalid_email;

        if (!isEnabled) {
          return;
        }

        const emailManagerData = generateEmailPayload(
          "user-manager-invalid-email",
          recipient.email,
          `Notification: Clinician's Invalid Exam Attempt`,
          {
            props: {
              previewText: `Notification: Clinician's Invalid Exam Attempt`,
              user: {
                first_name: recipient.first_name,
                last_name: recipient.last_name,
              },
              agency: {
                name: currentAssignment.agency.name,
                logo: currentAssignment.agency.logo?.id || null,
              },
              clinician: {
                name: `${currentAssignment.directus_users_id.first_name} ${currentAssignment.directus_users_id.last_name}`,
                exam_name: currentAssignment.exams_id.title,
              },
            },
          },
        );
        await services.mailService.send(emailManagerData);
      });
    }

    hookContext.logger.info(
      `Exam failed notification for clinician "${currentAssignment.directus_users_id.email} and exam "${currentAssignment.id}" sent`,
    );
  }

  private static async getRecipientsUserManager(agencyId: string, database: any, userId: string) {
    const agenciesAdmin = Object.keys(roleToSetting);

    try {
      const query = database
        .select(["du.first_name", "du.last_name", "du.email", "du.role", "agencies.notifications_settings"])
        .from("directus_users as du")
        .join("junction_directus_users_agencies as jua", "du.id", "jua.directus_users_id")
        .join("agencies", "jua.agencies_id", "agencies.id")
        .where("agencies.ia_enable", true)
        .whereIn("du.role", agenciesAdmin)
        .whereRaw(
          `NOT (
              COALESCE((agencies.notifications_settings#>>'{user_manager,invalid_email}')::boolean, true) = false AND
              COALESCE((agencies.notifications_settings#>>'{agency_admin,invalid_email}')::boolean, true) = false
            )`,
        )
        .andWhere("jua.agencies_id", agencyId)
        .andWhere(function (queryBuilder: any) {
          queryBuilder.whereNot("du.role", UserRole.UsersManager);
          queryBuilder.orWhere(function (orBuilder: any) {
            orBuilder.where("du.role", UserRole.UsersManager).whereExists(function (existsBuilder: any) {
              return existsBuilder
                .select("*")
                .from("junction_directus_users_agencies as user_jua")
                .join(
                  "junction_directus_users_agencies_supervisors as sup",
                  "user_jua.id",
                  "sup.junction_directus_users_agencies_id",
                )
                .where("user_jua.directus_users_id", userId)
                .andWhere("user_jua.agencies_id", agencyId)
                .andWhere("sup.directus_users_id", database.ref("du.id"));
            });
          });
        });

      const result = await query.distinctOn(["du.id"]);
      return result;
    } catch (error) {
      console.log("Error fetching user manager recipients:", error);
    }
  }

  /**
   * send exams failed/completed email
   * @param services
   * @param params
   * @param hookContext
   * @param eventContext
   * @void
   */
  public static async send(
    services: DirectusServices,
    params: Record<string, any>,
    hookContext: HookExtensionContext,
    eventContext: EventContext,
    isProctoring?: boolean,
  ) {
    const assignmentId = params.keys[0];

    try {
      const currentAssignment = await services.examAssignmentsService.readOne(assignmentId, {
        fields: this.assignmentFields,
      });

      if (!currentAssignment) return;
      if (currentAssignment.directus_users_id.status !== DirectusStatus.ACTIVE) return;

      if (isProctoring) {
        const INVALID = await entityChangedWithPattern(services.revisionsService, this.collection, assignmentId, {
          status: (v) => v === CompetencyState.INVALID,
        });

        if (INVALID) {
          this.examInvalid(currentAssignment, services, hookContext);
          return;
        }
      }

      const FAILED = await entityChangedWithPattern(services.revisionsService, this.collection, assignmentId, {
        status: (v) => v === CompetencyState.FAILED || v === CompetencyState.FAILED_TIMED_OUT,
      });

      if (FAILED) {
        this.examFailed(currentAssignment, services, hookContext, currentAssignment.status=== CompetencyState.FAILED_TIMED_OUT);
        return;
      }

      const COMPLETED = await entityChangedWithPattern(services.revisionsService, this.collection, assignmentId, {
        status: (v) => v === CompetencyState.COMPLETED,
      });

      if (COMPLETED) {
        if (isProctoring) {
          this.proctoredExamCompleted(currentAssignment, services, hookContext);
          return;
        }
        this.examCompleted(currentAssignment, services, hookContext);
      }
    } catch (e) {
      hookContext.logger.error(
        `Error sending exam result email. Assignment ID: ${assignmentId}, userInfo: ${JSON.stringify(
          getUserInfo(eventContext),
        )}`,
      );
      hookContext.logger.error(e);
    }
  }
}
