import { useContext } from "react";
import { SpecialtyHeader } from "../../SpecialtyHeader";
import { Logo } from "../../utils/Logo";
import { UserRole } from "../../../types/roles";
import { formatDate, formatExpiresOnDate } from "../../../utils/format";
import { ModuleResultsContext } from "../../shared/modules/ModuleResults";
import { faBook } from "@fortawesome/pro-regular-svg-icons";

export const ModuleResultsDescription = () => {
  const { results, userInfo } = useContext(ModuleResultsContext);
  const isClinician = userInfo?.role?.id === UserRole.Clinician;
  const contactHours =
    results?.modules_definition_id?.last_version?.contact_hour;
  const agencyName = results?.agency?.name || "";

  return (
    results && (
      <>
        <Logo />
        <div className="mb-5">
          <SpecialtyHeader
            icon={faBook}
            color="light-blue"
            title={results.modules_definition_id?.title as string}
            category={results.modules_definition_id?.modality?.title as string}
          />
        </div>
        {isClinician && (
          <h1 className="mb-5 text-2xl font-bold text-[#3e5a8c] print:text-lg">
            {results?.approved ? (
              <>Congratulations! You’ve passed. We are proud of you.</>
            ) : (
              <>
                Oh no! We’re sorry, but your score is not sufficient to pass the
                exam.
              </>
            )}
          </h1>
        )}

        <div className="flex flex-col">
          <span className="font-bold capitalize">
            {userInfo?.first_name} {userInfo?.last_name}
          </span>
          <span className="text-sm">{userInfo?.email}</span>
        </div>
        <div className="flex flex-col">
          {agencyName && (
            <span className="font-bold capitalize">
              Company: &nbsp;
              <span className="font-normal">{agencyName}</span>
            </span>
          )}
          {results?.modules_definition_id?.description && (
            <p>
              <span className="font-bold">Exam Description:</span>&nbsp;
              <span className="w-4/5 font-normal">
                {results?.modules_definition_id?.description}
              </span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-10">
          <div className="flex flex-col">
            <div>
              <span className="font-bold">Assigned On:</span>&nbsp;
              <span className="font-normal">
                {formatDate(results?.assigned_on?.toISOString() || "")}
              </span>
            </div>
            <div>
              <span className="font-bold">Started On:</span>&nbsp;
              <span className="font-normal">
                {formatDate(results?.started_on?.toISOString() || "")}
              </span>
            </div>
          </div>
          <div className="flex flex-col">
            {results?.finished_on && (
              <div>
                <span className="font-bold">Completed On:</span>&nbsp;
                <span className="font-normal">
                  {formatDate(results?.finished_on)}
                </span>
              </div>
            )}
            {results?.expires_on && (
              <div>
                <span className="font-bold">Expires On:</span>&nbsp;
                <span className="font-normal">
                  {formatExpiresOnDate(results?.expires_on)}
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-col">
            {results?.cert_code && (
              <div>
                <span className="font-bold">Certificate code:</span>&nbsp;
                <span className="font-normal">{results?.cert_code}</span>
              </div>
            )}
            {contactHours && (
              <div>
                <span className="font-bold">Contact Hours(s):</span>&nbsp;
                <span className="font-normal">{contactHours}</span>
              </div>
            )}
          </div>
        </div>
      </>
    )
  );
};
