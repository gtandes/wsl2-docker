import { formatDate, formatExpiresOnDate } from "../../../../utils/format";
import { useContext } from "react";
import { PrintContext } from "../PrintReview";

export const PrintReviewHeader = () => {
  const { definitionData, assignmentData } = useContext(PrintContext);

  return (
    <>
      <div className="mb-3 mt-3  flex gap-3">
        <h1 className="text-xl font-medium text-gray-900">
          {definitionData?.title}
        </h1>
      </div>
      <div className="flex items-center  gap-5 text-xs">
        <div className="flex flex-col gap-2">
          <div>
            <strong>{`${assignmentData?.directus_users_id?.first_name} ${assignmentData?.directus_users_id?.last_name}`}</strong>{" "}
            <span>{assignmentData?.directus_users_id?.email}</span>
          </div>
          <div>
            <strong>Company:</strong> {assignmentData?.agency?.name}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div>
            <strong>Completed On:</strong>
            <span> {formatDate(assignmentData?.finished_on ?? "")}</span>
          </div>
          {assignmentData?.due_date && (
            <div>
              <strong>Expires On:</strong>
              <span> {formatExpiresOnDate(assignmentData?.due_date)}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <div>
            <strong>Assigned On:</strong>
            <span> {formatDate(assignmentData?.assigned_on ?? "")}</span>
          </div>
          <div>
            <strong>Expires On:</strong>
            <span> {formatDate(assignmentData?.expires_on ?? "")}</span>
          </div>
        </div>
      </div>

      <div className="relative mt-5 flex items-start text-xs print:break-inside-avoid">
        <div className="flex h-6 items-center">
          <input
            required
            id="disclaimer"
            aria-describedby="disclaimer-description"
            name="disclaimer"
            type="checkbox"
            checked={assignmentData?.accept_agreements || false}
            className="h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-600"
            disabled
          />
        </div>
        <div className="ml-3 leading-5 ">
          <label htmlFor="disclaimer" className="text-gray-700">
            I understand and acknowledge that any misrepresentation or omission
            may result in disqualification from employment and/or immediate
            dismissal. By clicking this box, I hereby certify that all
            information I have provided on this skills checklist is true and
            accurate, and an automated signature will be generated on the skills
            checklist.
          </label>
        </div>
      </div>
    </>
  );
};
