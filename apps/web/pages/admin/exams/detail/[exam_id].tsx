import React, { useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { AdminLayout } from "../../../../components/AdminLayout";
import { useRouter } from "next/router";
import { faArrowLeftLong } from "@fortawesome/pro-solid-svg-icons";
import {
  faCircleCheck,
  faCirclePlus,
  faCircleQuestion,
  faTrash,
} from "@fortawesome/pro-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Button from "../../../../components/Button";
import AdminPanel from "../../../../components/AdminPanel";
import { Input } from "../../../../components/Input";
import { FieldError, useForm } from "react-hook-form";
import z from "zod";
import { withAuth } from "../../../../hooks/withAuth";
import { AdminGroup, UserRole } from "../../../../types/roles";
import { zodResolver } from "@hookform/resolvers/zod";
import { Textarea } from "../../../../components/Textarea";
import {
  AllQuestionsForListFragment,
  Categories,
  useCreateExamMutation,
  useCreateExamVersionMutation,
  useGetAllAgenciesQuery,
  useGetAllCategoriesQuery,
  useGetAllQuestionsLazyQuery,
  useGetExamForCrudQuery,
  useUpdateExamMutation,
} from "api/generated/graphql";
import {
  GENERIC_FILE_UPLOAD_ERROR,
  NotificationProps,
  notify,
} from "../../../../components/Notification";
import Select from "../../../../components/Select";
import { useModal } from "../../../../hooks/useModal";
import { QuestionModal } from "../../../../components/exams/QuestionModal";
import { Reorder } from "framer-motion";
import { QuestionsList } from "../../../../components/exams/QuestionsList";
import { Toggle } from "../../../../components/Toggle";
import QuestionCard from "../../../../components/exams/QuestionCard";
import clsx from "clsx";
import { useAuth } from "../../../../hooks/useAuth";
import { Combobox } from "../../../../components/Combobox";
import { useDebounce } from "usehooks-ts";
import { fileValidation } from "../../../../utils/validations";
import { useAgency } from "../../../../hooks/useAgency";
import { DirectusStatus, ExpirationType } from "types";
import { startCase } from "lodash";
import { createFile, getContentExpirationDate } from "../../../../utils/utils";
import { formatDateForInput } from "../../../../utils/format";
import { COMBOBOX_RESULTS_AMOUNT } from "../../../../types/global";

const DefaultRefetch = ["getAllExams", "getExamForCrud"];
const validationSchema = z.object({
  title: z.string().min(1, { message: "Required" }),
  status: z.string().min(1, { message: "Required" }),
  modality: z.string().min(1, { message: "Required" }),
  specialties: z.any(),
  subspecialties: z.any(),
  expiration: z.string().min(1, { message: "Required" }),
  passing_score: z.coerce.number().min(1).max(100),
  allowed_attempts: z.coerce.number().min(1).max(100),
  questions_to_give: z.coerce.number().min(1).max(200),
  contact_hour: z.string(),
  description: z.string(),
  passing_message: z.string(),
  fail_message: z.string(),
  shuffle_questions: z.boolean(),
  is_proctoring: z.boolean().optional(),
  questions: z.array(z.string()).optional(),
  agency: z.string().optional(),
  outline: fileValidation(false),
  outlineId: z.string().optional(),
  expiration_date: z.string(),
});

type FormData = z.infer<typeof validationSchema>;

const EXAM_SUCCESS_SAVED: NotificationProps = {
  type: "success",
  title: <>Exam saved!</>,
};

function ExamDetail() {
  const router = useRouter();
  const { exam_id: exam_id_param } = router.query;
  const isNew = exam_id_param === "new";
  const modal = useModal();
  const [questionIds, setQuestionIds] = useState<string[]>([]);
  const [firstLoad, setFirstLoad] = useState<boolean>(true);
  const auth = useAuth();
  const { currentAgency, loaded: currentAgencyLoaded } = useAgency();
  const [saving, setSaving] = useState(false);
  const isAdmin =
    auth.currentUser?.role === UserRole.HSHAdmin ||
    auth.currentUser?.role === UserRole.Developer;

  const { data: examData, loading } = useGetExamForCrudQuery({
    variables: { id: exam_id_param as string },
    skip: isNew,
  });
  const currentVersion = examData?.exams_by_id?.exam_versions?.at(0);

  const [createExam] = useCreateExamMutation({
    refetchQueries: DefaultRefetch,
  });
  const [updateExam] = useUpdateExamMutation({
    refetchQueries: DefaultRefetch,
  });
  const [createExamVersion] = useCreateExamVersionMutation({
    refetchQueries: DefaultRefetch,
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
      limit: -1,
    },
  });

  const [specialtySearchQuery, setSpecialtySearchQuery] = useState("");
  const debouncedSpecialtyQuery = useDebounce(specialtySearchQuery, 400);
  const specialtiesQuery = useGetAllCategoriesQuery({
    variables: {
      search: debouncedSpecialtyQuery,
      filter: {
        type: {
          _eq: "speciality",
        },
        status: {
          _eq: DirectusStatus.PUBLISHED,
        },
      },
      limit: COMBOBOX_RESULTS_AMOUNT,
    },
  });

  const [subspecialtySearchQuery, setSubspecialtySearchQuery] = useState("");
  const debouncedSubspecialtyQuery = useDebounce(subspecialtySearchQuery, 400);
  const subspecialtiesQuery = useGetAllCategoriesQuery({
    variables: {
      search: debouncedSubspecialtyQuery,
      filter: {
        type: {
          _eq: "sub_speciality",
        },
        status: {
          _eq: DirectusStatus.PUBLISHED,
        },
      },
      limit: COMBOBOX_RESULTS_AMOUNT,
    },
  });

  const [questionsQuery, { data: questions, loading: questionsLoading }] =
    useGetAllQuestionsLazyQuery({
      variables: {
        limit: 500,
      },
    });

  const fetchQuestions = (ids: string[]) => {
    if (ids.length) {
      questionsQuery({
        variables: {
          filter: {
            id: { _in: ids },
          },
        },
      });
    }
  };

  const questionsOrdered = useMemo<
    AllQuestionsForListFragment[] | undefined
  >(() => {
    return (
      questions &&
      questionIds.map((id) => {
        return questions.questions.find(
          (question) => question.id === id
        ) as AllQuestionsForListFragment;
      })
    );
  }, [questions, questionIds]);

  const agenciesQuery = useGetAllAgenciesQuery({
    variables: {
      filter: { status: { _eq: DirectusStatus.PUBLISHED } },
      sort: ["name"],
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      shuffle_questions: true,
      is_proctoring: false,
    },
  });

  useEffect(() => {
    if (!loading) {
      if (currentAgencyLoaded && isNew) {
        reset({
          agency: currentAgency?.id,
          allowed_attempts: currentAgency?.custom_allowed_attempts_exams,
        });

        reset({
          expiration_date: formatDateForInput(getContentExpirationDate()),
        });
      }

      if (examData?.exams_by_id?.id) {
        const version = examData.exams_by_id.exam_versions?.at(0);
        const questionIds = version?.questions?.map(
          (item) => item?.questions_id?.id
        );

        reset({
          title: version?.title as string,
          status: examData?.exams_by_id?.status as string,
          passing_score: version?.passing_score as number,
          modality: examData.exams_by_id?.modality?.id as string,
          specialties: examData?.exams_by_id?.specialties?.map(
            (sp) => sp?.categories_id
          ),
          subspecialties: examData?.exams_by_id?.subspecialties?.map(
            (sp) => sp?.categories_id
          ),
          allowed_attempts: version?.allowed_attempts as number,
          questions_to_give: version?.questions_to_give as number,
          description: version?.description as string,
          contact_hour: version?.contact_hour as string,
          passing_message: version?.passing_message as string,
          fail_message: version?.fail_message as string,
          shuffle_questions: version?.shuffle_questions as boolean,
          is_proctoring: version?.is_proctoring as boolean,
          expiration: version?.expiration as string,
          questions: questionIds as string[],
          agency: examData?.exams_by_id?.agencies?.at(0)?.agencies_id?.id,
          outlineId: version?.outline?.id,
          expiration_date: formatDateForInput(
            examData.exams_by_id.expiration_date
          ),
        });
        if (firstLoad) {
          setQuestionIds(questionIds as string[]);
          if (questionIds?.length) {
            fetchQuestions(questionIds as string[]);
          }
        }
      } else if (!isNew) {
        notify({
          type: "error",
          title: "Exam Record Not Found",
          description:
            "The requested exam record could not be located. Please verify the exam ID and try again.",
        });
        router.push("/admin/exams").then();
      }
      setFirstLoad(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    loading,
    examData,
    reset,
    isNew,
    router,
    currentAgency,
    currentAgencyLoaded,
  ]);

  const onSubmit = handleSubmit(async (data) => {
    if (!questionIds.length) {
      return;
    }

    if (questions && questions.questions.length < data.questions_to_give) {
      notify({
        type: "error",
        title:
          "The question pool does not have enough questions available to provide.",
      });
      return;
    }

    setSaving(true);

    const agency = agenciesQuery.data?.agencies.find(
      (agency) => agency.id === data.agency
    );

    const modality = modalitiesQuery.data?.categories.find(
      (c) => c.id === data.modality
    );

    let outlineFileId;
    const outlineFile = data.outline && data.outline[0];

    if (outlineFile) {
      outlineFileId = uuidv4();
      const form = new FormData();
      form.append("id", outlineFileId);
      form.append("folder", "917dc844-d980-484e-8e75-3deabe921fb2"); // Exams -> Outlines folder
      form.append("file", outlineFile);

      try {
        await createFile(form);
      } catch (e) {
        setSaving(false);
        notify(GENERIC_FILE_UPLOAD_ERROR);
        return;
      }
    }

    const examId = isNew ? uuidv4() : exam_id_param;
    const examPayload = {
      id: examId as string,
      status: data.status,
      modality: {
        id: modality?.id,
      },
      agencies: agency
        ? [
            {
              exams_id: {
                id: examId as string,
              },
              agencies_id: { id: agency?.id },
            },
          ]
        : [],
      specialties: data.specialties
        ? data.specialties.map((sp: any) => ({
            exams_id: {
              id: examId as string,
            },
            categories_id: { id: sp.id },
          }))
        : [],
      subspecialties: data.specialties
        ? data.subspecialties.map((sp: any) => ({
            exams_id: {
              id: examId as string,
            },
            categories_id: { id: sp.id },
          }))
        : [],
      title: data.title,
      expiration_date: getContentExpirationDate(),
    };

    const examVersionId = uuidv4();
    const outline = outlineFile
      ? {
          id: outlineFileId,
          title: `${examVersionId}-outline.pdf`,
          filename_download: `${examVersionId}-outline.pdf`,
          storage: "local",
        }
      : data.outlineId
      ? {
          id: currentVersion?.outline?.id as string,
          title: currentVersion?.outline?.title as string,
          filename_download: currentVersion?.outline
            ?.filename_download as string,
          storage: currentVersion?.outline?.storage as string,
        }
      : undefined;

    const examVersionPayload = {
      id: examVersionId,
      title: data.title,
      allowed_attempts: data.allowed_attempts,
      passing_score: data.passing_score,
      questions_to_give: data.questions_to_give,
      contact_hour: data.contact_hour,
      description: data.description,
      passing_message: data.passing_message,
      fail_message: data.fail_message,
      shuffle_questions: data.shuffle_questions,
      expiration: data.expiration,
      is_proctoring: data.is_proctoring,
      outline,
      questions: questionIds.length
        ? questionIds.map((id, index) => ({
            exam_versions_id: { id: examVersionId },
            questions_id: { id },
            sort: index,
          }))
        : undefined,
    };

    try {
      if (isNew) {
        // Create exam with version
        await createExam({
          variables: {
            data: {
              ...examPayload,
              exam_versions: [examVersionPayload],
            },
          },
          onCompleted: () => {
            notify(EXAM_SUCCESS_SAVED);
            router.push(`/admin/exams/detail/${examId}`);
          },
        });
      } else {
        // Update exam
        await updateExam({
          variables: {
            id: examId as string,
            data: examPayload,
          },
        });

        // Create new version
        await createExamVersion({
          variables: {
            data: {
              ...examVersionPayload,
              exam: {
                id: examId as string,
                expiration_date: getContentExpirationDate(),
              },
            },
          },
          onCompleted: () => {
            notify(EXAM_SUCCESS_SAVED);
          },
        });
      }
    } catch (e) {
      notify({
        type: "error",
        title: (
          <>
            Upload failed due to a system error. Please try again. Refreshing
            the page may cause unsaved data to be lost. If the issue persists,
            save your entries separately and contact support.
          </>
        ),
      });
    } finally {
      setSaving(false);
    }
  });

  const agencyOptions = agenciesQuery.data
    ? [
        {
          label: "All agencies",
          value: undefined,
          selected: !watch("agency"),
        },
        ...agenciesQuery.data?.agencies.map((item) => ({
          label: item.name!,
          value: item.id,
          selected: item.id === watch("agency"),
        })),
      ]
    : [];

  const onClearOutline = async () => {
    const result = await modal.showConfirm(
      `Are you sure you want to remove the outline?`
    );

    if (result) {
      setValue("outline", undefined);
      setValue("outlineId", undefined);
    }
  };

  const outlineId = watch("outlineId");

  let statusOptions = [
    {
      label: "Draft",
      value: DirectusStatus.DRAFT,
    },
    {
      label: "Published",
      value: DirectusStatus.PUBLISHED,
    },
  ];

  if (!isNew) {
    statusOptions.push({
      label: "Archived",
      value: DirectusStatus.ARCHIVED,
    });
  }

  const handleBackButton = async () => {
    if (isDirty) {
      const leave = await modal.showConfirm(
        `You have unsaved changes. Do you want to continue?`
      );

      if (leave) {
        await router.push("/admin/exams");
      }
      return;
    }
    await router.push("/admin/exams");
  };

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    if (isDirty) {
      window.addEventListener("beforeunload", handler);

      return () => {
        window.removeEventListener("beforeunload", handler);
      };
    }

    return () => {};
  }, [isDirty]);

  return (
    <AdminLayout checkChangesOnforms={isDirty}>
      <div className="flex items-center justify-between">
        <Button
          iconLeft={faArrowLeftLong}
          label="Back to List"
          variant="link"
          onClick={handleBackButton}
        />

        {isAdmin && examData?.exams_by_id?.status !== "archived" && (
          <div className="mb-6 flex flex-col sm:mb-8">
            <Button
              label="Save Changes"
              iconLeft={faCircleCheck}
              classes="w-full md:w-64 self-end"
              onClick={onSubmit}
              disabled={!questionIds.length}
              loading={saving}
            />
          </div>
        )}
      </div>
      <AdminPanel>
        <form
          onSubmit={onSubmit}
          className={clsx(!isAdmin && "pointer-events-none")}
        >
          <fieldset
            disabled={!isAdmin || examData?.exams_by_id?.status === "archived"}
          >
            <div className="border-b border-gray-100 pb-6">
              <h1 className="text-lg font-medium">1. Exam Details</h1>
              {isAdmin && (
                <p className="text-gray-500">
                  Please fill out the information needed for the exam and then
                  proceed to the second step and add questions.
                </p>
              )}
            </div>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
              <Input
                label="Title"
                register={register("title")}
                error={errors.title}
                required
                classes="lg:col-span-3"
                autoFocus
              />
              <Select
                label="Status"
                required
                options={statusOptions}
                register={register("status")}
                disabled={examData?.exams_by_id?.status === "published"}
                error={errors.status}
              />
            </div>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 md:grid-cols-3 lg:grid-cols-3">
              <Select
                label="Cat 1 - Modalities"
                required
                options={
                  modalitiesQuery.data
                    ? modalitiesQuery.data?.categories.map((item) => ({
                        label: item.title as string,
                        value: item.id,
                        selected: item.id === watch("modality"),
                      }))
                    : []
                }
                register={
                  modalitiesQuery.data ? register("modality") : undefined
                }
                error={errors.modality}
              />
              <Combobox<Categories>
                name="specialties"
                control={control}
                label="Cat 2 - Specialties"
                options={specialtiesQuery.data?.categories ?? []}
                multiple
                query={specialtySearchQuery}
                setQuery={setSpecialtySearchQuery}
                getLabel={(c) => c.title || ""}
                by="id"
                displaySelectedValues
              />
              <Combobox<Categories>
                name="subspecialties"
                control={control}
                label="Cat 3 - Sub-specialties"
                options={subspecialtiesQuery.data?.categories ?? []}
                multiple
                query={subspecialtySearchQuery}
                setQuery={setSubspecialtySearchQuery}
                getLabel={(c) => c.title || ""}
                by="id"
                displaySelectedValues
              />
            </div>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 md:grid-cols-3 lg:grid-cols-3">
              <Select
                label="Agency"
                options={agencyOptions}
                register={agenciesQuery.data ? register("agency") : undefined}
                error={errors.agency}
              />
              <Input
                label="Passing Score"
                register={register("passing_score")}
                error={errors.passing_score}
                type="number"
                placeholder="Number from 1 to 100"
                required
              />
              <Input
                label="Allowed Attempts"
                register={register("allowed_attempts")}
                error={errors.allowed_attempts}
                type="number"
                placeholder="Number from 1 to 100"
                required
              />
              <Input
                label="No. of Questions to Give"
                register={register("questions_to_give")}
                error={errors.questions_to_give}
                type="number"
                placeholder="Number from 1 to 500"
                required
              />
              <Select
                label="Exam Expiration"
                options={Object.values(ExpirationType).map((e) => ({
                  label: startCase(e),
                  value: e,
                }))}
                register={register("expiration")}
                error={errors.expiration}
                required
              />
              <Input
                label="Contact hour (CEU)"
                register={register("contact_hour")}
                error={errors.contact_hour}
              />
              {auth.currentUser?.role !== UserRole.UsersManager && (
                <Input
                  label="Outline PDF file"
                  type="file"
                  register={register("outline")}
                  error={errors.outline as FieldError}
                  leftComponent={
                    outlineId && (
                      <>
                        <a
                          href={`/cms/assets/${outlineId}?#toolbar=0&navpanes=0&scrollbar=0`}
                          className="pointer-events-auto flex w-28 text-sm text-gray-500 underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Preview file
                        </a>
                        {isAdmin && (
                          <FontAwesomeIcon
                            icon={faTrash}
                            className="inline cursor-pointer text-red-500"
                            onClick={onClearOutline}
                          />
                        )}
                      </>
                    )
                  }
                />
              )}
            </div>
            <div className="mt-6">
              <Textarea
                label="Description"
                register={register("description")}
                error={errors.description}
                rows={2}
              />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6">
              <Textarea
                label="Passing Message"
                register={register("passing_message")}
                error={errors.passing_message}
                rows={2}
              />
              <Textarea
                label="Failing Message"
                register={register("fail_message")}
                error={errors.fail_message}
                rows={2}
              />
            </div>
            {isAdmin && (
              <>
                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6">
                  <Input
                    type="date"
                    error={errors.expiration_date}
                    register={register("expiration_date")}
                    label="Valid Thru"
                    disabled={true}
                  />
                </div>
                <div className="border-b border-gray-100 pb-6 pt-8">
                  <h1 className="text-lg font-medium">2. Questions</h1>
                  <>
                    <p className="text-gray-500">
                      You can either add questions from the Question Bank or you
                      can create and add a New Question.
                    </p>
                    <p className="absolute mt-1 text-xs text-red-500">
                      * At least one question must be included
                    </p>
                  </>
                </div>
                <div className="mt-6 grid content-center items-center gap-6 sm:grid-cols-1 md:grid-cols-2 md:gap-12 lg:grid-cols-3 xl:grid-cols-4">
                  <Button
                    label="Add from Question Bank"
                    iconLeft={faCircleQuestion}
                    onClick={() =>
                      modal.show({
                        title: "Add from Question Bank",
                        panelClasses: "md:!w-10/12",
                        children: (onClose) => (
                          <QuestionsList
                            mode="modal"
                            onSelect={(ids: string[]) => {
                              const nextIds = [
                                ...questionIds,
                                ...ids.filter(
                                  (id) => !questionIds.includes(id)
                                ),
                              ];
                              setQuestionIds(nextIds);
                              fetchQuestions(nextIds);
                              onClose();
                            }}
                          />
                        ),
                      })
                    }
                  />
                  <Button
                    label="Create New Question"
                    iconLeft={faCirclePlus}
                    onClick={() =>
                      modal.show({
                        title: "Create new Question",
                        panelClasses: "!w-11/12 lg:!w-10/12 xl:!w-8/12",
                        disableClickOutside: true,
                        children: (onClose) => (
                          <QuestionModal
                            onClose={onClose}
                            onCreate={(id, imageFileId) => {
                              const ids = [...questionIds, id];
                              setQuestionIds(ids);
                              fetchQuestions(ids);
                            }}
                            userRole={auth.currentUser?.role as UserRole}
                          />
                        ),
                      })
                    }
                  />
                  <div className="flex space-x-4 md:col-span-4">
                    <Toggle
                      control={control}
                      name="shuffle_questions"
                      label={
                        <p className="text-sm font-medium">
                          Shuffle Questions{" "}
                          <span className="font-normal text-gray-500">
                            (For each user)
                          </span>
                        </p>
                      }
                    />
                    {currentAgency?.ia_enable && (
                      <Toggle
                        control={control}
                        name="is_proctoring"
                        label={
                          <p className="text-sm font-medium">With Proctoring</p>
                        }
                      />
                    )}
                  </div>
                </div>
                <div className={clsx(isAdmin ? "mt-16" : "mt-8")} />
                <div className="grid gap-3">
                  <Reorder.Group
                    axis="y"
                    values={questionIds}
                    onReorder={setQuestionIds}
                  >
                    {!questionsLoading &&
                      questionsOrdered?.map((question, index) => {
                        return (
                          <Reorder.Item
                            key={question.id}
                            value={question.id}
                            className="answer-selection-container mb-4"
                            translate="no"
                            transition={{ duration: 0.2 }}
                          >
                            <QuestionCard
                              key={question?.id}
                              question={question}
                              index={index}
                              userRole={auth.currentUser?.role as UserRole}
                              onDelete={async () => {
                                if (
                                  await modal.showConfirm(
                                    "Are you sure you want to delete selected Question?"
                                  )
                                ) {
                                  const ids = questionIds.filter(
                                    (id) => id !== question?.id
                                  );

                                  setQuestionIds(ids);
                                  fetchQuestions(ids);
                                }
                              }}
                              onEdit={() =>
                                modal.show({
                                  title: `${
                                    isAdmin ? "Edit" : "View"
                                  } Question`,
                                  children: (onClose) => (
                                    <QuestionModal
                                      onClose={onClose}
                                      question={question}
                                      userRole={
                                        auth.currentUser?.role as UserRole
                                      }
                                    />
                                  ),
                                })
                              }
                            />
                          </Reorder.Item>
                        );
                      })}
                  </Reorder.Group>
                  {questionsOrdered?.length && questionsOrdered?.length > 2 && (
                    <div className="mt-6 grid content-center items-center gap-6 sm:grid-cols-1 md:grid-cols-2 md:gap-12 lg:grid-cols-3 xl:grid-cols-4">
                      <Button
                        label="Add from Question Bank"
                        iconLeft={faCircleQuestion}
                        onClick={() =>
                          modal.show({
                            title: "Add from Question Bank",
                            panelClasses: "md:!w-10/12",
                            children: (onClose) => (
                              <QuestionsList
                                mode="modal"
                                onSelect={(ids: string[]) => {
                                  const nextIds = [
                                    ...questionIds,
                                    ...ids.filter(
                                      (id) => !questionIds.includes(id)
                                    ),
                                  ];
                                  setQuestionIds(nextIds);
                                  fetchQuestions(nextIds);
                                  onClose();
                                }}
                              />
                            ),
                          })
                        }
                      />
                      <Button
                        label="Create New Question"
                        iconLeft={faCirclePlus}
                        onClick={() =>
                          modal.show({
                            title: "Create new Question",
                            panelClasses: "!w-11/12 lg:!w-10/12 xl:!w-8/12",
                            children: (onClose) => (
                              <QuestionModal
                                onClose={onClose}
                                onCreate={(id) => {
                                  const ids = [...questionIds, id];
                                  setQuestionIds(ids);
                                  fetchQuestions(ids);
                                }}
                                userRole={auth.currentUser?.role as UserRole}
                              />
                            ),
                          })
                        }
                      />
                    </div>
                  )}
                </div>
              </>
            )}
            <div className="mt-32" />
          </fieldset>
        </form>
      </AdminPanel>
    </AdminLayout>
  );
}

export default withAuth(ExamDetail, AdminGroup);
