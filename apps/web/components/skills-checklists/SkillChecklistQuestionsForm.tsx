import { FormProvider } from "react-hook-form";
import {
  faCheckCircle,
  faPlusCircle,
} from "@fortawesome/pro-regular-svg-icons";
import Button from "../Button";
import { AdminLayout } from "../AdminLayout";
import { useSkillChecklistQuestions } from "../../hooks/skill-checklist/useSkillChecklistQuestions";
import { SkillChecklistLayout } from "./SkillChecklistLayout";
import { SkillChecklistQuestion } from "./SkillChecklistQuestion";

export function SkillChecklistQuestionsForm() {
  const {
    isNew,
    canEdit,
    definition,
    form,
    questions,
    addQuestion,
    removeQuestion,
    onSubmit,
    isSaving,
    newFormatEnabled,
  } = useSkillChecklistQuestions();

  const moveQuestion = (fromIndex: number, direction: "up" | "down") => {
    const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
    questions.move(fromIndex, toIndex);
  };

  const renderActionButtons = () => (
    <div className="flex justify-end gap-4">
      <Button
        onClick={addQuestion}
        label="New Question"
        size="xs"
        iconLeft={faPlusCircle}
        disabled={!canEdit}
      />
      <Button
        onClick={form.handleSubmit(onSubmit)}
        label="Save Changes"
        size="xs"
        disabled={!canEdit}
        iconLeft={faCheckCircle}
        loading={isSaving}
      />
    </div>
  );

  return (
    <AdminLayout>
      <SkillChecklistLayout
        title={
          isNew ? "Create a new skill checklist" : (definition?.title as string)
        }
      >
        <div className="my-4">{renderActionButtons()}</div>

        <div className="flex flex-col gap-10">
          <FormProvider {...form}>
            {questions.fields.map((question, index) => (
              <SkillChecklistQuestion
                onRemoveQuestion={() => removeQuestion(index)}
                questionIndex={index}
                key={question.id}
                newFormatEnabled={newFormatEnabled}
                isFirstQuestion={index === 0}
                isLastQuestion={index === questions.fields.length - 1}
                onMoveQuestionUp={() => moveQuestion(index, "up")}
                onMoveQuestionDown={() => moveQuestion(index, "down")}
              />
            ))}
          </FormProvider>
        </div>

        <div className="my-4 mt-5">{renderActionButtons()}</div>
      </SkillChecklistLayout>
    </AdminLayout>
  );
}
