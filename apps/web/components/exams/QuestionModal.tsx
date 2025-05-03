import { useEffect, useState } from "react";
import { Textarea } from "../Textarea";
import { Input } from "../Input";
import Button from "../Button";
import { FieldError, useForm } from "react-hook-form";
import { z } from "zod";
import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AllQuestionsForListFragment,
  useCreateQuestionMutation,
  useCreateQuestionVersionMutation,
  useGetAllCategoriesQuery,
  useUpdateQuestionMutation,
} from "api";
import {
  GENERIC_ERROR,
  GENERIC_FILE_UPLOAD_ERROR,
  NotificationProps,
  notify,
} from "../Notification";
import { v4 as uuidv4 } from "uuid";
import Select from "../Select";
import { UserRole } from "../../types/roles";
import { DirectusStatus } from "types";
import { ExamParserData } from "../../types/global";
import Dropbox from "../utils/Dropbox";
import { createFile } from "../../utils/utils";

export interface Question {
  id: string;
  question_text: string;
  answers: Answer[];
}

export interface Answer {
  id: string;
  answer_text: string;
}

export interface CorrectAnswer {
  id: string;
}

interface Props {
  onClose: (open: boolean) => void;
  question?: AllQuestionsForListFragment;
  onCreate?: (id: string, imageFileId: string) => void;
  userRole: UserRole;
}

const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/png"];
let MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const validationSchema = z.object({
  question_text: z.string().min(1, { message: "Required" }),
  correct_answer: z.string().min(1, { message: "Required" }),
  category: z.string().min(1, { message: "Required" }),
  answer1: z.string().min(1, { message: "Required" }),
  answer2: z.string().min(1, { message: "Required" }),
  answer3: z.string().optional(),
  answer4: z.string().optional(),
  answer5: z.string().optional(),
  answer6: z.string().optional(),
  image: z
    .custom<File[]>()
    .optional()
    .refine((file) => {
      if (file && file.length) {
        return file[0].size <= MAX_FILE_SIZE;
      }
      return true;
    }, `Max file size is 10MB.`)
    .refine((file) => {
      if (file && file.length) {
        return ACCEPTED_FILE_TYPES.includes(file[0].type);
      }
      return true;
    }, `.jpg and .png files are accepted.`),
});

type FormData = z.infer<typeof validationSchema>;

const QUESTION_SUCCESS_SAVED: NotificationProps = {
  type: "success",
  title: <>Question saved!</>,
};

export const QuestionModal = ({
  onClose,
  question,
  onCreate,
  userRole,
}: Props) => {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, dirtyFields, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(validationSchema),
  });
  const [answerIDs, setAnswerIDs] = useState<string[]>();
  const [dropboxValues, setDropboxValues] = useState<ExamParserData>();
  const isAdmin =
    userRole === UserRole.HSHAdmin || userRole === UserRole.Developer;

  useEffect(() => {
    if (question) {
      const version = question.versions?.at(0);
      const originAnswers = (version?.question as Question)?.answers;
      const originCorrectAnswer = version?.answer as CorrectAnswer;

      let answerIDs: string[] = [];
      let correctAnswerID: string | undefined;

      const answers: string[] = Array.from(Array(6).keys()).map((index) => {
        const currentAnswer = originAnswers.at(index);

        if (currentAnswer) {
          // If the answer already has an ID, use it
          answerIDs.push(currentAnswer.id);
          if (currentAnswer.id === originCorrectAnswer?.id) {
            correctAnswerID = currentAnswer.id;
          }
          return currentAnswer.answer_text;
        }

        const newID = uuidv4();
        answerIDs.push(newID);
        return "";
      });

      // Update the state with newly generated IDs for answers
      setAnswerIDs(answerIDs);

      // Reset the form with existing values
      reset({
        question_text: question.title as string,
        correct_answer: correctAnswerID, // Use the correct answer ID
        category: question.category?.id,
        answer1: answers.at(0),
        answer2: answers.at(1),
        answer3: answers.at(2),
        answer4: answers.at(3),
        answer5: answers.at(4),
        answer6: answers.at(5),
      });
    } else {
      // New question: generate UUIDs for answers
      const newAnswerIDs = Array.from(Array(6).keys()).map(() => uuidv4());
      setAnswerIDs(newAnswerIDs);
    }
  }, [question, reset]);

  const [createQuestion] = useCreateQuestionMutation();
  const [updateQuestion] = useUpdateQuestionMutation();
  const [createQuestionVersion] = useCreateQuestionVersionMutation();
  const categoriesQuery = useGetAllCategoriesQuery({
    variables: {
      filter: {
        status: { _eq: DirectusStatus.PUBLISHED },
        type: { _eq: "question" },
      },
      sort: ["title"],
      limit: -1,
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    const category = categoriesQuery.data?.categories.find(
      (category) => category.id === data.category
    );

    const answerValues = Object.entries(watch()).filter((item) =>
      item[0].startsWith("answer")
    );

    let answers = answerValues
      .map((item, index) => ({
        id: answerIDs?.at(index) || uuidv4(),
        sort: index,
        answer_text: item[1],
      }))
      .sort((a, b) => a.sort - b.sort);

    if (answers.some((answer) => answer.id === undefined)) {
      notify(GENERIC_ERROR);
      return;
    }

    if (
      answers.some(
        (answer) =>
          answer.id === data.correct_answer && answer.answer_text === ""
      )
    ) {
      setError("correct_answer", {});
      return;
    }

    const correct_answer = {
      id: data.correct_answer.toString(),
    };

    const questionJson = {
      question_text: data.question_text,
      answers: answers.filter((item) => item.answer_text !== ""),
    };

    const commonPayload = {
      title: data.question_text,
      type: "multiple-choice-single-answer",
      category: {
        id: category?.id,
      },
    };

    let imageFileId;
    const imageFile = data.image && data.image[0];

    if (imageFile) {
      imageFileId = uuidv4();
      const form = new FormData();
      form.append("id", imageFileId);
      form.append("folder", "2e0361f9-0f81-4dd9-82cb-124d601e31ed"); // Questions folder
      form.append("file", imageFile);

      try {
        await createFile(form);
      } catch (e) {
        notify(GENERIC_FILE_UPLOAD_ERROR);
        return;
      }
    }

    const imageVersion = question?.versions?.at(0)?.image?.id;

    const image = imageFile
      ? {
          id: imageFileId,
          storage: "local",
          filename_download: imageFileId as string,
        }
      : imageVersion
      ? {
          id: imageVersion,
          storage: "local",
          filename_download: imageVersion as string,
        }
      : undefined;

    let mutatedId;
    try {
      if (!question) {
        const mutationResult = await createQuestion({
          variables: {
            data: {
              ...commonPayload,
              versions: [
                {
                  question: questionJson,
                  answer: correct_answer,
                  ...(image && { image }),
                },
              ],
            },
          },
          ...genericMutationSideEffects,
        });
        mutatedId = mutationResult.data?.create_questions_item?.id;
      } else {
        let areEqual = true;
        const dirtyFieldsArray = Object.keys(dirtyFields);

        for (const field of dirtyFieldsArray) {
          if (field === "correct_answer" || field.startsWith("answer")) {
            areEqual = false;
            break;
          }
        }

        if (!areEqual) {
          await createQuestionVersion({
            variables: {
              data: {
                question: questionJson,
                answer: correct_answer,
                question_id: {
                  id: question.id,
                },
                ...(image && { image }),
              },
            },
          });
        }

        const mutationResult = await updateQuestion({
          variables: {
            id: question.id,
            data: {
              ...commonPayload,
              versions: [
                {
                  question: questionJson,
                  answer: correct_answer,
                  ...(image && { image }),
                },
              ],
            },
          },
          ...genericMutationSideEffects,
        });
        mutatedId = mutationResult.data?.update_questions_item?.id;
      }

      if (onCreate) {
        onCreate(mutatedId as string, imageFileId as string);
      }
    } catch (error) {
      const errorMessage = (error as Error).message;

      if (errorMessage.includes("400")) {
        notify({
          type: "error",
          title: "Bad Request",
          description: "Please check the form for errors and try again.",
        });
      } else {
        notify(GENERIC_ERROR);
      }
    }
  });

  const onCompleted = () => {
    notify(QUESTION_SUCCESS_SAVED);
    onClose(false);
  };

  const genericMutationSideEffects = {
    onCompleted: onCompleted,
    refetchQueries: ["getAllQuestions", "questionsTotalPages"],
  };

  const images = watch("image");
  const image = images && images[0];

  //dropbox parser use
  useEffect(() => {
    if (dropboxValues) {
      const createAnswersStructure = dropboxValues?.answers?.map((a, i) => ({
        [`answer${i + 1}`]: a?.answer,
      }));
      const answers = Object.assign({}, ...createAnswersStructure);
      const answersIds = dropboxValues.answers.map((a) => a?.id) as string[];
      const category = categoriesQuery.data?.categories.find(
        (category) => category.title === dropboxValues.questionCategory
      );

      if (answersIds.length) {
        setAnswerIDs(answersIds);
      }
      reset({
        correct_answer: dropboxValues.correctAnswer,
        category: category?.id || null,
        question_text: dropboxValues.questionText,
        ...answers,
      });
    }
  }, [dropboxValues, categoriesQuery, reset]);

  return (
    <form onSubmit={onSubmit}>
      <fieldset disabled={!isAdmin}>
        <div className="mt-6 grid grid-cols-1 gap-2">
          <Dropbox<ExamParserData>
            type="ExamQuestions"
            setParsedValues={setDropboxValues}
          />
          <Select
            label="Category"
            required
            options={
              categoriesQuery.data
                ? categoriesQuery.data?.categories.map((item) => ({
                    label: item.title as string,
                    value: item.id,
                    selected: item.id === watch("category"),
                  }))
                : []
            }
            register={register("category")}
          />
          <Textarea
            label="Question text"
            register={register("question_text")}
            error={errors.question_text}
            required
            rows={3}
          />
          <Input
            label="Image"
            type="file"
            register={register("image")}
            error={errors.image as FieldError}
            leftComponent={
              image ? (
                <Image
                  src={URL.createObjectURL(image)}
                  alt="Question image"
                  width={120}
                  height={120}
                  style={{ width: "120px", height: "120px" }}
                  className="rounded-md object-contain"
                />
              ) : (
                question?.versions?.at(0)?.image?.id && (
                  <a
                    href={`/cms/assets/${question?.versions?.at(0)?.image?.id}`}
                    className="bg flex bg-[url('/loading.gif')] bg-contain bg-center bg-no-repeat text-sm text-gray-500 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/cms/assets/${
                        question?.versions?.at(0)?.image?.id
                      }?width=320&fit=contain`}
                      width={160}
                      height={160}
                      alt="Question image"
                      className="rounded-md object-contain"
                    />
                  </a>
                )
              )
            }
          />
          <div className="mt-4 space-y-3">
            {Array.from(Array(6).keys()).map((index) => {
              const correctAnswer = watch("correct_answer");

              return (
                <div
                  key={`option-${index + 1}`}
                  className="relative flex items-center"
                >
                  <p className="mr-2 h-4 w-24 leading-none">
                    Option {index + 1} <br />
                    {answerIDs &&
                      answerIDs[index] === watch("correct_answer") && (
                        <span className="m-0 inline p-0 text-xs text-green-500">
                          correct
                        </span>
                      )}
                  </p>
                  <input
                    type="radio"
                    value={answerIDs?.[index]}
                    checked={answerIDs?.[index] === correctAnswer}
                    {...register("correct_answer")}
                    onClick={() => {
                      const newAnswerIDs = [...(answerIDs || [])];

                      if (!newAnswerIDs[index]) {
                        newAnswerIDs[index] = uuidv4();
                        setAnswerIDs(newAnswerIDs);
                      }
                    }}
                  />
                  <div className="ml-3 w-full text-sm leading-6">
                    <Input
                      register={register(`answer${index + 1}` as any)}
                      classes="w-full"
                      maxLength={1000}
                      error={
                        Object.entries(errors).find(
                          (entry) => entry[0] === `answer${index + 1}`
                        )?.[1] as any
                      }
                    />
                  </div>
                </div>
              );
            })}
            {errors.correct_answer && (
              <p className="text-xs text-red-500">Select one correct answer</p>
            )}
          </div>
        </div>
        {isAdmin && (
          <div className="mt-5 grid grid-flow-row-dense grid-cols-2 gap-3 sm:mt-12">
            <Button
              onClick={() => {
                onClose(false);
              }}
              type="button"
              label="Cancel"
              variant="outline"
            />
            <Button type="submit" label="Save" loading={isSubmitting} />
          </div>
        )}
      </fieldset>
    </form>
  );
};
