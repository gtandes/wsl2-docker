import { useRouter } from "next/router";
import { useReducer, useCallback, useEffect, FormEventHandler } from "react";
import { useApolloClient } from "@apollo/client";
import {
  useGetSkillChecklistAssignmentQuery,
  useGetSkillChecklistDetailQuery,
  useSetSkillChecklistAssignmentQuestionsMutation,
} from "api";
import { CompetencyState, ExpirationType, controlExpiration } from "types";
import { SkillChecklistsQuestion } from "../../types/global";
import { useFeatureFlags } from "../useFeatureFlags";
import { useModal } from "../useModal";
import { notify } from "../../components/Notification";
import { cloneDeep } from "lodash";

const MAX_RETRIES = 5;
const RETRY_DELAY = 1000;

interface State {
  question?: SkillChecklistsQuestion;
  hasNull: boolean;
}

type Action =
  | { type: "SET_QUESTION"; payload?: SkillChecklistsQuestion }
  | { type: "SET_HAS_NULL"; payload: boolean };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_QUESTION":
      return { ...state, question: action.payload };
    case "SET_HAS_NULL":
      return { ...state, hasNull: action.payload };
    default:
      return state;
  }
}

export function useSkillChecklistStep() {
  const router = useRouter();
  const { flags } = useFeatureFlags();
  const isFlagNewFormatEnable = flags["is_skill_checklist_new_format_enabled"];
  const scId = router.query.sc_id as string;
  const step = Number(router.query.step);
  const isPreview = router.query.preview === "true";
  const apolloClient = useApolloClient();
  const modal = useModal();

  const [state, dispatch] = useReducer(reducer, {
    question: undefined,
    hasNull: false,
  });

  const {
    data: assignmentQuery,
    loading: assignmentQueryLoading,
    error: assignmentQueryError,
    refetch: refetchAssignmentQuery,
  } = useGetSkillChecklistAssignmentQuery({
    variables: { assignmentId: scId },
    skip: isPreview,
    notifyOnNetworkStatusChange: true,
  });

  const retryFetch = useCallback(
    async (attempt = 1) => {
      if (attempt <= MAX_RETRIES) {
        await new Promise((resolve) =>
          setTimeout(resolve, attempt * RETRY_DELAY)
        );
        try {
          await refetchAssignmentQuery();
        } catch {
          retryFetch(attempt + 1);
        }
      } else {
        notify({
          type: "error",
          title: "Connection Error",
          description:
            "Failed to fetch data after multiple attempts. Please check your connection and try again.",
        });
      }
    },
    [refetchAssignmentQuery]
  );

  useEffect(() => {
    if (assignmentQueryError) retryFetch();
  }, [assignmentQueryError, retryFetch]);

  const { data: scQueryData, loading: scQueryLoading } =
    useGetSkillChecklistDetailQuery({
      variables: { checklistId: scId },
    });

  const [setQuestionMutation, mutationResult] =
    useSetSkillChecklistAssignmentQuestionsMutation({
      refetchQueries: [
        "getSkillChecklistAssignment",
        "getSkillChecklistDetail",
      ],
    });

  const definitionData = isPreview
    ? scQueryData?.sc_definitions_by_id
    : assignmentQuery?.junction_sc_definitions_directus_users_by_id
        ?.sc_definitions_id;

  const questions = (
    isPreview
      ? definitionData?.last_version?.questions
      : assignmentQuery?.junction_sc_definitions_directus_users_by_id?.questions
  ) as SkillChecklistsQuestion[];

  const isEnableData = isPreview
    ? !!scQueryData?.sc_definitions_by_id?.last_version?.is_new_format
    : !!assignmentQuery?.junction_sc_definitions_directus_users_by_id
        ?.skillchecklist_version?.is_new_format;

  const isEnableNewFormat = isEnableData && isFlagNewFormatEnable;

  const totalPages = isPreview
    ? Number(definitionData?.last_version?.total_questions) + 1
    : Number(
        assignmentQuery?.junction_sc_definitions_directus_users_by_id
          ?.skillchecklist_version?.total_questions
      ) + 1;

  const currentPage = step + 1;

  useEffect(() => {
    const currentQuestion = questions?.at(step - 1);
    dispatch({ type: "SET_QUESTION", payload: currentQuestion });
  }, [questions, step]);

  const handleNextPage: FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (!state.question) return;

    dispatch({ type: "SET_HAS_NULL", payload: false });

    const lastPage = currentPage === totalPages;

    if (isPreview) {
      const nextPath = lastPage
        ? `/admin/skills-checklists/${scId}`
        : `/clinician/skills-checklists/${scId}/${step + 1}?preview=true`;
      return router.push(nextPath);
    }

    if (lastPage) {
      const confirmed = await modal.showConfirm(
        "Confirm you want to submit this checklist."
      );
      if (!confirmed) return;
    }

    const hasMissingFields = state.question.sections.some((section) =>
      section.items.some((item) => {
        if (isEnableNewFormat) {
          return item.proficiency == null;
        }

        return item.skill == null || item.frequency == null;
      })
    );

    dispatch({ type: "SET_HAS_NULL", payload: hasMissingFields });
    if (hasMissingFields) {
      notify({
        type: "error",
        title: "Missing Required Data",
        description:
          "Some required fields are missing. Please reload the page to refresh the data.",
      });
      return;
    }

    const newQuestions: SkillChecklistsQuestion[] = cloneDeep(questions);

    if (isEnableNewFormat) {
      const currentQuestionIndex = step - 1;
      if (newQuestions[currentQuestionIndex]) {
        newQuestions[currentQuestionIndex] = state.question;
      }
    } else {
      newQuestions[step - 1] = state.question;
    }

    const retryMutation = async (attempt = 1): Promise<any> => {
      try {
        return await setQuestionMutation({
          variables: {
            assignmentId: scId,
            questions: newQuestions,
            finished_on: lastPage ? new Date() : null,
            expires_on: lastPage
              ? controlExpiration(
                  assignmentQuery?.junction_sc_definitions_directus_users_by_id
                    ?.expiration_type as ExpirationType,
                  new Date()
                )
              : null,
            status: lastPage
              ? CompetencyState.COMPLETED
              : CompetencyState.PENDING,
          },
        });
      } catch (error) {
        if (attempt < MAX_RETRIES) {
          await new Promise((resolve) =>
            setTimeout(resolve, RETRY_DELAY * Math.pow(2, attempt - 1))
          );
          return retryMutation(attempt + 1);
        } else {
          notify({
            type: "error",
            title: "Save Failed",
            description:
              "Failed to save your answers after multiple attempts. Please try again.",
          });
        }
      }
    };

    await retryMutation();
    if (lastPage) {
      apolloClient.refetchQueries({
        include: [
          "GetClinicianDashboardCompetencies",
          "GetDashboardCertificates",
          "GetClinicianDashboardItems",
          "GetClinicianDashboardAnalytics",
        ],
      });
      await router.push(`/clinician/skills-checklists/${scId}/review`);
    } else {
      await router.push(`/clinician/skills-checklists/${scId}/${step + 1}`);
    }
  };

  const handlePrevious = () => {
    const preview = isPreview ? "?preview=true" : "";

    if (step === 1) {
      router.push(`/clinician/skills-checklists/${scId}${preview}`);
    } else {
      router.push(`/clinician/skills-checklists/${scId}/${step - 1}${preview}`);
    }
  };

  const loading = assignmentQueryLoading || scQueryLoading;

  return {
    state,
    dispatch,
    loading,
    currentPage,
    totalPages,
    definitionData,
    mutationResult,
    handleNextPage,
    handlePrevious,
    isPreview,
    isEnableNewFormat,
  };
}
