import { useRouter } from "next/router";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { useEffect } from "react";
import {
  useGetSkillChecklistDetailQuery,
  useUpdateSkillChecklistMutation,
} from "api";
import { UserRole } from "../../types/roles";
import { useAuth } from "../useAuth";
import { SkillChecklistQuestionDefaultValue } from "../../types/global";
import { GENERIC_SUCCESS_SAVED, notify } from "../../components/Notification";
import { DirectusStatus } from "types";
import { useFeatureFlags } from "../useFeatureFlags";

const createSchema = (newFormatEnabled: boolean) => {
  const itemSchema = newFormatEnabled
    ? z.object({
        title: z.string().trim().nonempty("Skill title is required"),
        proficiency: z.number().nullable(),
      })
    : z.object({
        title: z.string().trim().nonempty("Skill title is required"),
        skill: z.number().nullable(),
        frequency: z.number().nullable(),
      });

  return z.object({
    questions: z
      .array(
        z.object({
          question: z.string().trim().nonempty("Question is required"),
          sections: z
            .array(
              z.object({
                title: z.string().trim().nonempty("Section title is required"),
                excludeFromScore: z.boolean().optional(),
                items: z
                  .array(itemSchema)
                  .min(1, "Must have at least one item"),
              })
            )
            .min(1, "Must have at least one section"),
        })
      )
      .min(1, "Must have at least one question"),
  });
};

export type SCQuestionsFormType = z.infer<ReturnType<typeof createSchema>>;

export function useSkillChecklistQuestions() {
  const router = useRouter();
  const { currentUser } = useAuth();

  const { flags } = useFeatureFlags();

  const { skill_check_id } = router.query;
  const checkListId = skill_check_id as string;
  const canEdit = currentUser?.role === UserRole.HSHAdmin;
  const isNew = skill_check_id === "new";

  const skillChecklistDetailQuery = useGetSkillChecklistDetailQuery({
    variables: {
      checklistId: checkListId,
    },
  });

  const definition = skillChecklistDetailQuery.data?.sc_definitions_by_id;
  const lastVersion = definition?.last_version;

  const isScNewFormatEnabled = lastVersion?.is_new_format ?? false;

  const isFeatureFlagEnabledSc = flags["is_skill_checklist_new_format_enabled"];
  const newFormatEnabled = isFeatureFlagEnabledSc && isScNewFormatEnabled;
  const schema = createSchema(newFormatEnabled);

  const form = useForm<SCQuestionsFormType>({
    resolver: zodResolver(schema),
  });

  const questions = useFieldArray({
    control: form.control,
    name: "questions",
  });

  const [updateSkillChecklist, updateSkillChecklistResult] =
    useUpdateSkillChecklistMutation();

  const addQuestion = () => {
    if (!canEdit) return;

    if (newFormatEnabled) {
      questions.append({
        question: SkillChecklistQuestionDefaultValue,
        sections: [
          {
            title: "",
            excludeFromScore: false,
            items: [],
          },
        ],
      });
      return;
    }

    questions.append({
      question: SkillChecklistQuestionDefaultValue,
      sections: [
        {
          title: "",
          items: [],
        },
      ],
    });
  };

  const removeQuestion = (index: number) => {
    if (!canEdit) return;

    questions.remove(index);
  };

  const onSubmit = async (data: SCQuestionsFormType) => {
    if (!canEdit) return;

    const preparedData = newFormatEnabled
      ? {
          ...data,
          questions: data.questions.map((q) => ({
            ...q,
            sections: q.sections.map((s) => ({
              ...s,
              items: s.items.map((item) => {
                const { frequency, ...rest } = item as any;
                return rest;
              }),
            })),
          })),
        }
      : data;

    await updateSkillChecklist({
      variables: {
        id: checkListId,
        data: {
          last_version: {
            id:
              definition?.status === DirectusStatus.PUBLISHED
                ? undefined
                : lastVersion?.id,
            questions: preparedData.questions,
            total_questions: preparedData.questions.length,
            definition: {
              id: checkListId,
            },
            agreements: lastVersion?.agreements,
            version_number: lastVersion?.version_number,
            instructions: lastVersion?.instructions,
            description: lastVersion?.description,
            is_new_format: newFormatEnabled,
          },
        },
      },
    });

    notify(GENERIC_SUCCESS_SAVED);
  };

  useEffect(() => {
    if (!lastVersion) return;

    const rawQuestions = lastVersion.questions as any[];

    if (newFormatEnabled && rawQuestions) {
      const transformedQuestions = rawQuestions.map((q) => ({
        ...q,
        sections: q.sections.map((s: any) => ({
          ...s,
          items: s.items.map((item: any) => {
            const { skill, frequency, ...rest } = item;
            return {
              ...rest,
              proficiency: item.proficiency ?? null,
            };
          }),
        })),
      }));

      form.reset({ questions: transformedQuestions });
    } else {
      const transformedQuestions = rawQuestions?.map((q) => ({
        ...q,
        sections: q.sections.map((s: any) => ({
          ...s,
          items: s.items.map((item: any) => {
            const { proficiency, ...rest } = item;
            return {
              ...rest,
              skill: item.skill ?? null,
              frequency: item.frequency ?? null,
            };
          }),
        })),
      })) ?? [
        {
          question: SkillChecklistQuestionDefaultValue,
          sections: [
            {
              title: "",
              items: [],
            },
          ],
        },
      ];

      form.reset({ questions: transformedQuestions });
    }
  }, [form, lastVersion, newFormatEnabled]);

  return {
    isNew,
    canEdit,
    definition,
    form,
    questions,
    addQuestion,
    removeQuestion,
    onSubmit,
    isLoading: skillChecklistDetailQuery.loading,
    isSaving: updateSkillChecklistResult.loading,
    newFormatEnabled,
  };
}
