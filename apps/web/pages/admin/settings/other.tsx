import { AdminLayout } from "../../../components/AdminLayout";
import Tabs from "../../../components/Tabs";
import { SettingsTabs } from "../../../components/exams/tabs";
import { withAuth } from "../../../hooks/withAuth";
import { AdminGroup, UserRole } from "../../../types/roles";
import { useEffect, useState } from "react";
import Select from "../../../components/Select";
import Button from "../../../components/Button";
import { faCircleCheck } from "@fortawesome/pro-regular-svg-icons";
import AdminPanel from "../../../components/AdminPanel";
import z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUpdateAgencyMutation } from "api";
import {
  GENERIC_SUCCESS_SAVED,
  notify,
} from "../../../components/Notification";
import { useAuth } from "../../../hooks/useAuth";
import { Toggle } from "../../../components/Toggle";
import { useAgency } from "../../../hooks/useAgency";
import { Input } from "../../../components/Input";
import { Spinner } from "../../../components/Spinner";
import { ExpirationType } from "types";
import NotAuthorized from "../../not-authorized";

const validationSchema = z.object({
  cat_exams_enabled: z.boolean(),
  custom_allowed_attempts_exams: z.coerce.number().min(0).max(100).optional(),
  cat_modules_enabled: z.boolean(),
  custom_allowed_attempts_modules: z.coerce.number().min(0).max(100).optional(),
  default_due_date: z.coerce
    .number({
      required_error: "Default due date is required",
    })
    .min(0),
  default_expiration: z.enum([
    ExpirationType.YEARLY,
    ExpirationType.BIANNUAL,
    ExpirationType.ONE_TIME,
  ]),
  sc_allow_na_option: z.boolean(),
  self_assigment_allow: z.boolean(),
});

type FormData = z.infer<typeof validationSchema>;

const defaultAttemptsOptions = [
  { label: "1", value: "1", selected: false },
  { label: "2", value: "2", selected: false },
  { label: "3", value: "3", selected: false },
  { label: "4", value: "4", selected: false },
  { label: "5", value: "5", selected: false },
  { label: "6", value: "6", selected: false },
  { label: "7", value: "7", selected: false },
  { label: "8", value: "8", selected: false },
  { label: "9", value: "9", selected: false },
  { label: "10", value: "10", selected: false },
];

const defaultExpirationOptions = [
  { label: "Annual", value: ExpirationType.YEARLY, selected: false },
  { label: "Biannual", value: ExpirationType.BIANNUAL, selected: false },
  { label: "No Expiration", value: ExpirationType.ONE_TIME, selected: false },
];

function OtherSettings() {
  const globalAgency = useAgency();
  const auth = useAuth();
  const form = useForm<FormData>({
    resolver: zodResolver(validationSchema),
  });

  const [loadingContent, setLoadingContent] = useState(true);

  const canEdit =
    [UserRole.AgencyUser, UserRole.HSHAdmin].includes(
      auth.currentUser?.role as UserRole
    ) && !!globalAgency.currentAgency?.id;

  const settingsTabs = SettingsTabs.filter((tab) =>
    tab.allowed_roles?.includes(auth.currentUser?.role as UserRole)
  );

  const [updateAgency, updateAgencyResult] = useUpdateAgencyMutation({
    refetchQueries: ["getAllAgencies"],
  });

  const catExamEnabled = form.watch("cat_exams_enabled");
  const catModuleEnabled = form.watch("cat_modules_enabled");

  const onSubmit = form.handleSubmit(async (values) => {
    if (!globalAgency.currentAgency) return;

    await updateAgency({
      variables: {
        id: globalAgency.currentAgency?.id,
        data: {
          custom_allowed_attempts_exams: values.cat_exams_enabled
            ? values.custom_allowed_attempts_exams
            : 0,
          custom_allowed_attempts_modules: values.cat_modules_enabled
            ? values.custom_allowed_attempts_modules
            : 0,
          default_expiration: values.default_expiration,
          default_due_date: values.default_due_date,
          sc_allow_na_option: values.sc_allow_na_option,
          self_assigment_allow: values.self_assigment_allow,
        },
      },
    });

    notify(GENERIC_SUCCESS_SAVED);
  });

  useEffect(() => {
    if (globalAgency.currentAgency) {
      const currentAgency = globalAgency.currentAgency;

      form.reset({
        default_expiration: currentAgency.default_expiration,
        default_due_date: currentAgency.default_due_date,
        cat_exams_enabled: currentAgency.custom_allowed_attempts_exams > 0,
        cat_modules_enabled: currentAgency.custom_allowed_attempts_modules > 0,
        sc_allow_na_option: currentAgency.sc_allow_na_option,
        self_assigment_allow: currentAgency.self_assigment_allow,
      });
    }

    setLoadingContent(false);
  }, [globalAgency.currentAgency, form]);

  useEffect(() => {
    if (catExamEnabled && globalAgency.currentAgency) {
      form.setValue(
        "custom_allowed_attempts_exams",
        globalAgency.currentAgency.custom_allowed_attempts_exams || 1
      );
    }
  }, [catExamEnabled, form, globalAgency.currentAgency]);

  useEffect(() => {
    if (catModuleEnabled && globalAgency.currentAgency) {
      form.setValue(
        "custom_allowed_attempts_modules",
        globalAgency.currentAgency.custom_allowed_attempts_modules || 1
      );
    }
  }, [catModuleEnabled, form, globalAgency.currentAgency]);

  if (
    auth.currentUser?.role === UserRole.UsersManager ||
    auth.currentUser?.role === UserRole.CredentialingUser
  ) {
    return <NotAuthorized />;
  }

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6 sm:gap-12">
        <h1 className="text-2xl font-medium text-blue-800">Settings</h1>
        <div className="flex flex-col gap-10">
          <Tabs tabs={settingsTabs} />
          <AdminPanel>
            {loadingContent ? (
              <div className="flex h-96 items-center justify-center">
                <Spinner />
              </div>
            ) : (
              <form className="flex flex-col gap-6" onSubmit={onSubmit}>
                <div className="flex justify-between border-b border-gray-100">
                  <h1 className="text-lg font-medium">Other Settings</h1>
                  <div className="mb-4 flex flex-col">
                    <Button
                      type="submit"
                      label="Save Changes"
                      iconLeft={faCircleCheck}
                      classes="w-full self-end"
                      disabled={!canEdit}
                      loading={updateAgencyResult.loading}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-8">
                  <div className="flex flex-col gap-4">
                    <Toggle
                      name="cat_exams_enabled"
                      label="Custom Allowed Attempts (Exams)"
                      control={form.control}
                      labelClasses="text-sm text-gray-700 ml-4"
                      disabled={!canEdit}
                    />
                    <Select
                      label="Allowed Attempt(s)"
                      options={
                        catExamEnabled
                          ? defaultAttemptsOptions
                          : [
                              {
                                label: "Use default attempts from Exam",
                                value: "0",
                              },
                            ]
                      }
                      register={form.register("custom_allowed_attempts_exams")}
                      error={
                        form.formState.errors.custom_allowed_attempts_exams
                      }
                      disabled={!canEdit || !catExamEnabled}
                    />
                  </div>
                  <div className="flex flex-col gap-4">
                    <Toggle
                      name="cat_modules_enabled"
                      label="Custom Allowed Attempts (Modules)"
                      control={form.control}
                      labelClasses="text-sm text-gray-700 ml-4"
                      disabled={!canEdit}
                    />
                    <Select
                      label="Allowed Attempt(s)"
                      options={
                        catModuleEnabled
                          ? defaultAttemptsOptions
                          : [
                              {
                                label: "Use default attempts from Module",
                                value: "0",
                              },
                            ]
                      }
                      register={form.register(
                        "custom_allowed_attempts_modules"
                      )}
                      error={
                        form.formState.errors.custom_allowed_attempts_modules
                      }
                      disabled={!canEdit || !catModuleEnabled}
                    />
                  </div>
                  <Input
                    register={form.register("default_due_date")}
                    label="Default Due Date in days"
                    disabled={!canEdit}
                    type="number"
                  />
                  <Select
                    label="Default Expiration Setting"
                    options={defaultExpirationOptions}
                    register={form.register("default_expiration")}
                    disabled={!canEdit}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="font-medium">
                    Not Applicable allowed on Skills Checklist
                  </h3>
                  <Toggle
                    name="sc_allow_na_option"
                    label="If this is enable, clinicians can skip sections of the skills checklists and mark proficiencies and frequencies as 'Not Applicable'"
                    control={form.control}
                    labelClasses="text-sm text-gray-700 ml-4"
                    disabled={!canEdit}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="font-medium">
                    Allow clinicians to self-assign curriculum
                  </h3>
                  <Toggle
                    name="self_assigment_allow"
                    label="If this is enable, clinicians can assign content through the clinician user interface"
                    control={form.control}
                    labelClasses="text-sm text-gray-700 ml-4"
                    disabled={!canEdit}
                  />
                </div>
              </form>
            )}
          </AdminPanel>
        </div>
      </div>
    </AdminLayout>
  );
}

export default withAuth(OtherSettings, AdminGroup);
