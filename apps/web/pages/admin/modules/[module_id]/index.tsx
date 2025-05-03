import {
  faArrowLeft,
  faCheckCircle,
  faFile,
  faX,
} from "@fortawesome/pro-regular-svg-icons";
import { AdminLayout } from "../../../../components/AdminLayout";
import Button from "../../../../components/Button";
import { withAuth } from "../../../../hooks/withAuth";
import { AdminGroup, UserRole } from "../../../../types/roles";
import { useRouter } from "next/router";
import { Input } from "../../../../components/Input";
import { useForm } from "react-hook-form";
import { Textarea } from "../../../../components/Textarea";
import {
  useCreateModuleDefinitionMutation,
  useCreateModuleVersionMutation,
  useGetAllCategoriesQuery,
  useGetModuleDefinitionQuery,
  useUpdateModuleDefinitionMutation,
} from "api";
import { Combobox } from "../../../../components/Combobox";
import { useEffect, useState } from "react";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  notify,
  GENERIC_SUCCESS_SAVED,
  GENERIC_SUCCESS_CREATED,
} from "../../../../components/Notification";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useAuth } from "../../../../hooks/useAuth";
import { useAgency } from "../../../../hooks/useAgency";
import Select from "../../../../components/Select";
import { DirectusStatus, ExpirationType } from "types";
import { startCase } from "lodash";
import { createFile, getContentExpirationDate } from "../../../../utils/utils";
import { formatDateForInput } from "../../../../utils/format";
import { COMBOBOX_RESULTS_AMOUNT } from "../../../../types/global";

const refetchQueries = [
  "getModuleDefinition",
  "getModulesDefinitions",
  "getModulesDefinitionsTotalPages",
];

const schema = z.object({
  title: z
    .string({
      required_error: "Title is required",
    })
    .nonempty("Title is required"),
  modality: z.object(
    {
      id: z.string(),
    },
    {
      required_error: "Modality is required",
      invalid_type_error: "Modality is required",
    }
  ),
  specialty: z
    .object(
      {
        id: z.string(),
      },
      {
        invalid_type_error: "Specialty is required",
        required_error: "Specialty is required",
      }
    )
    .nullable(),
  sub_specialty: z
    .object(
      {
        id: z.string(),
      },
      {
        invalid_type_error: "Sub specialty is required",
        required_error: "Sub specialty is required",
      }
    )
    .nullable(),
  package: z.custom<FileList>().optional(),
  expiration: z.string(),
  description: z.string().optional(),
  copyright: z.string().optional(),
  contact_hour: z.number({
    invalid_type_error: "Contact hour must be a number",
    required_error: "Contact hour is required",
  }),
  entry_point: z
    .string({
      required_error: "Entry point is required",
    })
    .nonempty("Entry point is required"),
  allowed_attempts: z.coerce
    .number({
      invalid_type_error: "Allowed attempts must be a number",
      required_error: "Allowed attempts is required",
    })
    .gt(0, "Allowed attempts must be greater than 0"),
  expiration_date: z.string(),
});

type FormValues = z.infer<typeof schema>;

function Module() {
  const router = useRouter();

  const moduleId = router.query.module_id as string;
  const isNew = moduleId === "new";

  const { currentUser } = useAuth();
  const globalAgency = useAgency();

  const canEdit = currentUser?.role === UserRole.HSHAdmin;

  const [modalitySearchQuery, setModalitySearchQuery] = useState("");
  const [specialtySearchQuery, setSpecialtySearchQuery] = useState("");
  const [subSpecialtySearchQuery, setSubSpecialtySearchQuery] = useState("");

  const [loading, setLoading] = useState(false);
  const [uploadNewFile, setUploadNewFile] = useState(false);
  const isUserAdminOrDeveloper =
    currentUser?.role === UserRole.HSHAdmin ||
    currentUser?.role === UserRole.Developer;

  const moduleDefinitionQuery = useGetModuleDefinitionQuery({
    variables: {
      id: moduleId,
    },
    skip: isNew,
  });

  const moduleDefinition = moduleDefinitionQuery.data?.modules_definition_by_id;

  const [createModule] = useCreateModuleDefinitionMutation({
    refetchQueries,
  });
  const [updateModule] = useUpdateModuleDefinitionMutation({
    refetchQueries,
  });
  const [createModuleVersion] = useCreateModuleVersionMutation({
    refetchQueries,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      entry_point: "index.html",
    },
  });

  const modalitiesQuery = useGetAllCategoriesQuery({
    variables: {
      filter: {
        type: {
          _eq: "modality",
        },
        status: {
          _eq: DirectusStatus.PUBLISHED,
        },
      },
      sort: ["title"],
      limit: COMBOBOX_RESULTS_AMOUNT,
      search: modalitySearchQuery,
    },
  });

  const specialtiesQuery = useGetAllCategoriesQuery({
    variables: {
      filter: {
        type: {
          _eq: "speciality",
        },
        status: {
          _eq: DirectusStatus.PUBLISHED,
        },
      },
      sort: ["title"],
      limit: COMBOBOX_RESULTS_AMOUNT,
      search: specialtySearchQuery,
    },
  });
  const subSpecialtiesQuery = useGetAllCategoriesQuery({
    variables: {
      filter: {
        type: {
          _eq: "sub_speciality",
        },
        status: {
          _eq: DirectusStatus.PUBLISHED,
        },
      },
      sort: ["title"],
      limit: COMBOBOX_RESULTS_AMOUNT,
      search: subSpecialtySearchQuery,
    },
  });

  const modalities = modalitiesQuery.data?.categories || [];
  const specialties = specialtiesQuery.data?.categories || [];
  const subSpecialties = subSpecialtiesQuery.data?.categories || [];

  const onSubmit = async (values: FormValues) => {
    if (!canEdit) return;

    try {
      setLoading(true);

      if (isNew) {
        if (values.package?.length === 0 || !values.package) {
          notify({
            title: "Error",
            description: "You must upload a file",
            type: "error",
          });
          return;
        }

        const formData = new FormData();
        formData.append("folder", "37f3f9fe-3d12-46c2-aff7-88da35db1ddb");
        formData.append("title", values.package[0].name);
        formData.append("file", values.package[0]);

        let response;
        try {
          response = await createFile(formData);
        } catch (fileError) {
          console.error(fileError);
          notify({
            type: "error",
            title: "Error uploading file.",
            description:
              "Upload failed due to a system error. Please try again. Refreshing the page may cause unsaved data to be lost. If the issue persists, save your entries separately and contact support.",
          });
          return;
        }

        if (!response || !response.id) {
          notify({
            type: "error",
            title: "Error",
            description:
              "File upload failed or the file response is invalid. Please try again.",
          });
          return;
        }

        const createModuleResponse = await createModule({
          variables: {
            data: {
              status: DirectusStatus.PUBLISHED,
              modality: {
                id: values.modality.id,
              },
              copyright: values.copyright,
              title: values.title,
              description: values.description,
              expiration_date: getContentExpirationDate(),
              versions: [
                {
                  expiration: values.expiration,
                  version_number: 1,
                  package: {
                    id: response?.id || "",
                    filename_download: response?.filename_disk || "",
                    storage: response?.storage || "",
                  },
                  entry_point: values.entry_point,
                  allowed_attempts: values.allowed_attempts,
                  contact_hour: values.contact_hour,
                },
              ],
              sub_specialty: values.sub_specialty?.id
                ? {
                    id: values.sub_specialty.id,
                  }
                : undefined,
              specialty: values.specialty?.id
                ? {
                    id: values.specialty.id,
                  }
                : undefined,
            },
          },
        });

        await updateModule({
          variables: {
            id:
              createModuleResponse.data?.create_modules_definition_item?.id ||
              "",
            data: {
              last_version: {
                id: createModuleResponse.data?.create_modules_definition_item?.versions?.at(
                  0
                )?.id,
              },
            },
          },
        });

        notify(GENERIC_SUCCESS_CREATED);
        await router.push("/admin/modules");
      } else {
        let uploadFileResponse;

        if (values.package?.length !== 0 && values.package) {
          const file = values.package[0];

          const formData = new FormData();
          formData.append("folder", "37f3f9fe-3d12-46c2-aff7-88da35db1ddb");
          formData.append("title", file.name);
          formData.append("file", file);

          uploadFileResponse = await createFile(formData);
        }

        let packageData;

        if (uploadFileResponse) {
          packageData = {
            id: uploadFileResponse.id,
            filename_download: uploadFileResponse.filename_disk,
            storage: uploadFileResponse.storage,
          };
        } else if (
          moduleDefinition?.last_version?.package?.filename_download &&
          moduleDefinition.last_version.package.storage
        ) {
          packageData = {
            id: moduleDefinition?.last_version?.package?.id,
            filename_download:
              moduleDefinition?.last_version?.package?.filename_download,
            storage: moduleDefinition?.last_version?.package?.storage,
          };
        } else {
          notify({
            title: "Error",
            description: "You must upload a file",
            type: "error",
          });
          return;
        }

        const haveToCreateAVersion =
          moduleDefinition?.last_version?.expiration !== values.expiration ||
          moduleDefinition?.last_version?.package?.id !== packageData.id ||
          moduleDefinition.last_version.allowed_attempts !==
            values.allowed_attempts ||
          moduleDefinition.last_version.contact_hour !== values.contact_hour;

        let createModuleVersionResponse;

        if (haveToCreateAVersion) {
          createModuleVersionResponse = await createModuleVersion({
            variables: {
              data: {
                expiration: values.expiration,
                version_number: moduleDefinition?.last_version?.version_number
                  ? moduleDefinition.last_version.version_number + 1
                  : 1,
                package: packageData,
                entry_point: values.entry_point,
                allowed_attempts: values.allowed_attempts,
                contact_hour: values.contact_hour,
              },
            },
          });
        }

        await updateModule({
          variables: {
            id: moduleDefinition?.id || "",
            data: {
              last_version: {
                id: createModuleVersionResponse
                  ? createModuleVersionResponse.data
                      ?.create_modules_versions_item?.id
                  : moduleDefinition?.last_version?.id,
              },
              copyright: values.copyright,
              modality: {
                id: values.modality.id,
              },

              title: values.title,
              description: values.description,
              specialty: values.specialty?.id
                ? {
                    id: values.specialty.id,
                  }
                : undefined,
              sub_specialty: values.sub_specialty?.id
                ? {
                    id: values.sub_specialty.id,
                  }
                : undefined,
              expiration_date: getContentExpirationDate(),
            },
          },
        });

        notify(GENERIC_SUCCESS_SAVED);
      }
    } catch (error) {
      notify({
        type: "error",
        title: "Error saving the module.",
        description:
          "An unexpected error occurred. Try refreshing the page. If you continue to see this message, please log out and log back in. If the problem persists, reach out to support with details of the action you were performing.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (moduleDefinition) {
      moduleDefinition.title && form.setValue("title", moduleDefinition.title);
      moduleDefinition.description &&
        form.setValue("description", moduleDefinition.description);
      moduleDefinition.last_version?.expiration &&
        form.setValue("expiration", moduleDefinition.last_version?.expiration);
      moduleDefinition.modality &&
        form.setValue("modality", moduleDefinition.modality);
      moduleDefinition.specialty &&
        form.setValue("specialty", moduleDefinition.specialty);
      moduleDefinition.sub_specialty &&
        form.setValue("sub_specialty", moduleDefinition.sub_specialty);
      moduleDefinition.copyright &&
        form.setValue("copyright", moduleDefinition.copyright);
      moduleDefinition.last_version?.entry_point &&
        form.setValue("entry_point", moduleDefinition.last_version.entry_point);
      moduleDefinition.last_version?.contact_hour &&
        form.setValue(
          "contact_hour",
          moduleDefinition.last_version?.contact_hour
        );
      moduleDefinition.last_version?.allowed_attempts &&
        form.setValue(
          "allowed_attempts",
          moduleDefinition.last_version.allowed_attempts
        );
      moduleDefinition.expiration_date &&
        form.setValue(
          "expiration_date",
          formatDateForInput(moduleDefinition.expiration_date)
        );
    } else {
      globalAgency.currentAgency?.custom_allowed_attempts_modules &&
        form.setValue(
          "allowed_attempts",
          globalAgency.currentAgency?.custom_allowed_attempts_modules
        );
      form.setValue(
        "expiration_date",
        formatDateForInput(getContentExpirationDate())
      );
    }
  }, [moduleDefinition, form, globalAgency.currentAgency]);

  useEffect(() => {
    if (moduleDefinition && moduleDefinition.last_version?.package) {
      setUploadNewFile(false);
    } else {
      setUploadNewFile(true);
    }
  }, [moduleDefinition]);

  return (
    <AdminLayout>
      <div className="flex flex-col gap-7">
        <h1 className="text-2xl font-medium text-blue-800">Modules</h1>
        <div>
          <Button
            variant="link"
            label="Back to List"
            iconLeft={faArrowLeft}
            onClick={async () => await router.push("/admin/modules")}
          />
        </div>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl leading-none text-blue-900">
            {isNew ? "New Module" : moduleDefinition?.title}
          </h2>
          <div className="flex items-center">
            {canEdit && (
              <Button
                label={isNew ? "Create Module" : "Save Changes"}
                iconLeft={faCheckCircle}
                onClick={form.handleSubmit(onSubmit)}
                disabled={loading}
              />
            )}
          </div>
        </div>
        <div className="flex flex-col gap-10 rounded-lg bg-white p-9">
          <h3 className="w-full border-b pb-6 text-lg font-medium text-gray-900">
            Module Details
          </h3>
          <form className="flex flex-col gap-5">
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <Input
                error={form.formState.errors.title}
                register={form.register("title")}
                label="Title"
                required
                disabled={!canEdit}
              />
              <Input
                error={form.formState.errors.copyright}
                register={form.register("copyright")}
                label="Copyright"
                disabled={!canEdit}
              />
              <Input
                error={form.formState.errors.allowed_attempts}
                register={form.register("allowed_attempts")}
                label="Allowed Attempts"
                required
                disabled={!canEdit}
              />
            </div>
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <Input
                error={form.formState.errors.contact_hour}
                register={form.register("contact_hour", {
                  valueAsNumber: true,
                })}
                required
                label="Contact Hour (CEU)"
                disabled={!canEdit}
              />
              <Combobox
                disabled={!canEdit}
                options={modalities}
                control={form.control}
                name="modality"
                query={modalitySearchQuery}
                setQuery={setModalitySearchQuery}
                getLabel={(val) => val?.title || ""}
                by="id"
                label="Cat 1 - Modality"
                required
              />
            </div>
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <Combobox
                options={specialties}
                disabled={!canEdit}
                control={form.control}
                name="specialty"
                query={specialtySearchQuery}
                setQuery={setSpecialtySearchQuery}
                getLabel={(val) => val?.title || ""}
                by="id"
                label="Cat 2 - Speciality (optional)"
              />
              <Combobox
                options={subSpecialties}
                disabled={!canEdit}
                control={form.control}
                name="sub_specialty"
                query={subSpecialtySearchQuery}
                setQuery={setSubSpecialtySearchQuery}
                getLabel={(val) => val?.title || ""}
                by="id"
                label="Cat 3 - Sub speciality (optional)"
              />
            </div>
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              {currentUser?.role === UserRole.HSHAdmin && (
                <>
                  {uploadNewFile ? (
                    <Input
                      multiple={false}
                      accept=".zip"
                      type="file"
                      register={form.register("package")}
                      label="Package"
                      disabled={loading || !canEdit}
                      error={form.formState.errors.package}
                      required
                    />
                  ) : (
                    <div className="flex w-full items-center justify-between">
                      <span className="text-sm text-gray-500">
                        <FontAwesomeIcon icon={faFile} />{" "}
                        {moduleDefinition?.last_version?.package?.title}
                      </span>
                      {canEdit && (
                        <button
                          onClick={() => setUploadNewFile(true)}
                          type="button"
                          className="font-bold text-red-500"
                        >
                          <FontAwesomeIcon icon={faX} />
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
              <Input
                error={form.formState.errors.entry_point}
                register={form.register("entry_point")}
                label="Entry Point"
                required
                disabled={!canEdit}
              />
            </div>
            <div className="flex flex-col gap-6 sm:flex-row">
              <Textarea
                register={form.register("description")}
                label="Description"
                classes="w-full"
                error={form.formState.errors.description}
                disabled={!canEdit}
              />
              <Select
                label="Exam Expiration"
                options={Object.values(ExpirationType).map((e) => ({
                  label: startCase(e),
                  value: e,
                }))}
                register={form.control.register("expiration")}
                required
              />
            </div>
            {isUserAdminOrDeveloper && (
              <div className="flex flex-col gap-6 sm:flex-row">
                <Input
                  type="date"
                  error={form.formState.errors.expiration_date}
                  register={form.register("expiration_date")}
                  label="Valid thru"
                  disabled={true}
                />
              </div>
            )}
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}

export default withAuth(Module, AdminGroup);
