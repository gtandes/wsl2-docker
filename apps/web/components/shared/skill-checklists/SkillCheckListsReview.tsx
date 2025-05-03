import { Junction_Sc_Definitions_Directus_Users, Sc_Definitions } from "api";
import {
  formatDate,
  formatDateForSC,
  formatExpiresOnDate,
} from "../../../utils/format";
import Button from "../../Button";
import { AverageCard } from "../../clinicians/skills-checklists/AverageCard";
import { Logos } from "../../clinicians/skills-checklists/Logos";
import { QuestionTable } from "../../clinicians/skills-checklists/QuestionTable";
import { Signature } from "../../clinicians/skills-checklists/Signature";

import {
  SkillChecklistAverages,
  SkillChecklistNewFormatQuestion,
  SkillChecklistQuestionDefaultValue,
  SkillChecklistsQuestion,
} from "../../../types/global";
import { SkillChecklistLayout } from "../../clinicians/skills-checklists/SkillChecklistLayout";

interface Props {
  definitionData: Sc_Definitions;
  assignmentData: Junction_Sc_Definitions_Directus_Users;
  generalAverages: SkillChecklistAverages;
  questions: SkillChecklistsQuestion[];
  isEnableNewFormat?: boolean;
}

export const SkillCheckListsReview: React.FC<Props> = ({
  definitionData,
  assignmentData,
  generalAverages,
  questions,
  isEnableNewFormat = false,
}) => {
  return (
    <SkillChecklistLayout
      title={definitionData.title!}
      category={definitionData.category?.title!}
    >
      <div className="flex justify-end print:hidden">
        <Button label="Download" size="xs" onClick={() => print()} />
      </div>
      <div className="flex flex-col gap-16 rounded-lg bg-white px-2 pb-16 pt-7 print:hidden print:pt-0 sm:px-6 lg:px-24">
        <div className="flex flex-col gap-6">
          <span className="text-sm text-gray-400 sm:text-lg">
            Submitted: {formatDateForSC(assignmentData.finished_on)}
          </span>
          <div className="flex flex-col gap-4">
            <Logos />
            <div className="flex flex-col gap-10">
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                  <strong className="text-sm sm:text-base">
                    {`${assignmentData.directus_users_id?.first_name} ${assignmentData.directus_users_id?.last_name}`}
                  </strong>
                  <span className="text-sm sm:text-base">
                    {assignmentData.directus_users_id?.email}
                  </span>
                </div>
                <div className="text-sm sm:text-base">
                  <strong>Company:</strong> {assignmentData.agency?.name}
                </div>
                <div className="text-sm sm:text-base">
                  <strong>Skill Checklist Description:</strong>{" "}
                  {assignmentData.skillchecklist_version?.description}
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div className="text-sm sm:text-base">
                    <strong>Assigned On:</strong>
                    <span> {formatDate(assignmentData.assigned_on ?? "")}</span>
                  </div>
                  <div className="text-sm sm:text-base">
                    <strong>Completed On:</strong>
                    <span> {formatDate(assignmentData.finished_on ?? "")}</span>
                  </div>
                  {assignmentData.expires_on && (
                    <div className="text-sm sm:text-base">
                      <strong>Expires On:</strong>
                      <span>
                        {" "}
                        {formatExpiresOnDate(assignmentData.expires_on)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="whitespace-pre-line text-sm leading-5 text-gray-700">
              {isEnableNewFormat
                ? SkillChecklistNewFormatQuestion
                : SkillChecklistQuestionDefaultValue}
            </div>
            <div className="flex flex-col gap-9 print:mt-8">
              <div className="flex flex-col justify-between gap-2 lg:flex-row">
                <AverageCard
                  title="Overall Avg."
                  value={generalAverages.overallAvg}
                />
                {!isEnableNewFormat && (
                  <>
                    <AverageCard
                      title="Skill Avg."
                      value={generalAverages.skillAverage ?? 0}
                    />
                    <AverageCard
                      title="Frequency Avg."
                      value={generalAverages.frequencyAverage ?? 0}
                    />
                  </>
                )}
              </div>
              <div className="relative flex items-start">
                <div className="flex h-6 items-center">
                  <input
                    required
                    id="disclaimer"
                    aria-describedby="disclaimer-description"
                    name="disclaimer"
                    type="checkbox"
                    checked={assignmentData.accept_agreements || false}
                    className="h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-600"
                    disabled
                  />
                </div>
                <div className="ml-3 text-xs leading-5 sm:text-sm">
                  <label htmlFor="disclaimer" className="text-gray-700">
                    I understand and acknowledge that any misrepresentation or
                    omission may result in disqualification from employment
                    and/or immediate dismissal. By clicking this box, I hereby
                    certify that all information I have provided on this skills
                    checklist is true and accurate, and an automated signature
                    will be generated on the skills checklist.
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-16 print:!gap-2">
          {questions.map((question, questionIdx) => (
            <div
              className="flex flex-col gap-8 print:mt-8 print:gap-2"
              key={questionIdx}
            >
              <span className="text-lg font-medium text-gray-900">
                Question {questionIdx + 1}
              </span>
              <QuestionTable
                isReview={true}
                question={question}
                isEnableNewFormat={isEnableNewFormat}
              />
            </div>
          ))}
        </div>
        <Signature assignmentData={assignmentData} />
      </div>
    </SkillChecklistLayout>
  );
};
