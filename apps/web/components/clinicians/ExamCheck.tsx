import React from "react";
import { Spinner } from "../Spinner";
import Link from "next/link";
import { CompetencyState } from "types";

type Props = {
  children: React.ReactNode;
  status: CompetencyState;
  loading: boolean;
};

const ExamCheck: React.FC<Props> = ({ children, loading, status }) => {
  if (loading) {
    return (
      <div className="flex h-24 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (
    ![CompetencyState.NOT_STARTED, CompetencyState.IN_PROGRESS].includes(status)
  ) {
    return (
      <div className="item-center container m-10 mx-auto flex flex-col justify-center rounded bg-white p-10 text-center">
        <p className="font-medium">The Exam is no longer available.</p>
        <p className="mt-2 text-gray-400">
          Please go{" "}
          <Link href="/clinician/exams" className="underline">
            back
          </Link>{" "}
          or{" "}
          <a
            href="mailto:support@hs-hire.com?subject=Report%20Issue"
            className="underline"
          >
            contact support
          </a>
          .
        </p>
      </div>
    );
  }

  return children;
};

export default ExamCheck;
