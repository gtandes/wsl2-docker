import React from "react";
import Button from "../../../../components/Button";

const ExamInReviewMessage = () => {
  return (
    <>
      <div className="flex flex-col gap-4">
        <p>
          Congratulations! You&apos;ve completed the exam.
          <br />
          Your results have been recorded and your attempt will be reviewed.
          <br />
          <br />
          Your results will be available after this attempt has been reviewed.
          <br />
          A certificate will be issued if you have passed.
          <br />
        </p>

        <Button
          label="Go to my Exams"
          variant="light"
          classes="min-h-5"
          onClick={() => {
            window.location.href = `/clinician/exams`;
          }}
        />
      </div>
    </>
  );
};

export default ExamInReviewMessage;
