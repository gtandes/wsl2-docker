import { faUserDoctor, faArrowLeft } from "@fortawesome/pro-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import Button from "../../Button";
import { useRouter } from "next/router";
import { useAuth } from "../../../hooks/useAuth";
import { UserRole } from "types";

interface Props {
  children: React.ReactNode;
  title: string;
  category: string;
}

export const SkillChecklistLayout: React.FC<Props> = ({
  children,
  title = "",
  category = "",
}) => {
  const router = useRouter();
  const { currentUser } = useAuth();

  const isPreview = router.query.preview === "true";
  const fromReport = router.query.from_report === "true";

  const scId = router.query.sc_id as string;
  const hideButtonForRoles = [UserRole.UsersManager];
  const hiddenForCurrentUser = hideButtonForRoles.includes(currentUser!.role);
  const displayBackButton = !fromReport && !hiddenForCurrentUser;

  return (
    <div className="flex flex-col gap-8 bg-dark-blue-50 print:bg-white print:!px-0 sm:px-16">
      <div className="flex items-end gap-8 print:hidden sm:items-start">
        <div className="flex h-20 w-20 items-center justify-center rounded-md bg-green-50 text-green-500">
          <FontAwesomeIcon icon={faUserDoctor} size="3x" />
        </div>
        <div className="flex w-full flex-col-reverse justify-center gap-3 sm:flex-col">
          <div className="text-xs font-semibold uppercase text-green-500">
            {category}
          </div>
          <div className="flex w-full flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-4xl font-medium text-gray-900">{title}</h1>
            {displayBackButton && (
              <Button
                iconLeft={faArrowLeft}
                label={
                  isPreview ? "Back to Editing" : "Back to Skills Checklists"
                }
                variant="light-blue"
                onClick={async () => {
                  if (isPreview) {
                    await router.push(`/admin/skills-checklists/${scId}`);
                  } else {
                    await router.push("/clinician/skills-checklists");
                  }
                }}
                classes="print:hidden"
              />
            )}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
};
