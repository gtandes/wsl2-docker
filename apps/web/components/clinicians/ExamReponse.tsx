import { faCircleDot, faXmark } from "@fortawesome/pro-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useState } from "react";
import Image from "next/image";
import { Dialog } from "@headlessui/react";

interface Props {
  question: string;
  optionText: string;
  optionColor: string;
  category?: string;
  categoryColor?: string;
  questionImageUrl?: string;
}

export const ExamResponse: React.FC<Props> = ({
  question,
  optionText,
  optionColor,
  category,
  categoryColor,
  questionImageUrl,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="exam-response mb-5 flex min-w-[80%] flex-col rounded-md bg-blue-50 p-7">
      <div className="flex justify-between gap-3">
        <div className="text-sm font-medium text-gray-800">
          <p>{question}</p>
          <div className="mt-4 flex items-center">
            <FontAwesomeIcon icon={faCircleDot} color={optionColor} />
            <span className="ml-2">{optionText}</span>
          </div>
        </div>
        {category && (
          <div className="flex min-w-[20%] items-start justify-end">
            <div
              className={`flex h-9 items-center rounded-md px-4 py-2 text-sm font-medium ${
                categoryColor
                  ? `bg-${categoryColor}-100 text-${categoryColor}-800`
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {category}
            </div>
          </div>
        )}
      </div>
      {questionImageUrl && (
        <>
          <div
            className="mt-6 w-full cursor-pointer"
            onClick={() => setIsOpen(true)}
          >
            <div className="relative aspect-[3/1] w-full overflow-hidden rounded-lg transition-opacity hover:opacity-90">
              <Image
                src={questionImageUrl}
                alt="Question Image"
                fill
                priority
                style={{ objectFit: "contain" }}
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
                  />
                </div>
              </Dialog.Panel>
            </div>
          </Dialog>
        </>
      )}
    </div>
  );
};
