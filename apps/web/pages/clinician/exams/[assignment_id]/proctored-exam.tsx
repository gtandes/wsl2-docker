import React, { useEffect, useState } from "react";
import Start from "./start";
import IntegrityAdvocate from "../../../../components/clinicians/exams/IntegrityAdvocate";
import { useIntegrityAdvocate } from "../../../../hooks/useIntegrityAdvocate";
import { useAgency } from "../../../../hooks/useAgency";
import { useRouter } from "next/router";
import QuestionExam from "../../../../components/exams/QuestionsExam";
import ErrorBoundary from "../../../../components/ErrorBoundery";

function ProctoredExam() {
  const { integrityAdvocate, showIntegrityAdvocate } = useIntegrityAdvocate();
  const { currentAgency } = useAgency();
  const router = useRouter();

  const [renderQuestion, setRenderQuestion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleIaReady = () => {
      setRenderQuestion(true);
    };

    window.addEventListener("IA_Ready", handleIaReady);

    return () => {
      window.removeEventListener("IA_Ready", handleIaReady);
    };
  }, []);

  useEffect(() => {
    if (!currentAgency?.ia_enable) return;

    const handleRouteChange = () => {
      try {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith("integrityadvocate")) {
            localStorage.removeItem(key);
          }
        });
      } catch (e) {
        console.error("Error cleaning localStorage:", e);
      }

      ["integrityadvocate_container", "integrityadvocate_tab"].forEach((id) => {
        const elem = document.getElementById(id);
        if (elem) elem.remove();
      });

      try {
        if (typeof window !== "undefined" && window.IntegrityAdvocate) {
          window.IntegrityAdvocate?.endSession();
        }
      } catch (e) {
        console.error("Failed to end IntegrityAdvocate session:", e);
      }
    };

    router.events.on("routeChangeStart", handleRouteChange);
    window.addEventListener("beforeunload", handleRouteChange);
    return () => {
      router.events.off("routeChangeStart", handleRouteChange);
      window.removeEventListener("beforeunload", handleRouteChange);
    };
  }, [currentAgency?.ia_enable, router]);

  return (
    <ErrorBoundary>
      {renderQuestion ? <QuestionExam /> : <Start />}
      {showIntegrityAdvocate && integrityAdvocate && (
        <IntegrityAdvocate {...integrityAdvocate} />
      )}
    </ErrorBoundary>
  );
}

export default ProctoredExam;
