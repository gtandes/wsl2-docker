import {
  faTrash,
  faPlus,
  faFileImport,
  faArrowUp,
  faArrowDown,
} from "@fortawesome/pro-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Input } from "../Input";
import Button from "../Button";

import { faCircleExclamation } from "@fortawesome/pro-regular-svg-icons";
import { useAuth } from "../../hooks/useAuth";
import { UserRole } from "../../types/roles";
import { useEffect, useState } from "react";
import { useModal } from "../../hooks/useModal";
import Dropbox from "../utils/Dropbox";
import { SkillChecklistParserData } from "../../types/global";
import { SCQuestionsFormType } from "../../hooks/skill-checklist/useSkillChecklistQuestions";
import { Toggle } from "../Toggle";
import { Tooltip } from "../utils/Tooltip";

interface Props {
  questionIndex: number;
  onRemoveQuestion: () => void;
  newFormatEnabled: boolean;
  isFirstQuestion: boolean;
  isLastQuestion: boolean;
  onMoveQuestionUp: () => void;
  onMoveQuestionDown: () => void;
}

export const SkillChecklistQuestion: React.FC<Props> = ({
  questionIndex,
  onRemoveQuestion,
  newFormatEnabled,
  isFirstQuestion,
  isLastQuestion,
  onMoveQuestionUp,
  onMoveQuestionDown,
}) => {
  const form = useFormContext<SCQuestionsFormType>();

  const { currentUser } = useAuth();
  const canEdit = currentUser?.role === UserRole.HSHAdmin;

  const sections = useFieldArray({
    control: form.control,
    name: `questions.${questionIndex}.sections`,
  });

  const appendSection = () => {
    if (newFormatEnabled) {
      sections.append({
        title: "",
        items: [],
        excludeFromScore: false,
      });
      return;
    }
    sections.append({
      title: "",
      items: [],
    });
  };

  const moveSection = (fromIndex: number, direction: "up" | "down") => {
    const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
    sections.move(fromIndex, toIndex);
  };

  return (
    <div className="flex flex-col gap-10 bg-dark-blue-50 px-7 py-6">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-lg font-medium">
              Question {questionIndex + 1}
            </h1>
            <div className="ml-4 flex">
              <button
                onClick={onMoveQuestionUp}
                disabled={isFirstQuestion || !canEdit}
                className="rounded-l bg-gray-200 px-2 py-1 text-gray-600 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400"
                title="Move question up"
              >
                <FontAwesomeIcon icon={faArrowUp} size="xs" />
              </button>
              <button
                onClick={onMoveQuestionDown}
                disabled={isLastQuestion || !canEdit}
                className="rounded-r bg-gray-200 px-2 py-1 text-gray-600 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400"
                title="Move question down"
              >
                <FontAwesomeIcon icon={faArrowDown} size="xs" />
              </button>
            </div>
          </div>
          <button
            onClick={onRemoveQuestion}
            disabled={form.watch("questions").length === 1 || !canEdit}
            className="h-7 w-9 rounded bg-blue-100 text-xs font-medium text-blue-900 hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-700"
          >
            <FontAwesomeIcon icon={faTrash} />
          </button>
        </div>
      </div>
      <div className="flex flex-col rounded border-b border-gray-100 bg-blue-100">
        <div className="flex items-center rounded-t bg-blue-800 py-3 pl-6 pr-2">
          <span className="w-7/12 text-sm font-medium text-white">
            PROCEDURES/SKILLS
          </span>
          {newFormatEnabled ? (
            <span className="flex-1 text-sm font-medium text-white">
              PROFICIENCY
            </span>
          ) : (
            <>
              <span className="hidden flex-1 text-sm font-medium text-white lg:block">
                SKILLS
              </span>
              <span className="hidden flex-1 text-sm font-medium text-white lg:block">
                FREQUENCY
              </span>
            </>
          )}
        </div>
        {sections.fields.map((section, sectionIndex) => (
          <Section
            key={section.id}
            sectionIndex={sectionIndex}
            questionIndex={questionIndex}
            isNewFormatEnabled={newFormatEnabled}
            onRemoveSection={() => sections.remove(sectionIndex)}
            isFirstSection={sectionIndex === 0}
            isLastSection={sectionIndex === sections.fields.length - 1}
            onMoveUp={() => moveSection(sectionIndex, "up")}
            onMoveDown={() => moveSection(sectionIndex, "down")}
            canEdit={canEdit}
          />
        ))}
      </div>
      <Button onClick={appendSection} disabled={!canEdit} label="Add section" />
      {form.formState.errors.questions?.[questionIndex]?.sections?.message && (
        <div>
          <span className="text-red-500">
            {
              form.formState.errors.questions?.[questionIndex]?.sections
                ?.message
            }{" "}
            <FontAwesomeIcon icon={faCircleExclamation} />
          </span>
        </div>
      )}
    </div>
  );
};

const ScoreButton = ({ score }: { score: number }) => (
  <button
    type="button"
    className="flex h-7 w-7 items-center justify-center rounded bg-gray-100 text-sm font-medium text-blue-900 hover:bg-gray-200"
  >
    {score}
  </button>
);

const Section = ({
  sectionIndex,
  questionIndex,
  onRemoveSection,
  isNewFormatEnabled,

  canEdit,
}: {
  sectionIndex: number;
  questionIndex: number;
  onRemoveSection: () => void;
  isNewFormatEnabled: boolean;
  isFirstSection: boolean;
  isLastSection: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canEdit: boolean;
}) => {
  const form = useFormContext<SCQuestionsFormType>();
  const modal = useModal();
  const [dropboxValues, setDropboxValues] =
    useState<SkillChecklistParserData>();

  const items = useFieldArray({
    control: form.control,
    name: `questions.${questionIndex}.sections.${sectionIndex}.items`,
    rules: {
      minLength: 1,
    },
  });

  const handleDropbox = async () => {
    await modal.show({
      title: "Import Section",
      children: (onClose) => (
        <div className="flex flex-col gap-3">
          <Dropbox<SkillChecklistParserData>
            type="SkillChecklists"
            setParsedValues={setDropboxValues}
            isNewFormatEnabled={isNewFormatEnabled}
          />
          <div className="flex justify-end gap-3">
            <Button type="button" label="Save" onClick={onClose} />
          </div>
        </div>
      ),
    });
  };

  const handleAddItem = () => {
    const newItem = isNewFormatEnabled
      ? { title: "", proficiency: null }
      : { title: "", skill: null, frequency: null };

    items.append(newItem);
  };

  useEffect(() => {
    if (dropboxValues) {
      const handleDropboxValues = () => {
        form.setValue(
          `questions.${questionIndex}.sections.${sectionIndex}.title`,
          dropboxValues.section
        );

        items.remove();

        const mappedSkills = dropboxValues.items?.map((item) => {
          return isNewFormatEnabled
            ? { title: item?.title ?? "", proficiency: item?.proficiency }
            : {
                title: item?.title ?? "",
                skill: item?.skill,
                frequency: item?.frequency,
              };
        });

        if (mappedSkills && mappedSkills.length > 0) {
          items.append(mappedSkills as any);
        }
      };

      handleDropboxValues();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropboxValues]);

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-x border-gray-100 px-2 py-2">
        <div className="w-full pr-6 lg:w-7/12">
          <div className="flex-grow">
            <Input
              disabled={!canEdit}
              register={form.register(
                `questions.${questionIndex}.sections.${sectionIndex}.title`
              )}
              placeholder="SECTION TITLE"
              error={
                form.formState.errors.questions?.[questionIndex]?.sections?.[
                  sectionIndex
                ]?.title
              }
            />
          </div>
        </div>
        <div className="flex gap-3">
          {isNewFormatEnabled && (
            <Tooltip
              content={
                <p className="w-36 rounded bg-black/80 p-1.5 text-xs text-white md:ml-40 md:w-96">
                  This toggle determines whether the section is excluded from
                  the scoring calculations. When enabled, the {`sections's`}{" "}
                  items will not contribute to the overall score.
                </p>
              }
              showArrow
              placement="top"
              offset={10}
              arrowOptions={{ fill: "rgb(100,100,100)" }}
            >
              <Toggle
                label="Exclude from score"
                name={`questions.${questionIndex}.sections.${sectionIndex}.excludeFromScore`}
                disabled={!canEdit}
              />
            </Tooltip>
          )}
          <button
            className="rounded bg-blue-800 px-2 text-white hover:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-700"
            onClick={handleDropbox}
            disabled={!canEdit}
          >
            <FontAwesomeIcon icon={faFileImport} size="xs" />
          </button>
          <button
            onClick={onRemoveSection}
            className="rounded border bg-red-300 px-2 text-red-700 hover:bg-red-200 disabled:bg-gray-200 disabled:text-gray-700"
            disabled={
              form.watch(`questions.${questionIndex}.sections`).length === 1 ||
              !canEdit
            }
          >
            <FontAwesomeIcon icon={faTrash} size="xs" />
          </button>
        </div>
      </div>
      <div className="relative flex flex-col border-x border-gray-100 bg-white px-2">
        <div className="flex flex-col divide-y divide-gray-100">
          {items.fields.map((item, itemIndex) => (
            <div key={item.id} className="flex items-center">
              <div
                className={`flex items-center pr-6 ${
                  isNewFormatEnabled ? "w-full" : "w-full lg:w-7/12"
                }`}
              >
                <span className="flex h-20 w-14 items-center justify-center">
                  {itemIndex + 1}
                </span>
                <Input
                  disabled={!canEdit}
                  register={form.register(
                    `questions.${questionIndex}.sections.${sectionIndex}.items.${itemIndex}.title`
                  )}
                  placeholder="Enter skill here"
                  error={
                    form.formState.errors.questions?.[questionIndex]
                      ?.sections?.[sectionIndex]?.items?.[itemIndex]?.title
                  }
                />
              </div>
              {isNewFormatEnabled ? (
                <div className="flex items-center justify-end">
                  <div className="flex gap-1 2xl:gap-3">
                    {Array.from(Array(4).keys()).map((score) => (
                      <ScoreButton key={score} score={score + 1} />
                    ))}
                  </div>
                  <button
                    onClick={() => items.remove(itemIndex)}
                    disabled={items.fields.length === 1 || !canEdit}
                    className="ml-3 rounded border border-red-200 px-2 text-red-400 enabled:hover:bg-red-200 disabled:border-gray-200 disabled:text-gray-700"
                  >
                    <FontAwesomeIcon icon={faTrash} size="xs" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="hidden flex-1 gap-1 lg:flex 2xl:gap-3">
                    {Array.from(Array(4).keys()).map((score) => (
                      <ScoreButton key={score} score={score + 1} />
                    ))}
                  </div>
                  <div className="flex flex-1 justify-end lg:justify-between">
                    <div className="hidden gap-1 lg:flex 2xl:gap-3">
                      {Array.from(Array(4).keys()).map((score) => (
                        <ScoreButton key={score} score={score + 1} />
                      ))}
                    </div>
                    <button
                      onClick={() => items.remove(itemIndex)}
                      disabled={items.fields.length === 1 || !canEdit}
                      className="rounded border border-red-200 px-2 text-red-400 enabled:hover:bg-red-200 disabled:border-gray-200 disabled:text-gray-700"
                    >
                      <FontAwesomeIcon icon={faTrash} size="xs" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={handleAddItem}
          disabled={!canEdit}
          className="absolute -bottom-2 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-blue-800 text-white hover:bg-blue-600 disabled:bg-gray-400"
        >
          <FontAwesomeIcon icon={faPlus} size="xs" />
        </button>
        {form.formState.errors.questions?.[questionIndex]?.sections?.[
          sectionIndex
        ]?.items?.message && (
          <div className="py-2">
            <span className="text-sm font-medium text-red-500">
              {
                form.formState.errors.questions?.[questionIndex]?.sections?.[
                  sectionIndex
                ]?.items?.message
              }{" "}
              <FontAwesomeIcon icon={faCircleExclamation} />
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
