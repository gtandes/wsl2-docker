import { render } from "@react-email/render";
import ClinicianNewExamAssignmentEmail from "../emails/clinician-new-assignment";
import ModuleCompletionEmail from "../emails/module-completion";
import ClinicianModuleFailedEmail from "../emails/clinician-module-failed";
import SkillChecklistCompletionEmail from "../emails/skill-checklist-completion";
import PolicySignedEmail from "../emails/policy-signed";
import DocumentReadEmail from "../emails/document-read";
import ClinicianExamFailedEmail from "../emails/clinician-exam-failed";
import ClinicianProctoredExamInvalidEmail from "../emails/clinician-proctored-exam-invalid";
import ClinicianModulePassedEmail from "../emails/clinician-module-passed";
import ModuleFailedEmail from "../emails/module-failed";
import ClinicianExpiringDateReminderEmail from "../emails/clinician-expiring-competencies-reminder";
import ClinicianDueDateReminderEmail from "../emails/clinician-due-date-reminder";
import ClinicianNaggingDueDateReminderEmail from "../emails/clinician-nagging-due-reminder";
import ClinicianPendingAssignmentsEmail from "../emails/clinician-pending-assignments";
import UpcomingExpirationEmail from "../emails/upcoming-expiration";
import UpcomingDueDateEmail from "../emails/upcoming-due-date";
import ClinicianExamPassedEmail from "../emails/clinician-exam-passed";
import ClinicianProctoredExamPassedEmail from "../emails/clinician-exam-passed";
import ExamPassedEmail from "../emails/exam-passed";
import ExamFailedEmail from "../emails/exam-failed";
import WelcomeEmail from "../emails/welcome";
import AdminWelcomeEmail from "../emails/admin-welcome";
import ClinicianExpiringCompetencyReminderEmail from "../emails/clinician-expiring-competencies-reminder-new";
import ExpiringCompetenciesReport from "../emails/agency-expiring-competencies-report";
import AdminExpiringCompetenciesEmail from "../emails/admin-expiring-competencies-report";
import { Attachment } from "../../types";
import UserManagerInvalidEMail from "../emails/user-manager-invalid-email";

export const emailTemplatesMap = {
  "clinician-new-assignment": ClinicianNewExamAssignmentEmail,
  "module-completion": ModuleCompletionEmail,
  "module-failed": ModuleFailedEmail,
  "clinician-module-failed": ClinicianModuleFailedEmail,
  "skill-checklist-completion": SkillChecklistCompletionEmail,
  "policy-signed": PolicySignedEmail,
  "document-read": DocumentReadEmail,
  "clinician-module-passed": ClinicianModulePassedEmail,
  "clinician-expiring-competencies-reminder": ClinicianExpiringDateReminderEmail,
  "clinician-due-date-reminder": ClinicianDueDateReminderEmail,
  "clinician-nagging-due-date-reminder": ClinicianNaggingDueDateReminderEmail,
  "clinician-pending-assignment": ClinicianPendingAssignmentsEmail,
  "upcoming-expiration": UpcomingExpirationEmail,
  "upcoming-due-date": UpcomingDueDateEmail,
  "clinician-exam-passed": ClinicianExamPassedEmail,
  "clinician-proctored-exam-passed": ClinicianProctoredExamPassedEmail,
  "clinician-exam-failed": ClinicianExamFailedEmail,
  "clinician-proctored-exam-invalid": ClinicianProctoredExamInvalidEmail,
  "exam-passed": ExamPassedEmail,
  "exam-failed": ExamFailedEmail,
  welcome: WelcomeEmail,
  "admin-welcome": AdminWelcomeEmail,
  "agency-expiring-competencies-report": ExpiringCompetenciesReport,
  "clinician-expiring-competencies-reminder-new": ClinicianExpiringCompetencyReminderEmail,
  "agency-admin-expiring-competencies-report": AdminExpiringCompetenciesEmail,
  "user-manager-invalid-email": UserManagerInvalidEMail,
};

const testEmail = process.env["EMAIL_TESTING"];

// Helper type to get component props type
export type EmailTemplateProps<T extends keyof typeof emailTemplatesMap> = React.ComponentProps<
  (typeof emailTemplatesMap)[T]
>;

// Define the getTemplate function
export function getTemplate<T extends keyof typeof emailTemplatesMap>(
  templateId: T,
  templateData: EmailTemplateProps<T>,
) {
  const Comp = emailTemplatesMap[templateId];
  const rendered = Comp(templateData as any);
  const emailHtml = render(rendered as any);
  return emailHtml;
}

interface EmailPayloadOptions<T extends keyof typeof emailTemplatesMap> {
  templateId: T;
  to: string;
  subject: string;
  templateData: EmailTemplateProps<T>;
  from?: string;
  attachments?: Attachment[] | null;
}

export function generateEmailPayload<T extends keyof typeof emailTemplatesMap>(
  templateId: T,
  to: string,
  subject: string,
  templateData: EmailTemplateProps<T>,
  from: string = process.env["EMAIL_FROM"],
) {
  const html = getTemplate(templateId, templateData);
  const finalTo = testEmail || to;
  const finalSubject = testEmail ? `[*${to}] ${subject}` : subject;

  return {
    to: finalTo,
    from,
    subject: finalSubject,
    html,
  };
}

export function generateEmailPayloadWithAttachments<T extends keyof typeof emailTemplatesMap>({
  templateId,
  to,
  subject,
  templateData,
  from = process.env["EMAIL_FROM"],
  attachments = null,
}: EmailPayloadOptions<T>) {
  const html = getTemplate(templateId, templateData);
  const finalTo = testEmail || to;
  const finalSubject = testEmail ? `[*${to}] ${subject}` : subject;

  return {
    to: finalTo,
    from,
    subject: finalSubject,
    html,
    attachments,
  };
}
