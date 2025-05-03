import React, { useMemo } from "react";
import { UnderlineTabs } from "../UnderlineTabs";
import { useRouter } from "next/router";
import { faArrowLeftLong } from "@fortawesome/pro-solid-svg-icons";

import Button from "../Button";
import { faPlayCircle } from "@fortawesome/pro-regular-svg-icons";
import { useAuth } from "../../hooks/useAuth";
import { UserRole } from "../../types/roles";

interface Props {
  children: React.ReactNode;
  title: string;
}

export const SkillChecklistLayout: React.FC<Props> = ({ children, title }) => {
  const router = useRouter();
  const { skill_check_id } = router.query;
  const isNew = skill_check_id === "new";
  const auth = useAuth();

  const tabs = useMemo(
    () => [
      {
        name: "Details",
        href: `/admin/skills-checklists/${skill_check_id}`,
        current: false,
        disabled: false,
      },
      {
        name: "Questions",
        href: `/admin/skills-checklists/${skill_check_id}/questions`,
        current: false,
        disabled: isNew,
      },
    ],
    [isNew, skill_check_id]
  );

  const tabsWithCurrent = tabs.map((tab) => {
    return {
      ...tab,
      current: router.asPath.endsWith(tab.href),
    };
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Button
          iconLeft={faArrowLeftLong}
          label="Back to List"
          variant="link"
          onClick={() => router.push(`/admin/skills-checklists`)}
        />
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl text-blue-900">{title}</h2>
          {isNew ? null : (
            <Button
              disabled={auth.currentUser?.role === UserRole.UsersManager}
              variant="light-blue"
              label="Preview"
              iconLeft={faPlayCircle}
              size="sm"
              onClick={async () => {
                await router.push(
                  `/clinician/skills-checklists/${skill_check_id}?preview=true`
                );
              }}
            />
          )}
        </div>
        <div className="flex flex-col rounded-lg bg-white px-10 py-9">
          <UnderlineTabs tabs={tabsWithCurrent} />
          {children}
        </div>
      </div>
    </div>
  );
};
