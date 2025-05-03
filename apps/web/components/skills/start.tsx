import React from "react";
import { SpecialtyHeader } from "../SpecialtyHeader";
import { faUserDoctor } from "@fortawesome/pro-light-svg-icons";
import Button from "../Button";

import { faArrowLeft } from "@fortawesome/pro-solid-svg-icons";

interface Props {}

export const SkillsStart: React.FC<Props> = ({}) => {
  return (
    <>
      <SpecialtyHeader
        icon={faUserDoctor}
        color="green"
        title="RN - Emergency Room (ER)"
        backButtonLabel="Back to Skills Checklists"
        category="TODO"
      />

      <div className="my-4 flex min-w-full flex-col items-center rounded-md bg-white p-6 shadow">
        <div className="flex w-full justify-start align-middle">
          <Button iconLeft={faArrowLeft} label="Back to Score" variant="link" />
        </div>

        <div className="mb-6 flex flex-col items-center">
          <h1 className="m-6 text-center text-4xl font-medium text-blue-800">
            Let’s get started!
          </h1>
          <p className="font-bold text-gray-500">
            Please rate your level of skills & frequency of performance for the
            Following procedures/skills:
          </p>

          <div className="mx-24 flex flex-row rounded-md">
            <div className="my-4 mr-7 max-w-[50%] rounded-md bg-blue-100 p-8">
              <h2 className="mb-2 text-xl font-bold text-blue-600">
                Proficiency
              </h2>
              <ol className="m-4 flex list-decimal flex-col gap-2 px-2 text-gray-500">
                <li>I have never done the stated task.</li>
                <li>
                  I have performed the task/skill infrequently; I require more
                  experience/practice to feel comfortable and proficient.
                </li>
                <li>
                  I have performed the task/skill several times and feel
                  moderately comfortable functioning independently but would
                  require a resource person nearby.
                </li>
                <li>
                  I have performed the task/skill frequently and would feel very
                  comfortable and proficient performing it without supervision
                  or practice.
                </li>
              </ol>
            </div>
            <div className="my-4 mr-2 max-w-[50%] flex-grow rounded-md bg-blue-100 p-8">
              <h2 className="mb-2 text-xl font-bold text-blue-600">
                Frequency
              </h2>
              <ol className="max-w-8 m-4 flex list-decimal flex-col gap-2 px-2 text-gray-500">
                <li>5 or less Annually</li>
                <li>5 or less Quarterly</li>
                <li>5 or less Monthly</li>
                <li>1 - 5 times Daily/Weekly</li>
              </ol>
            </div>
          </div>
        </div>
        <div className="mb-8 max-w-xs">
          <Button label="Start Skills Checklist" variant="solid" />
        </div>
      </div>
    </>
  );
};
