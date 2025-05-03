import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import z from "zod";
import { startCase } from "lodash";
import {
  useCreateSkillChecklistMutation,
  useCreateSkillChecklistVersionMutation,
  useGetAllCategoriesQuery,
  useGetSkillChecklistDetailQuery,
  useUpdateSkillChecklistMutation,
  useUpdateSkillChecklistVersionMutation,
} from "api";
import { useAuth } from "../useAuth";
import { useAgency } from "../useAgency";

import {
  GENERIC_SUCCESS_CREATED,
  GENERIC_SUCCESS_SAVED,
  notify,
} from "../../components/Notification";
import { DirectusStatus, ExpirationType } from "types";
import { UserRole } from "../../types/roles";
import { COMBOBOX_RESULTS_AMOUNT } from "../../types/global";
import { useFeatureFlags } from "../useFeatureFlags";

const validationSchema = z.object({
  title: z
    .string()
    .trim()
    .nonempty({ message: "Required" })
    .max(255, { message: "Max 255 characters" }),
  agency: z.string().optional(),
  status: z.nativeEnum(DirectusStatus).optional(),
  instructions: z.string().optional(),
  agreements: z.string().optional(),
  description: z.string().optional(),
  expiration: z.string(),
  category: z.object(
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
  sub_speciality: z
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
  is_new_format: z.boolean().optional(),
});

export type SkillChecklistFormValues = z.infer<typeof validationSchema>;

const refetchQueries = [
  "getTableSkillsChecklists",
  "getTableSkillsChecklistsTotalPages",
];

export function useSkillChecklist() {
  const router = useRouter();
  const { flags } = useFeatureFlags();

  const isNewFormatEnabled = flags["is_skill_checklist_new_format_enabled"];
  const { currentUser } = useAuth();
  const globalAgency = useAgency();
  const scId = router.query.skill_check_id as string;
  const isNew = scId === "new";
  const canEdit = currentUser?.role === UserRole.HSHAdmin;

  const [loading, setLoading] = useState(false);
  const [modalitySearchQuery, setModalitySearchQuery] = useState("");
  const [specialtySearchQuery, setSpecialtySearchQuery] = useState("");
  const [subSpecialtySearchQuery, setSubSpecialtySearchQuery] = useState("");

  const instructionsDefaultCopy =
    "Skills checklists are important documents that legally outline your expertise and the frequency of your skills across various specialties. ";

  const agreementsDefaultCopy =
    "Your honesty is crucial in ensuring we adhere to legal standards. Thank you!";

  const form = useForm<SkillChecklistFormValues>({
    resolver: zodResolver(validationSchema),
  });

  const skillChecklistDetailQuery = useGetSkillChecklistDetailQuery({
    variables: {
      checklistId: scId,
    },
    skip: isNew,
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

  const [createSkillChecklistMutation] = useCreateSkillChecklistMutation({
    refetchQueries,
  });

  const [updateSkillChecklistMutation] = useUpdateSkillChecklistMutation({
    refetchQueries: ["getSkillChecklistDetail", ...refetchQueries],
  });

  const [createSkillChecklistVersionMutation] =
    useCreateSkillChecklistVersionMutation();
  const [updateSkillChecklistVersionMutation] =
    useUpdateSkillChecklistVersionMutation();

  const agenciesOptions = !globalAgency.agencies
    ? []
    : [
        {
          label: "All Agencies",
          value: "all",
        },
        ...globalAgency.agencies.map((agency) => ({
          label: agency.name,
          value: agency.id,
        })),
      ];

  const expirationOptions = Object.values(ExpirationType).map((e) => ({
    label: startCase(e),
    value: e,
  }));

  const scDefinition = skillChecklistDetailQuery?.data?.sc_definitions_by_id;
  const modalities = modalitiesQuery.data?.categories || [];
  const specialties = specialtiesQuery.data?.categories || [];
  const subSpecialties = subSpecialtiesQuery.data?.categories || [];

  const statusOptions = [
    {
      label: "Draft",
      value: DirectusStatus.DRAFT,
    },
    {
      label: "Published",
      value: DirectusStatus.PUBLISHED,
    },
  ];

  useEffect(() => {
    if (scDefinition) {
      scDefinition.title && form.setValue("title", scDefinition.title);
      scDefinition.category && form.setValue("category", scDefinition.category);
      scDefinition.speciality &&
        form.setValue("specialty", scDefinition.speciality);
      scDefinition.sub_speciality &&
        form.setValue("sub_speciality", scDefinition.sub_speciality);
      scDefinition.status &&
        form.setValue("status", scDefinition.status as DirectusStatus);
      scDefinition.last_version?.instructions &&
        form.setValue("instructions", scDefinition.last_version?.instructions);
      scDefinition.last_version?.agreements &&
        form.setValue("agreements", scDefinition.last_version?.agreements);
      scDefinition.last_version?.description &&
        form.setValue("description", scDefinition.last_version?.description);
      scDefinition.last_version?.expiration &&
        form.setValue("expiration", scDefinition.last_version?.expiration);
      scDefinition.agency?.at(0)?.agencies_id?.id
        ? form.setValue("agency", scDefinition.agency?.at(0)?.agencies_id?.id)
        : form.setValue("agency", "all");
      scDefinition.last_version?.is_new_format &&
        form.setValue(
          "is_new_format",
          scDefinition.last_version?.is_new_format
        );
    } else {
      form.setValue("instructions", instructionsDefaultCopy);
      form.setValue("agreements", agreementsDefaultCopy);
    }
  }, [form, scDefinition]);

  const createSkillChecklist = async (formData: SkillChecklistFormValues) => {
    const checklistDefinitionCreationResult =
      await createSkillChecklistMutation({
        variables: {
          data: {
            title: formData.title,
            category: {
              id: formData.category.id,
            },
            ...(formData.specialty && {
              speciality: { id: formData.specialty.id },
            }),
            ...(formData.sub_speciality && {
              sub_speciality: { id: formData.sub_speciality.id },
            }),
            status: formData.status,
            versions: [
              {
                agreements: formData.agreements,
                instructions: formData.instructions,
                total_questions: 0,
                description: formData.description,
                expiration: formData.expiration,
                is_new_format: formData.is_new_format,
              },
            ],
            agency:
              formData.agency !== "all"
                ? [
                    {
                      agencies_id: {
                        id: formData.agency,
                      },
                    },
                  ]
                : undefined,
          },
        },
      });

    const definition =
      checklistDefinitionCreationResult.data?.create_sc_definitions_item;
    const lastVersion = definition?.versions?.[0];

    if (!definition) throw new Error("Missing SC definition");
    if (!lastVersion?.id) throw new Error("Missing SC versions");

    await updateSkillChecklistMutation({
      variables: {
        id: definition.id,
        data: {
          last_version: {
            id: lastVersion.id,
          },
        },
      },
    });

    router.push(`/admin/skills-checklists/${definition.id}/questions`);
    notify(GENERIC_SUCCESS_CREATED);
  };

  const updateSkillChecklist = async (formData: SkillChecklistFormValues) => {
    const definition = skillChecklistDetailQuery.data?.sc_definitions_by_id;
    const currentVersion = definition?.last_version;
    let lastVersionId = currentVersion?.id;

    if (!currentVersion) throw new Error("Missing current version");

    const requireNewVersion =
      (formData.instructions !== currentVersion.instructions ||
        formData.expiration !== currentVersion.expiration ||
        formData.agreements !== currentVersion.agreements ||
        formData.description !== currentVersion.description ||
        formData.is_new_format !== currentVersion.is_new_format) &&
      definition.status === DirectusStatus.PUBLISHED;

    if (requireNewVersion) {
      const newVersion = await createSkillChecklistVersionMutation({
        variables: {
          data: {
            definition: {
              id: scId,
              title: formData.title,
            },
            agreements: formData.agreements,
            instructions: formData.instructions,
            total_questions: currentVersion.total_questions,
            description: formData.description,
            questions: currentVersion.questions,
            expiration: formData.expiration,
            is_new_format: formData.is_new_format,
          },
        },
      });

      lastVersionId = newVersion.data?.create_sc_versions_item?.id;
    } else {
      await updateSkillChecklistVersionMutation({
        variables: {
          id: currentVersion.id,
          data: {
            agreements: formData.agreements,
            instructions: formData.instructions,
            expiration: formData.expiration,
            description: formData.description,
            is_new_format: formData.is_new_format,
          },
        },
      });
    }

    if (!lastVersionId) throw new Error("Missing new version id");

    await updateSkillChecklistMutation({
      variables: {
        id: scId,
        data: {
          title: formData.title,
          agency:
            formData.agency !== "all"
              ? [
                  {
                    agencies_id: {
                      id: formData.agency,
                    },
                  },
                ]
              : [],
          last_version: {
            id: lastVersionId,
          },
          status:
            definition.status === DirectusStatus.PUBLISHED
              ? DirectusStatus.PUBLISHED
              : formData.status,
          category: {
            id: formData.category.id,
          },
          speciality: formData.specialty?.id
            ? { id: formData.specialty.id }
            : null,
          sub_speciality: formData.sub_speciality?.id
            ? { id: formData.sub_speciality.id }
            : null,
        },
      },
    });

    notify(GENERIC_SUCCESS_SAVED);
  };

  const onSubmit = async (formData: SkillChecklistFormValues) => {
    if (!canEdit) return;

    setLoading(true);
    try {
      if (isNew) {
        await createSkillChecklist(formData);
      } else {
        await updateSkillChecklist(formData);
        skillChecklistDetailQuery.refetch();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return {
    isNew,
    loading,
    canEdit,
    form,
    onSubmit,
    skillChecklistDetailQuery,
    modalitiesQuery,
    specialtiesQuery,
    subSpecialtiesQuery,
    scDefinition,
    modalities,
    specialties,
    subSpecialties,
    agenciesOptions,
    statusOptions,
    expirationOptions,
    modalitySearchQuery,
    specialtySearchQuery,
    subSpecialtySearchQuery,
    setModalitySearchQuery,
    setSpecialtySearchQuery,
    setSubSpecialtySearchQuery,
    isNewFormatEnabled,
  };
}
