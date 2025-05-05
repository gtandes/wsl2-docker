import { Control, UseFormReturn, useForm, useWatch } from "react-hook-form";
import { AdminLayout } from "../../../components/AdminLayout";
import { AdminSettingsLayout } from "../../../components/admin/settings/SettingsLayout";
import { Input } from "../../../components/Input";
import { Disclosure, Transition } from "@headlessui/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown } from "@fortawesome/pro-regular-svg-icons";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { useAgency } from "../../../hooks/useAgency";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "../../../components/Button";
import { Toggle } from "../../../components/Toggle";
import { useUpdateAgencyEmailNotificationsSettingsMutation } from "api";
import { notify } from "../../../components/Notification";
import { useAuth } from "../../../hooks/useAuth";
import { UserRole } from "../../../types/roles";
import { Spinner } from "../../../components/Spinner";
import { Tooltip } from "../../../components/utils/Tooltip";
import { useFeatureFlags } from "../../../hooks/useFeatureFlags";
import NotAuthorized from "../../not-authorized";

const detailsSchema = z.object({
  organization_name: z.string().min(1).max(255),
  email_address: z.string().email().or(z.literal("")),
});

const agencyNotificationsSchema = z.object({
  exam_completion: z.boolean(),
  exam_completion_after_final_attempt: z.boolean(),
  module_completion: z.boolean(),
  module_completion_after_final_attempt: z.boolean(),
  sc_submitted: z.boolean(),
  policy_signed: z.boolean(),
  document_read: z.boolean(),
  competency_due_report: z.boolean(),
  competency_expiration_report: z.boolean(),
  invalid_email: z.boolean().optional(),
});

const clinicianNotificationsSchema = z.object({
  pending_assignment_reminder: z.boolean(),
  expiring_competencies_reminder: z.boolean(),
  due_date_reminder: z.boolean(),
  nagging_email: z.boolean(),
  forgot_password: z.boolean(),
  new_assignment: z.boolean(),
  welcome_email: z.boolean(),
  success_failure: z.boolean(),
  invalid_email: z.boolean(),
});

const schema = z.object({
  details: detailsSchema,
  userManager: agencyNotificationsSchema,
  agencyAdmin: agencyNotificationsSchema,
  clinician: clinicianNotificationsSchema,
});

type FormValues = z.infer<typeof schema>;

function Notifications() {
  const { currentUser } = useAuth();
  const { flags } = useFeatureFlags();
  const globalAgency = useAgency();
  const isIaEnable = globalAgency.currentAgency?.ia_enable;

  const canEdit =
    [UserRole.HSHAdmin, UserRole.AgencyUser].includes(
      currentUser?.role as UserRole
    ) && !!globalAgency.currentAgency?.id;

  const isAdminUser = currentUser?.role === UserRole.HSHAdmin;

  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      agencyAdmin: {
        exam_completion: false,
        exam_completion_after_final_attempt: false,
        module_completion: false,
        module_completion_after_final_attempt: false,
        sc_submitted: false,
        policy_signed: false,
        document_read: false,
        competency_due_report: false,
        competency_expiration_report: false,
        invalid_email: false,
      },
      userManager: {
        exam_completion: false,
        exam_completion_after_final_attempt: false,
        module_completion: false,
        module_completion_after_final_attempt: false,
        sc_submitted: false,
        policy_signed: false,
        document_read: false,
        competency_due_report: false,
        competency_expiration_report: false,
        invalid_email: false,
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
    },
  });

  const [updateSettings, updateSettingsResult] =
    useUpdateAgencyEmailNotificationsSettingsMutation({
      refetchQueries: ["getAllAgencies"],
    });

  const handleSaveSettings = async (values: FormValues) => {
    if (!globalAgency.currentAgency) return;

    await updateSettings({
      variables: {
        id: globalAgency.currentAgency.id,
        notificationsSettings: {
          user_manager: {
            ...values.userManager,
          },
          agency_admin: {
            ...values.agencyAdmin,
          },
          clinician: {
            ...values.clinician,
          },
        },
        email: values.details.email_address || "",
        name: values.details.organization_name,
      },
    });

    notify({
      title: "Settings saved",
      type: "success",
    });
  };

  useEffect(() => {
    setIsLoading(true);
    if (globalAgency.currentAgency) {
      form.setValue(
        "details.organization_name",
        globalAgency.currentAgency.name
      );
      form.setValue(
        "details.email_address",
        globalAgency.currentAgency.automatic_notifications_email || ""
      );

      if (globalAgency.currentAgency.notifications_settings) {
        form.setValue("userManager", {
          exam_completion:
            !!globalAgency.currentAgency.notifications_settings.user_manager
              .exam_completion,
          exam_completion_after_final_attempt:
            !!globalAgency.currentAgency.notifications_settings.user_manager
              .exam_completion_after_final_attempt,
          module_completion:
            !!globalAgency.currentAgency.notifications_settings.user_manager
              .module_completion,
          module_completion_after_final_attempt:
            !!globalAgency.currentAgency.notifications_settings.user_manager
              .module_completion_after_final_attempt,
          sc_submitted:
            !!globalAgency.currentAgency.notifications_settings.user_manager
              .sc_submitted,
          policy_signed:
            !!globalAgency.currentAgency.notifications_settings.user_manager
              .policy_signed,
          document_read:
            !!globalAgency.currentAgency.notifications_settings.user_manager
              .document_read,
          competency_due_report:
            !!globalAgency.currentAgency.notifications_settings.user_manager
              .competency_due_report,
          competency_expiration_report:
            !!globalAgency.currentAgency.notifications_settings.user_manager
              .competency_expiration_report,
          invalid_email:
            !!globalAgency.currentAgency.notifications_settings.user_manager
              .invalid_email,
        });
        form.setValue("agencyAdmin", {
          exam_completion:
            !!globalAgency.currentAgency.notifications_settings.agency_admin
              .exam_completion,
          exam_completion_after_final_attempt:
            !!globalAgency.currentAgency.notifications_settings.agency_admin
              .exam_completion_after_final_attempt,
          module_completion:
            !!globalAgency.currentAgency.notifications_settings.agency_admin
              .module_completion,
          module_completion_after_final_attempt:
            !!globalAgency.currentAgency.notifications_settings.agency_admin
              .module_completion_after_final_attempt,
          sc_submitted:
            !!globalAgency.currentAgency.notifications_settings.agency_admin
              .sc_submitted,
          policy_signed:
            !!globalAgency.currentAgency.notifications_settings.agency_admin
              .policy_signed,
          document_read:
            !!globalAgency.currentAgency.notifications_settings.agency_admin
              .document_read,
          competency_due_report:
            !!globalAgency.currentAgency.notifications_settings.agency_admin
              .competency_due_report,
          competency_expiration_report:
            !!globalAgency.currentAgency.notifications_settings.agency_admin
              .competency_expiration_report,
          invalid_email:
            !!globalAgency.currentAgency.notifications_settings.agency_admin
              .invalid_email,
        });
        form.setValue("clinician", {
          pending_assignment_reminder:
            !!globalAgency.currentAgency.notifications_settings.clinician
              .pending_assignment_reminder,
          expiring_competencies_reminder:
            !!globalAgency.currentAgency.notifications_settings.clinician
              .expiring_competencies_reminder,
          due_date_reminder:
            !!globalAgency.currentAgency.notifications_settings.clinician
              .due_date_reminder,
          nagging_email:
            !!globalAgency.currentAgency.notifications_settings.clinician
              .nagging_email,
          forgot_password:
            !!globalAgency.currentAgency.notifications_settings.clinician
              .forgot_password,
          new_assignment:
            !!globalAgency.currentAgency.notifications_settings.clinician
              .new_assignment,
          welcome_email:
            !!globalAgency.currentAgency.notifications_settings.clinician
              .welcome_email,
          success_failure:
            !!globalAgency.currentAgency.notifications_settings.clinician
              .success_failure,
          invalid_email:
            !!globalAgency.currentAgency.notifications_settings.clinician
              .invalid_email,
        });
      }
    }

    setIsLoading(false);
  }, [form, globalAgency.currentAgency]);

  return (
    <AdminLayout>
      <AdminSettingsLayout>
        {isLoading ? (
          <div className="flex h-96 w-full items-center justify-center rounded-lg bg-white">
            <Spinner />
          </div>
        ) : (
          <form
            onSubmit={form.handleSubmit(handleSaveSettings)}
            className="flex flex-col gap-5 rounded-lg bg-white px-10 py-8"
          >
            <div className="flex flex-col gap-5">
              <Header
                title="Emails & Notification Details"
                button={
                  <Button
                    label="Save Changes"
                    loading={updateSettingsResult.loading}
                    size="sm"
                    type="submit"
                    disabled={!canEdit}
                  />
                }
              />
              <div className="flex flex-col gap-5 px-4 sm:flex-row">
                <Input
                  register={form.register("details.organization_name")}
                  label="Organization name"
                  disabled={!isAdminUser || !canEdit}
                />
                <Input
                  register={form.register("details.email_address")}
                  label="Email address"
                  disabled={!isAdminUser || !canEdit}
                />
              </div>
            </div>
            <div className="flex flex-col gap-5">
              <Header
                title="Agency Notifications"
                subtitle="Edit User Manager or Agency Admin/Credentialing Users notification settings using the
              dropdown accordions below:"
              />
              <div className="flex flex-col gap-5 px-4 py-10">
                <div className="flex flex-col gap-5">
                  <AgencyNotificationsToggleForm
                    form={form}
                    role="user-manager"
                    canEdit={canEdit}
                  />
                </div>
                <div className="flex flex-col gap-5">
                  <AgencyNotificationsToggleForm
                    form={form}
                    role="agency-admin"
                    canEdit={canEdit}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <Header
                title="Clinician Notifications"
                subtitle="Edit Clinician notification settings:"
              />

              <div className="flex flex-col gap-10 sm:flex-row md:gap-36">
                <ToggleGroup
                  disposition="column"
                  title="Send an automated email to Clinicians to notify:"
                >
                  <Tooltip
                    content={
                      <p className="w-36 rounded bg-black/80 p-1.5 text-xs text-white md:ml-40 md:w-96">
                        Sends a weekly email if clinicians have pending
                        assignments that haven`t been completed yet.
                      </p>
                    }
                    showArrow
                    placement="top"
                    offset={10}
                    arrowOptions={{ fill: "rgb(100,100,100)" }}
                  >
                    <Toggle
                      label="Pending Assignment Reminder"
                      name="clinician.pending_assignment_reminder"
                      control={form.control}
                      disabled={!canEdit}
                    />
                  </Tooltip>

                  <Tooltip
                    content={
                      <p className="w-36 rounded bg-black/80 p-1.5 text-xs text-white md:ml-40 md:w-96">
                        Sends a weekly email to clinicians reminding them of any
                        upcoming competency deadlines within the next 7 days.
                      </p>
                    }
                    showArrow
                    placement="top"
                    offset={10}
                    arrowOptions={{ fill: "rgb(100,100,100)" }}
                  >
                    <Toggle
                      label="Due Date Reminder"
                      name="clinician.due_date_reminder"
                      control={form.control}
                      disabled={!canEdit}
                    />
                  </Tooltip>
                  <Tooltip
                    content={
                      <p className="w-36 rounded bg-black/80 p-1.5 text-xs text-white md:ml-40 md:w-96">
                        Sends a weekly reminder to clinicians who have overdue
                        competencies by 7 days. The system will send up to 5
                        emails to prevent excessive emails.
                      </p>
                    }
                    showArrow
                    placement="top"
                    offset={10}
                    arrowOptions={{ fill: "rgb(100,100,100)" }}
                  >
                    <Toggle
                      label='"Nagging" Email'
                      name="clinician.nagging_email"
                      control={form.control}
                      disabled={!canEdit}
                    />
                  </Tooltip>
                  {isAdminUser && (
                    <Tooltip
                      content={
                        <p className="w-36 rounded bg-black/80 p-1.5 text-xs text-white md:ml-40 md:w-96">
                          Send an email to all clinicians to notify them of
                          their competencies which expire within 45 days.
                        </p>
                      }
                      showArrow
                      placement="top"
                      offset={10}
                      arrowOptions={{ fill: "rgb(100,100,100)" }}
                    >
                      <Toggle
                        label="Expiring Competencies"
                        name="clinician.expiring_competencies_reminder"
                        control={form.control}
                        disabled={!canEdit}
                      />
                    </Tooltip>
                  )}
                </ToggleGroup>
                <ToggleGroup
                  disposition="column"
                  title="System based notifications:"
                >
                  <Toggle
                    label="Forgot Password"
                    control={form.control}
                    disabled={true}
                    name="clinician.forgot_password"
                  />
                  <Toggle
                    label="New Assignment Notification"
                    control={form.control}
                    name="clinician.new_assignment"
                  />
                  <Toggle
                    label="Welcome Email"
                    control={form.control}
                    name="clinician.welcome_email"
                  />
                  <Toggle
                    label="Success/Failure Email"
                    control={form.control}
                    name="clinician.success_failure"
                  />
                  {flags["enabled_integrity_advocate"] && isIaEnable && (
                    <Toggle
                      label="Invalid Email"
                      control={form.control}
                      name="clinician.invalid_email"
                    />
                  )}
                </ToggleGroup>
              </div>
              <div className="flex justify-end">
                <Button
                  label="Save Changes"
                  loading={updateSettingsResult.loading}
                  size="sm"
                  type="submit"
                  disabled={!canEdit}
                />
              </div>
            </div>
          </form>
        )}
      </AdminSettingsLayout>
    </AdminLayout>
  );
}

export default Notifications;

interface HeaderProps {
  title: string;
  subtitle?: string;
  button?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ title, subtitle, button }) => {
  return (
    <div className="flex flex-col items-center justify-between gap-4 border-b border-gray-200 pb-4 sm:flex-row">
      <div className="flex flex-col text-center sm:text-start">
        <h2 className="text-lg font-medium text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-700">{subtitle}</p>}
      </div>
      {button}
    </div>
  );
};

interface AccordionProps {
  button: React.ReactNode;
  children: React.ReactNode;
}

const Accordion: React.FC<AccordionProps> = ({ button, children }) => {
  return (
    <Disclosure>
      <Disclosure.Button
        as="div"
        className="flex w-full items-center gap-4 border-b border-gray-200 pb-5"
      >
        {button}
      </Disclosure.Button>
      <Transition
        enter="transition duration-300 ease-out"
        enterFrom="transform h-0 opacity-0"
        enterTo="transform scale-100 opacity-100"
        leave="transition duration-100 ease-out"
        leaveFrom="transform scale-100 opacity-100"
        leaveTo="transform scale-95 opacity-0"
      >
        <Disclosure.Panel className="text-gray-500">
          {children}
        </Disclosure.Panel>
      </Transition>
    </Disclosure>
  );
};

interface ToggleGroupProps {
  title: string;
  children: React.ReactNode;
  disposition?: "row" | "column";
}

export const ToggleGroup: React.FC<ToggleGroupProps> = ({
  title,
  children,
  disposition = "row",
}) => {
  return (
    <div className="flex flex-col gap-5">
      <h3 className="text-sm font-medium text-gray-700">{title}</h3>
      <div
        className={clsx("flex flex-col gap-5", {
          "md:flex-col md:gap-5": disposition === "column",
          "md:flex-row md:gap-36": disposition === "row",
        })}
      >
        {children}
      </div>
    </div>
  );
};

interface AgencyNotificationsToggleFormProps {
  role: "user-manager" | "agency-admin";
  canEdit: boolean;
  form: UseFormReturn<FormValues>;
}

export const AgencyNotificationsToggleForm: React.FC<
  AgencyNotificationsToggleFormProps
> = ({ role, canEdit, form }) => {
  const { currentUser } = useAuth();
  const isAdminUser = currentUser?.role === UserRole.HSHAdmin;
  const { flags } = useFeatureFlags();
  const globalAgency = useAgency();
  const isIaEnable = globalAgency.currentAgency?.ia_enable;
  const control = form.control;
  const values = useWatch({
    control,
  });

  const agencyExamCompletion = values.agencyAdmin?.exam_completion;
  const agencyModuleCompletion = values.agencyAdmin?.module_completion;
  const userManagerExamCompletion = values.userManager?.exam_completion;
  const userManagerModuleCompletion = values.userManager?.module_completion;

  const options = {
    "user-manager": {
      title: "User Manager",
      subtitle:
        "(Only sends emails about clinicians under the User Manager’s supervision)",
      field: "userManager",
      moduleCompletion: userManagerModuleCompletion,
      examCompletion: userManagerExamCompletion,
    },
    "agency-admin": {
      title: "Agency Admin/Credentialing User",
      subtitle: "(Sends emails about all clinicians within the agency)",
      field: "agencyAdmin",
      moduleCompletion: agencyExamCompletion,
      examCompletion: agencyModuleCompletion,
    },
  };

  const reportOptions = {
    "user-manager": {
      title: "User Manager",
      subtitle: "Send an automated email to User Manager to notify:",
      field: "userManager",
    },
    "agency-admin": {
      title: "Agency Admin/Credentialing User",
      subtitle:
        "Send an automated email to Agency Admin/Credentialing User to notify:",
      field: "agencyAdmin",
    },
  };

  const currentReportOptions = reportOptions[role];
  const currentOptions = options[role];

  useEffect(() => {
    if (!values.agencyAdmin?.exam_completion) {
      form.setValue("agencyAdmin.exam_completion_after_final_attempt", false);
    }
    if (!values.agencyAdmin?.module_completion) {
      form.setValue("agencyAdmin.module_completion_after_final_attempt", false);
    }
    if (!values.userManager?.exam_completion) {
      form.setValue("userManager.exam_completion_after_final_attempt", false);
    }
    if (!values.userManager?.module_completion) {
      form.setValue("userManager.module_completion_after_final_attempt", false);
    }
  }, [
    form,
    values.agencyAdmin?.exam_completion,
    values.agencyAdmin?.module_completion,
    values.userManager?.exam_completion,
    values.userManager?.module_completion,
  ]);

  if (
    currentUser?.role === UserRole.UsersManager ||
    currentUser?.role === UserRole.CredentialingUser
  ) {
    return <NotAuthorized />;
  }
  return (
    <Accordion
      button={
        <div className="flex w-full flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex w-full flex-col items-center gap-4 sm:flex-row">
            <h3 className="text-center font-bold text-gray-900 sm:text-start">
              {currentOptions.title}
            </h3>
            <span className="text-center text-sm text-gray-700 sm:text-start">
              {currentOptions.subtitle}
            </span>
          </div>
          <FontAwesomeIcon
            icon={faChevronDown}
            className="transition-all hui-open:rotate-180 hui-open:transform"
          />
        </div>
      }
    >
      <div className="flex flex-col gap-7 pb-16">
        <ToggleGroup
          title="Send email when Exam is completed successfully or on
                    failure?"
        >
          <Toggle
            control={control}
            label="Enable"
            name={`${currentOptions.field}.exam_completion`}
            disabled={!canEdit}
          />
          <Toggle
            control={control}
            label="Only send after final attempt"
            name={`${currentOptions.field}.exam_completion_after_final_attempt`}
            disabled={!canEdit || !currentOptions.examCompletion}
          />
        </ToggleGroup>

        <ToggleGroup
          title="Send email when Module is completed successfully or on
                    failure?"
        >
          <Toggle
            control={control}
            label="Enable"
            name={`${currentOptions.field}.module_completion`}
            disabled={!canEdit}
          />
          <Toggle
            control={control}
            label="Only send after final attempt"
            name={`${currentOptions.field}.module_completion_after_final_attempt`}
            disabled={!canEdit || !currentOptions.moduleCompletion}
          />
        </ToggleGroup>

        <ToggleGroup title="Send email when Skills Checklist is submitted?">
          <Toggle
            control={control}
            label="Enable"
            disabled={!canEdit}
            name={`${currentOptions.field}.sc_submitted`}
          />
        </ToggleGroup>

        <ToggleGroup title="Send email when Policy is signed?">
          <Toggle
            control={control}
            label="Enable"
            disabled={!canEdit}
            name={`${currentOptions.field}.policy_signed`}
          />
        </ToggleGroup>

        <ToggleGroup title="Send email when Document is read?">
          <Toggle
            control={control}
            label="Enable"
            disabled={!canEdit}
            name={`${currentOptions.field}.document_read`}
          />
        </ToggleGroup>

        {flags["enabled_integrity_advocate"] && isIaEnable && (
          <ToggleGroup title="Send invalid email when clinciian have an invalid attempt?">
            <Toggle
              control={control}
              label="Enable"
              disabled={!canEdit}
              name={`${currentOptions.field}.invalid_email`}
            />
          </ToggleGroup>
        )}

        {isAdminUser && (
          <ToggleGroup title={currentReportOptions.subtitle}>
            <Tooltip
              content={
                <p className="w-36 rounded bg-black/80 p-1.5 text-xs text-white md:ml-40 md:w-96">
                  Send a weekly email to {currentReportOptions.title} to notify
                  of Clinicians&apos; competencies which will expire within 45
                  days.
                </p>
              }
              showArrow
              placement="top"
              offset={10}
              arrowOptions={{ fill: "rgb(100,100,100)" }}
            >
              <Toggle
                control={control}
                label="Expiring Competencies Report"
                disabled={!canEdit}
                name={`${currentOptions.field}.competency_expiration_report`}
              />
            </Tooltip>
          </ToggleGroup>
        )}
      </div>
    </Accordion>
  );
};
