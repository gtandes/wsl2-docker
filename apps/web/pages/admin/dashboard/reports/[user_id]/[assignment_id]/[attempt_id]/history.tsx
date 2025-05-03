import { useRouter } from "next/router";
import { ExamResults } from "../../../../../../../components/shared/exams/ExamResults";
import { useState, useEffect } from "react";
import { Spinner } from "../../../../../../../components/Spinner";

function ExamHistory() {
  const router = useRouter();
  const [showExamResults, setShowExamResults] = useState(false);
  const [attemptId, setAttemptId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (router.isReady) {
      const path = router.asPath;
      const pathParts = path.split("/");
      const extractedAttemptId = pathParts[pathParts.length - 2];

      setAttemptId(extractedAttemptId || undefined);
      const timer = setTimeout(() => {
        setShowExamResults(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [router.asPath, router.isReady]);

  if (!showExamResults) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return <ExamResults attempt_id={attemptId} />;
}

export default ExamHistory;
