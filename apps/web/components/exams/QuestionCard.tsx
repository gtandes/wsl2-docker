import { AllQuestionsForListFragment } from "api/generated/graphql";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEllipsis } from "@fortawesome/pro-solid-svg-icons";
import React, { useState } from "react";
import { CorrectAnswer, Question } from "./QuestionModal";
import { PopOver, PopOverItem } from "../PopOver";
import { UserRole } from "../../types/roles";
import clsx from "clsx";
import { Badge } from "../Badge";
import Image from "next/image";
import { Dialog } from "@headlessui/react";
import { faXmark } from "@fortawesome/pro-solid-svg-icons";

interface Props {
  index: number;
  question: AllQuestionsForListFragment;
  onDelete: () => void;
  onEdit: () => void;
  userRole: UserRole;
}

export const QuestionCard: React.FC<Props> = ({
  question,
  onDelete,
  index,
  onEdit,
  userRole,
}) => {
  const questionVersion = question.versions?.at(0);
  const questionObject: Question | undefined =
    questionVersion?.question as Question;
  const answerObject: CorrectAnswer = questionVersion?.answer as CorrectAnswer;
  const isAdmin =
    userRole === UserRole.HSHAdmin || userRole === UserRole.Developer;
  const [isOpen, setIsOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const questionImageUrl = `/cms/assets/${questionVersion?.image?.id}`;

  return (
    <div
      className={clsx(
        "mb-4 cursor-grabbing rounded bg-blue-50 p-8 pr-3 pt-1",
        !isAdmin && "pt-6"
      )}
    >
      {isAdmin && (
        <div className="flex justify-end">
          <PopOver
            panelClasses="-mt-2 right-0"
            button={
              <FontAwesomeIcon
                icon={faEllipsis}
                className="cursor-pointer p-2"
              />
            }
          >
            <>
              <PopOverItem onClick={() => onEdit()}>Edit</PopOverItem>
              <PopOverItem onClick={() => onDelete()}>Delete</PopOverItem>
            </>
          </PopOver>
        </div>
      )}
      <div className="mr-6">
        <div className="mb-3 flex justify-between">
          <p className="font-medium text-gray-700">
            {index + 1}. {question.title}
          </p>
          {question.category?.title && (
            <div className={clsx("mr-10 min-w-fit", !isAdmin && "!mr-0")}>
              <Badge>{question.category?.title} </Badge>
            </div>
          )}
        </div>
        {questionObject?.answers.map((answer) => (
          <div key={answer.id} className="mb-2 flex items-start">
            <input
              type="radio"
              className="pointer-even ts-none mr-3 mt-1"
              checked={answer.id === answerObject.id}
              readOnly
            />
            <p className="font-medium">{answer.answer_text}</p>
          </div>
        ))}
        <div className="mt-6">
          {questionVersion?.image?.id && !imageError && (
            <>
              <div
                className="mt-6 w-full cursor-pointer"
                onClick={() => setIsOpen(true)}
              >
                <div className="relative overflow-hidden rounded-lg transition-opacity hover:opacity-90">
                  <Image
                    src={questionImageUrl}
                    alt="Question image"
                    priority
                    width={500}
                    height={150}
                    className="rounded-lg"
                    onError={() => setImageError(true)}
                  />
                </div>
              </div>
              <Dialog
                open={isOpen}
                onClose={() => setIsOpen(false)}
                className="relative z-50"
              >
                <div className="fixed inset-0 bg-black/70" aria-hidden="true" />

                <div className="fixed inset-0 flex items-center justify-center">
                  <Dialog.Panel className="relative h-full w-full">
                    <button
                      onClick={() => setIsOpen(false)}
                      className="absolute right-4 top-4 z-10 rounded-full bg-white p-2 text-gray-500 hover:text-gray-700"
                    >
                      <FontAwesomeIcon icon={faXmark} size="lg" />
                    </button>
                    <div className=" h-full w-full">
                      <Image
                        src={questionImageUrl}
                        alt="Question Image Fullscreen Preview"
                        fill
                        priority
                        className="object-contain"
                        onError={() => setImageError(true)}
                      />
                    </div>
                  </Dialog.Panel>
                </div>
              </Dialog>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestionCard;
