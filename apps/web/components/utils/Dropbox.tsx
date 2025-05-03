import React, { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import clsx from "clsx";
import Button from "../Button";

interface Props<T> {
  type: "ExamQuestions" | "SkillChecklists";
  setParsedValues: React.Dispatch<React.SetStateAction<T | undefined>>;
  isNewFormatEnabled?: boolean;
}

export default function Dropbox<T>({
  type,
  setParsedValues,
  isNewFormatEnabled = false,
}: Props<T>) {
  const [data, setData] = useState<string>("");
  const [parserError, setParserError] = useState<boolean>(false);

  const examParser = (data: string): T | undefined => {
    const titleIdentifier = "#Q";
    const categoryIdentifier = "#";

    const questionText = data?.split(/^[0-9]*\.*\s*([\s\S]*?)#Q/gm)[1];
    const answersvalues = data
      ?.split(/^[a-zA-Z]\.\s*(.*)/gm)
      .slice(1)
      .filter((a) => a.trim());
    const questionCategory = answersvalues
      .find(
        (w) => w.includes(categoryIdentifier) && !w.endsWith(titleIdentifier)
      )
      ?.split("#")?.[1]
      .trim();

    const answers = answersvalues.map((q) => {
      const isCorrectAnswer = q.includes(categoryIdentifier);
      return {
        id: uuidv4(),
        answer: isCorrectAnswer ? q.split(categoryIdentifier).at(0) : q,
        correct_answer: isCorrectAnswer,
      };
    });
    const correctAnswer = answers.find((a) => a.correct_answer);

    if (questionText && questionCategory && correctAnswer && answers.length) {
      return {
        questionText,
        questionCategory,
        correctAnswer: correctAnswer?.id,
        answers,
      } as T;
    }
    return undefined;
  };

  const skillParser = (data: string): T | undefined => {
    if (data.toLowerCase().includes("skip this section")) {
      let cleanData = data.replace(/^ +/gm, "");
      cleanData = cleanData.replace(
        /^(skip this section|procedures\/skills:|frequency|1 2 3 4 NA)/gim,
        ""
      );
      cleanData = cleanData.replace(/^skill$/gim, "");
      cleanData = cleanData.replace(/^\s*\d+\.\W/gm, "    ");
      cleanData = cleanData.replace(/^\s*[\r\n]/gm, "");
      setData(cleanData);
      return;
    }

    try {
      const cleanedData = data.trim();
      const lines = cleanedData
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line);

      if (lines.length === 0) return undefined;

      const section = lines[0].replace(/##$/, "").trim();

      let currentIndex = 1;
      while (currentIndex < lines.length && /^\d+$/.test(lines[currentIndex])) {
        currentIndex++;
      }

      const skills = [];
      while (currentIndex < lines.length) {
        const line = lines[currentIndex].trim();
        if (line && !line.match(/^\d+$/) && line !== section) {
          skills.push({
            title: line,
            skill: null,
            frequency: null,
            ...(isNewFormatEnabled ? { proficiency: null } : {}),
          });
        }
        currentIndex++;
      }

      if (section && skills.length > 0) {
        return {
          section,
          items: skills,
        } as T;
      }
    } catch (error) {
      console.error("Error parsing skill checklist:", error);
    }

    return undefined;
  };

  const getParserDropboxData = (data: string): T | undefined => {
    if (type === "ExamQuestions") {
      return examParser(data);
    }
    if (type === "SkillChecklists") {
      return skillParser(data);
    }
  };

  useEffect(() => {
    if (data) {
      const parsedData = getParserDropboxData(data);
      setParserError(parsedData === undefined);
      if (parsedData) {
        setParsedValues(parsedData);
      }
    }
  }, [data]);

  return (
    <div>
      <label className="block text-xs text-gray-700">Dropbox</label>
      <p className="text-xs text-gray-500">
        Paste here the whole{" "}
        {type === "ExamQuestions" ? "question" : "skill checklist"} text
      </p>
      <div className="relative mt-1 rounded-md">
        <textarea
          className={clsx(
            "focus:ring-indigo-600 block w-full rounded-md border-0 px-2 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-xs placeholder:text-gray-400 focus:ring-2 focus:ring-inset disabled:text-gray-400 sm:text-sm sm:leading-6"
          )}
          onChange={(e) => setData(e.target.value)}
          value={data}
          rows={5}
        />
      </div>
      {parserError && (
        <>
          <p className="mt-2 text-xs text-red-500">
            The parser did not recognize the format of the text. <br />
            Please make sure it follows the correct format. <br />
            {type === "ExamQuestions" && "Try again resetting the form."}
          </p>
          {type === "ExamQuestions" && (
            <div>
              <Button
                className="mb-2 text-xs text-blue-500 underline"
                type="reset"
                label="Reset question form"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
