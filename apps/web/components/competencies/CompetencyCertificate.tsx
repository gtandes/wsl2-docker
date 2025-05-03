import React, { useMemo } from "react";
import Link from "next/link";
import { Competencies } from "../../types/global";
import { CompetencyState, CompetencyType } from "types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBarChart,
  faMedal,
  faSignature,
} from "@fortawesome/pro-solid-svg-icons";
import { showCompetencyResultLink } from "../../utils/utils";
import router from "next/router";

interface Props {
  userId: string;
  viewerRole: "admin" | "clinician";
  competency: Competencies;
}
export const CompetencyCertificate = ({
  userId,
  viewerRole,
  competency,
}: Props) => {
  const certificates = useMemo(() => {
    let icons: React.ReactNode = <></>;
    const isClinician = viewerRole === "clinician";

    const moduleCertLink = !competency.import_cert_url
      ? isClinician
        ? `/clinician/modules/${competency?.id}/certificate`
        : `/admin/dashboard/reports/${userId}/modules/${competency?.id}/certificate`
      : competency.import_cert_url;

    const moduleResultLink = showCompetencyResultLink(
      CompetencyType.MODULE,
      competency,
      isClinician,
      userId
    );
    const handleRouteClick = () => {
      router.push(moduleResultLink);
    };

    const examCertLink = !competency.import_cert_url
      ? isClinician
        ? `/clinician/exams/${competency?.id}/certificate`
        : `/admin/dashboard/reports/${userId}/${competency?.id}/certificate`
      : competency.import_cert_url;

    const examResultLink = showCompetencyResultLink(
      CompetencyType.EXAM,
      competency,
      isClinician,
      userId
    );

    const scResultLink = showCompetencyResultLink(
      CompetencyType.SKILL_CHECKLIST,
      competency,
      isClinician,
      userId
    );

    const policySignatureLink = isClinician
      ? `/clinician/policies/${competency?.id}/signature`
      : `/admin/policies/${competency?.id}/signature`;

    if (competency.type === CompetencyType.EXAM) {
      icons = (
        <>
          {competency.status === CompetencyState.COMPLETED && (
            <Link
              href={examCertLink}
              target={competency.import_cert_url ? "_blank" : "_self"}
              className="rounded-lg bg-green-200 px-2 py-1 text-green-800 transition-all hover:bg-green-300"
            >
              <FontAwesomeIcon icon={faMedal} />
            </Link>
          )}

          {examResultLink &&
            (competency.status === CompetencyState.COMPLETED ||
              competency.status === CompetencyState.FAILED) && (
              <Link
                href={examResultLink}
                target={competency.import_report_url ? "_blank" : "_self"}
                className="rounded-lg bg-blue-200 px-2 py-1 text-blue-800 transition-all hover:bg-blue-300"
              >
                <FontAwesomeIcon icon={faBarChart} />
              </Link>
            )}
        </>
      );
    }
    if (
      competency.type === CompetencyType.MODULE &&
      (competency.status === CompetencyState.COMPLETED ||
        competency.status === CompetencyState.FAILED)
    ) {
      icons = (
        <>
          {competency.approved && (
            <Link
              href={moduleCertLink}
              target={competency.import_cert_url ? "_blank" : "_self"}
              className="rounded-lg bg-green-200 px-2 py-1 text-green-800 transition-all hover:bg-green-300"
            >
              <FontAwesomeIcon icon={faMedal} />
            </Link>
          )}

          {moduleResultLink && (
            <button
              className="rounded-lg bg-blue-200 px-2 py-1 text-blue-800 transition-all hover:bg-blue-300"
              onClick={handleRouteClick}
            >
              <FontAwesomeIcon icon={faBarChart} />
            </button>
          )}
        </>
      );
    }

    if (
      competency.type === CompetencyType.SKILL_CHECKLIST &&
      competency.status === CompetencyState.COMPLETED &&
      scResultLink
    ) {
      icons = (
        <Link
          href={scResultLink}
          target={competency.import_report_url ? "_blank" : "_self"}
          className="rounded-lg bg-blue-200 px-2 py-1 text-blue-800 transition-all hover:bg-blue-300"
        >
          <FontAwesomeIcon icon={faBarChart} />
        </Link>
      );
    }

    if (
      competency.type === CompetencyType.POLICY &&
      competency.status === CompetencyState.SIGNED
    ) {
      icons = (
        <Link
          href={policySignatureLink}
          className="rounded-lg bg-yellow-200 px-2 py-1 text-yellow-800 transition-all hover:bg-yellow-300"
        >
          <FontAwesomeIcon icon={faSignature} />
        </Link>
      );
    }

    return icons;
  }, [competency]);

  return <div className="flex gap-2">{certificates}</div>;
};
