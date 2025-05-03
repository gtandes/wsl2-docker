import React from "react";
import Button from "../Button";
import { faArrowLeft, faBallotCheck } from "@fortawesome/pro-solid-svg-icons";
import { useRouter } from "next/router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Outline } from "../exams/Outline";
import { Badge } from "../Badge";
import { useIntegrityAdvocate } from "../../hooks/useIntegrityAdvocate";

interface Props {
  modality?: string;
  category?: string;
  title: string;
  outlineId?: string;
}

const HeaderButtons = ({ outlineId }: { outlineId?: string }) => {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-3 lg:flex-row">
      <Button
        iconLeft={faArrowLeft}
        label="Back to Exams"
        variant="light"
        onClick={async () => {
          window.location.href = "/clinician/exams";
        }}
      />
      {outlineId && <Outline id={outlineId as string} />}
    </div>
  );
};

export const ExamHeader: React.FC<Props> = ({
  modality,
  category,
  title,
  outlineId,
}) => {
  return (
    <>
      <div className="mt-8 hidden flex-grow items-center justify-between md:flex">
        <div className="flex flex-row items-center">
          <div className="mr-3 flex items-center justify-center rounded-md border-gray-300 bg-purple-100 p-2 px-6">
            <FontAwesomeIcon
              icon={faBallotCheck}
              size="3x"
              className="text-purple-400"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-purple-400">{category}</p>
            <h1 className="text-3xl font-medium">{title}</h1>
          </div>
        </div>
        <HeaderButtons outlineId={outlineId} />
      </div>
      <div className="mt-3 flex items-start justify-between md:hidden">
        <div>
          <p className="text-sm font-medium text-red-400">{modality}</p>
          <Badge>{category}</Badge>
        </div>
        <HeaderButtons outlineId={outlineId} />
      </div>
      <div className="my-8 flex flex-grow items-center justify-between rounded border-l-8 border-red-400 bg-white p-6 shadow md:hidden">
        <p className="font-medium">{title}</p>
      </div>
    </>
  );
};
