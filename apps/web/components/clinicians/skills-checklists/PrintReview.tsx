import { createContext } from "react";
import { Junction_Sc_Definitions_Directus_Users, Sc_Definitions } from "api";
import { PrintReviewHeader } from "./print/PrintReviewHeader";
import {
  SkillChecklistAverages,
  SkillChecklistsQuestion,
} from "../../../types/global";
import { PrintReviewAverages } from "./print/PrintReviewAverages";
import { PrintReviewQuestions } from "./print/PrintReviewQuestions";
import { PrintReviewDescription } from "./print/PrintReviewDescription";
import { Signature } from "./Signature";
import { Logos } from "./Logos";

interface Props {
  assignmentData: Junction_Sc_Definitions_Directus_Users;
  definitionData: Sc_Definitions;
  generalAverages: SkillChecklistAverages;
  questions: SkillChecklistsQuestion[];
  isEnableNewFormat?: boolean;
}

export const PrintContext = createContext<Partial<Props>>({
  assignmentData: undefined,
  definitionData: undefined,
  generalAverages: undefined,
  questions: undefined,
  isEnableNewFormat: false,
});

export const PrintReview = ({
  assignmentData,
  definitionData,
  generalAverages,
  questions,
  isEnableNewFormat = false,
}: Props) => {
  return (
    <PrintContext.Provider
      value={{
        assignmentData,
        definitionData,
        generalAverages,
        questions,
        isEnableNewFormat,
      }}
    >
      <div className="print-fit hidden h-full flex-col p-8 print:flex">
        <Logos />
        <PrintReviewHeader />
        <PrintReviewDescription />
        <PrintReviewAverages />
        <PrintReviewQuestions />
        <Signature assignmentData={assignmentData} />
      </div>
    </PrintContext.Provider>
  );
};
