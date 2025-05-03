import { faArrowLeft, faCheckCircle } from "@fortawesome/pro-regular-svg-icons";
import { AdminLayout } from "../../../../components/AdminLayout";
import Button from "../../../../components/Button";
import { withAuth } from "../../../../hooks/withAuth";
import { AdminGroup, UserRole } from "../../../../types/roles";
import { useRouter } from "next/router";
import { Input } from "../../../../components/Input";
import { useForm } from "react-hook-form";
import {
  useCreateBundleMutation,
  useGetAllDocumentsQuery,
  useGetAllExamsQuery,
  useGetAllPoliciesQuery,
  useGetBundleByIdQuery,
  useGetModulesDefinitionsQuery,
  useGetSkillChecklistsDetailsQuery,
  useUpdateBundleMutation,
} from "api";
import { Combobox } from "../../../../components/Combobox";
import { useEffect, useMemo, useState } from "react";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  notify,
  GENERIC_SUCCESS_SAVED,
  GENERIC_SUCCESS_CREATED,
} from "../../../../components/Notification";
import { useAuth } from "../../../../hooks/useAuth";
import { useAgency } from "../../../../hooks/useAgency";
import { DirectusStatus } from "types";
import Select from "../../../../components/Select";
import { COMBOBOX_RESULTS_AMOUNT } from "../../../../types/global";

const schema = z.object({
  name: z
    .string({
      required_error: "Name is required",
    })
    .nonempty("Name is required"),
  // speciality: z
  //   .object({
  //     id: z.string(),
  //   })
  //   .nullable()
  //   .optional(),
  // departments: z
  //   .object({
  //     id: z.string(),
  //   })
  //   .nullable()
  //   .optional(),
  // locations: z
  //   .object({
  //     id: z.string(),
  //   })
  //   .nullable()
  //   .optional(),
  agency: z.string().or(z.literal("all")).optional(),
  exams: z.array(z.any()).nullable().optional(),
  modules: z.array(z.any()).nullable().optional(),
  skills_checklists: z.array(z.any()).nullable().optional(),
  policies: z.array(z.any()).nullable().optional(),
  documents: z.array(z.any()).nullable().optional(),
  bundles: z.array(z.any()).nullable().optional(),
});

type FormValues = z.infer<typeof schema>;

function Bundle() {
  const router = useRouter();

  const bundleId = router.query.bundle_id as string;
  const isNew = bundleId === "new";

  const { currentUser } = useAuth();
  const globalAgency = useAgency();

  const canEdit = [
    UserRole.AgencyUser,
    UserRole.HSHAdmin,
    UserRole.CredentialingUser,
  ].includes(currentUser?.role as UserRole);

  const isAgencyUser = currentUser?.role === UserRole.AgencyUser;
  const isCredUser = currentUser?.role === UserRole.CredentialingUser;

  // const [specialitySearchQuery, setSpecialitySearchQuery] = useState("");
  // const [departmentsSearchQuery, setDepartmentsSearchQuery] = useState("");
  // const [locationsSearchQuery, setLocationsSearchQuery] = useState("");
  const [examsSearchQuery, setExamsSearchQuery] = useState("");
  const [modulesSearchQuery, setModulesSearchQuery] = useState("");
  const [skillsChecklistsSearchQuery, setSkillsChecklistsSearchQuery] =
    useState("");
  const [policiesSearchQuery, setPoliciesSearchQuery] = useState("");
  const [documentsSearchQuery, setDocumentsSearchQuery] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const bundleQuery = useGetBundleByIdQuery({
    variables: {
      id: bundleId,
    },
    skip: isNew,
  });

  // const specialitiesQuery = useSpecialtiesQuery({
  //   variables: {
  //     search: specialitySearchQuery,
  //     limit: DROPDOWN_LIMIT,
  //     filter: {
  //       status: {
  //         _eq: DirectusStatus.PUBLISHED,
  //       },
  //     },
  //   },
  //   skip: !canEdit,
  // });

  // const departmentsQuery = useDepartmentsQuery({
  //   variables: {
  //     search: departmentsSearchQuery,
  //     limit: DROPDOWN_LIMIT,
  //     filter: {
  //       status: {
  //         _eq: DirectusStatus.PUBLISHED,
  //       },
  //       ...(globalAgency.currentAgency?.id && {
  //         agency: {
  //           id: {
  //             _eq: globalAgency.currentAgency.id,
  //           },
  //         },
  //       }),
  //     },
  //   },
  //   skip: !canEdit,
  // });

  // const locationsQuery = useLocationsQuery({
  //   variables: {
  //     search: locationsSearchQuery,
  //     limit: DROPDOWN_LIMIT,
  //     filter: {
  //       status: {
  //         _eq: DirectusStatus.PUBLISHED,
  //       },
  //       ...(globalAgency.currentAgency?.id && {
  //         agency: {
  //           id: {
  //             _eq: globalAgency.currentAgency.id,
  //           },
  //         },
  //       }),
  //     },
  //   },
  //   skip: !canEdit,
  // });

  const competenciesFilters = useMemo(() => {
    const agencyId = globalAgency.currentAgency?.id;

    if (!agencyId) {
      return {
        agencies_id: {
          id: {
            _null: true,
          },
        },
      };
    }

    return {
      _or: [
        {
          agencies_id: {
            id: {
              _eq: agencyId,
            },
          },
        },
        {
          agencies_id: {
            id: {
              _null: true,
            },
          },
        },
      ],
    };
  }, [globalAgency.currentAgency?.id, isAgencyUser]);

  const examsQuery = useGetAllExamsQuery({
    variables: {
      search: examsSearchQuery,
      limit: COMBOBOX_RESULTS_AMOUNT,
      filter: {
        status: {
          _eq: DirectusStatus.PUBLISHED,
        },
        agencies: competenciesFilters,
      },
    },
    skip: !canEdit,
  });

  const modulesQuery = useGetModulesDefinitionsQuery({
    variables: {
      search: modulesSearchQuery,
      limit: COMBOBOX_RESULTS_AMOUNT,
      filter: {
        status: {
          _eq: DirectusStatus.PUBLISHED,
        },
        agencies: competenciesFilters,
      },
    },
    skip: !canEdit,
  });

  const skillsChecklistsQuery = useGetSkillChecklistsDetailsQuery({
    variables: {
      search: skillsChecklistsSearchQuery,
      limit: COMBOBOX_RESULTS_AMOUNT,
      filter: {
        status: {
          _eq: DirectusStatus.PUBLISHED,
        },
        agency: competenciesFilters,
      },
    },
    skip: !canEdit,
  });

  const policiesQuery = useGetAllPoliciesQuery({
    variables: {
      search: policiesSearchQuery,
      limit: COMBOBOX_RESULTS_AMOUNT,
      filter: {
        status: {
          _eq: DirectusStatus.PUBLISHED,
        },
        agencies: competenciesFilters,
      },
    },
    skip: !canEdit,
  });

  const documentsQuery = useGetAllDocumentsQuery({
    variables: {
      search: documentsSearchQuery,
      limit: COMBOBOX_RESULTS_AMOUNT,
      filter: {
        status: {
          _eq: DirectusStatus.PUBLISHED,
        },
        agencies: competenciesFilters,
      },
    },
    skip: !canEdit,
  });

  const bundle = bundleQuery.data?.bundles_by_id;
  // const specialities = specialitiesQuery.data?.specialties || [];
  // const departments = departmentsQuery.data?.departments || [];
  // const locations = locationsQuery.data?.locations || [];
  const exams = examsQuery.data?.exams || [];
  const modules = modulesQuery.data?.modules_definition || [];
  const skillsChecklists = skillsChecklistsQuery.data?.sc_definitions || [];
  const policies = policiesQuery.data?.policies || [];
  const documents = documentsQuery.data?.documents || [];

  const agenciesOptions = useMemo(() => {
    if (!globalAgency.agencies) return [];

    const agencies = globalAgency.agencies.map((agency) => ({
      label: agency.name,
      value: agency.id,
    }));

    return [
      {
        label: "All Agencies",
        value: "all",
      },
      ...agencies,
    ];
  }, [globalAgency.agencies]);

  const [createBundle, createBundleResult] = useCreateBundleMutation({
    refetchQueries: ["GetAllBundles"],
  });
  const [updateBundle, updateBundleResult] = useUpdateBundleMutation({
    refetchQueries: ["GetAllBundles"],
  });

  const createBundleHandler = async (values: FormValues) => {
    await createBundle({
      variables: {
        data: {
          name: values.name,
          agency: values.agency === "all" ? null : { id: values.agency },
          status: DirectusStatus.PUBLISHED,
          // speciality: values.speciality?.id,
          // departments: values.departments?.id,
          // locations: values.locations?.id,
          exams: values.exams?.map((e) => ({
            exams_id: {
              id: e.id,
            },
          })),
          modules: values.modules?.map((m) => ({
            modules_definition_id: {
              id: m.id,
            },
          })),
          skills_checklists: values.skills_checklists?.map((s) => ({
            sc_definitions_id: {
              id: s.id,
            },
          })),
          policies: values.policies?.map((p) => ({
            policies_id: {
              id: p.id,
            },
          })),
          documents: values.documents?.map((d) => ({
            documents_id: {
              id: d.id,
            },
          })),
        },
      },
    });
  };

  const updateBundleHandler = async (values: FormValues) => {
    await updateBundle({
      variables: {
        id: bundleId,
        data: {
          name: values.name,
          agency: values.agency === "all" ? null : { id: values.agency },
          exams: values.exams?.map((e) => ({
            exams_id: {
              id: e.id,
            },
          })),
          modules: values.modules?.map((m) => ({
            modules_definition_id: {
              id: m.id,
            },
          })),
          skills_checklists: values.skills_checklists?.map((s) => ({
            sc_definitions_id: {
              id: s.id,
            },
          })),
          policies: values.policies?.map((p) => ({
            policies_id: {
              id: p.id,
            },
          })),
          documents: values.documents?.map((d) => ({
            documents_id: {
              id: d.id,
            },
          })),
        },
      },
    });
  };

  const onSubmit = async (values: FormValues) => {
    if (!canEdit) return;

    try {
      if (isNew) {
        await createBundleHandler(values);
        notify(GENERIC_SUCCESS_CREATED);
        await router.push("/admin/bundles");
      } else {
        await updateBundleHandler(values);
        notify(GENERIC_SUCCESS_SAVED);
      }
    } catch (error) {
      notify({
        title: "Error",
        description: "Error creating bundle",
        type: "error",
      });
    }
  };

  useEffect(() => {
    if (bundle) {
      bundle.name && form.setValue("name", bundle.name);
      bundle.agency && form.setValue("agency", bundle.agency.id);
      bundle.exams &&
        form.setValue(
          "exams",
          bundle.exams
            .map((e) =>
              e?.exams_id?.status === DirectusStatus.PUBLISHED
                ? e?.exams_id
                : null
            )
            .filter((exam) => exam !== null)
        );

      bundle.modules &&
        form.setValue(
          "modules",
          bundle.modules
            .map((m) =>
              m?.modules_definition_id?.status === DirectusStatus.PUBLISHED
                ? m?.modules_definition_id
                : null
            )
            .filter((module) => module !== null)
        );

      bundle.skills_checklists &&
        form.setValue(
          "skills_checklists",
          bundle.skills_checklists
            .map((s) =>
              s?.sc_definitions_id?.status === DirectusStatus.PUBLISHED
                ? s?.sc_definitions_id
                : null
            )
            .filter((checklist) => checklist !== null)
        );

      bundle.policies &&
        form.setValue(
          "policies",
          bundle.policies
            .map((p) =>
              p?.policies_id?.status === DirectusStatus.PUBLISHED
                ? p?.policies_id
                : null
            )
            .filter((policy) => policy !== null)
        );

      bundle.documents &&
        form.setValue(
          "documents",
          bundle.documents
            .map((d) =>
              d?.documents_id?.status === DirectusStatus.PUBLISHED
                ? d?.documents_id
                : null
            )
            .filter((document) => document !== null)
        );
    }
  }, [bundle, form]);

  useEffect(() => {
    const agencyId = globalAgency.currentAgency?.id;

    if (!isNew) return;

    if (agencyId) {
      form.setValue("agency", agencyId);
    } else {
      form.setValue("agency", "all");
    }
  }, [form, globalAgency.currentAgency?.id, isNew]);

  return (
    <AdminLayout>
      <div className="flex flex-col gap-7">
        <h1 className="text-2xl font-medium text-blue-800">Bundles</h1>
        <div>
          <Button
            variant="link"
            label="Back to List"
            iconLeft={faArrowLeft}
            onClick={async () => await router.push("/admin/bundles")}
          />
        </div>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl leading-none text-blue-900">
            {isNew ? "New Bundle" : bundle?.name}
          </h2>
          <div className="flex items-center">
            {canEdit && (
              <Button
                label={isNew ? "Create Bundle" : "Save Changes"}
                iconLeft={faCheckCircle}
                onClick={form.handleSubmit(onSubmit)}
                disabled={createBundleResult.loading}
              />
            )}
          </div>
        </div>
        <div className="flex flex-col gap-10 rounded-lg bg-white p-9">
          <h3 className="w-full border-b pb-6 text-lg font-medium text-gray-900">
            Bundle Details
          </h3>
          <form className="flex flex-col gap-6 divide-y">
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <Input
                error={form.formState.errors.name}
                register={form.register("name")}
                label="Name"
                required
                disabled={!canEdit}
              />
              <Select
                register={form.register("agency")}
                options={agenciesOptions}
                label="Agency"
                disabled={!canEdit || isAgencyUser || isCredUser}
              />
            </div>
            {/* <div className="flex flex-col gap-2 py-4">
              <h3 className="text-sm font-medium">Tags</h3>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Combobox
                  disabled={true}
                  options={specialities}
                  control={form.control}
                  name="specialities"
                  query={specialitySearchQuery}
                  setQuery={setSpecialitySearchQuery}
                  getLabel={(val) => val?.name || ""}
                  by="id"
                  label="Specialities"
                />
                <Combobox
                  options={departments}
                  disabled={true}
                  control={form.control}
                  name="departments"
                  query={departmentsSearchQuery}
                  setQuery={setDepartmentsSearchQuery}
                  getLabel={(val) => val?.name || ""}
                  by="id"
                  label="Departments"
                />
                <Combobox
                  options={locations}
                  disabled={true}
                  control={form.control}
                  name="locations"
                  query={locationsSearchQuery}
                  setQuery={setLocationsSearchQuery}
                  getLabel={(val) => val?.name || ""}
                  by="id"
                  label="Locations"
                />
              </div>
            </div> */}
            <div className="flex flex-col gap-2 py-4">
              <h3 className="text-sm font-medium">Competencies</h3>
              <div className="flex flex-col gap-2">
                <div className="flex gap-4">
                  <Combobox
                    disabled={!canEdit}
                    options={exams}
                    control={form.control}
                    name="exams"
                    query={examsSearchQuery}
                    setQuery={setExamsSearchQuery}
                    getLabel={(c) =>
                      `${c.title} ${
                        c.agencies?.length
                          ? `- ${c.agencies
                              .map((agency) => agency?.agencies_id?.name)
                              .join("-")}`
                          : ""
                      }` || ""
                    }
                    by="id"
                    label="Exams"
                    multiple
                    displaySelectedValues
                  />
                  <Combobox
                    options={modules}
                    disabled={!canEdit}
                    control={form.control}
                    name="modules"
                    query={modulesSearchQuery}
                    setQuery={setModulesSearchQuery}
                    getLabel={(c) =>
                      `${c.title} ${
                        c.agencies?.length
                          ? `- ${c.agencies
                              .map((agency) => agency?.agencies_id?.name)
                              .join("-")}`
                          : ""
                      }` || ""
                    }
                    by="id"
                    label="Modules"
                    multiple
                    displaySelectedValues
                  />
                  <Combobox
                    options={skillsChecklists}
                    disabled={!canEdit}
                    control={form.control}
                    name="skills_checklists"
                    query={skillsChecklistsSearchQuery}
                    setQuery={setSkillsChecklistsSearchQuery}
                    getLabel={(c) =>
                      `${c.title} ${
                        c.agency?.length
                          ? `- ${c.agency
                              .map((agency) => agency?.agencies_id?.name)
                              .join("-")}`
                          : ""
                      }` || ""
                    }
                    by="id"
                    label="Skills Checklists"
                    multiple
                    displaySelectedValues
                  />
                </div>
                <div className="flex gap-4">
                  <Combobox
                    disabled={!canEdit}
                    options={policies}
                    control={form.control}
                    name="policies"
                    query={policiesSearchQuery}
                    setQuery={setPoliciesSearchQuery}
                    getLabel={(c) =>
                      `${c.name} ${
                        c.agencies?.length
                          ? `- ${c.agencies
                              .map((agency) => agency?.agencies_id?.name)
                              .join("-")}`
                          : ""
                      }` || ""
                    }
                    by="id"
                    label="Policies"
                    multiple
                    displaySelectedValues
                  />
                  <Combobox
                    options={documents}
                    disabled={!canEdit}
                    control={form.control}
                    name="documents"
                    query={documentsSearchQuery}
                    setQuery={setDocumentsSearchQuery}
                    getLabel={(c) =>
                      `${c.title} ${
                        c.agencies?.length
                          ? `- ${c.agencies
                              .map((agency) => agency?.agencies_id?.name)
                              .join("-")}`
                          : ""
                      }` || ""
                    }
                    by="id"
                    label="Documents"
                    multiple
                    displaySelectedValues
                  />
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}

export default withAuth(Bundle, AdminGroup);
