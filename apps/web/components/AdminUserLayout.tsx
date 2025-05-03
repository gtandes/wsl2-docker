import { useSysUserQuery } from "api";
import { useRouter } from "next/router";
import React, { useMemo } from "react";
import { Tabs2 } from "./Tabs2";
import Button from "./Button";
import { faArrowLeft } from "@fortawesome/pro-regular-svg-icons";
import { UserRole } from "../types/roles";

interface Props {
  children: React.ReactNode;
}

export const AdminUserLayout: React.FC<Props> = ({ children }) => {
  const router = useRouter();
  const userId = router.query.user_id as string;

  const sysUserQuery = useSysUserQuery({
    variables: {
      id: userId,
    },
  });

  const currentUser = sysUserQuery.data?.users[0]!;

  const tabs = useMemo(() => {
    const t = [
      {
        name: "Profile",
        href: `/admin/users/${router.query.user_id}/profile`,
        current: false,
      },
    ];

    return currentUser && currentUser.role?.id !== UserRole.HSHAdmin
      ? [
          {
            name: "Competencies",
            href: `/admin/users/${router.query.user_id}/competencies`,
            current: false,
          },
          ...t,
        ]
      : t;
  }, [router.query.user_id, currentUser]);

  const tabsWithCurrent = tabs.map((tab) => {
    return {
      ...tab,
      current: router.asPath.includes(tab.href),
    };
  });

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-medium text-blue-800">Users</h1>
        <div>
          <Button
            onClick={async () => await router.push("/admin/users")}
            iconLeft={faArrowLeft}
            label="Back to List"
            variant="link"
          />
        </div>
      </div>
      <div className="flex flex-col">
        <div className="flex w-full flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="hidden w-80 min-w-max gap-5 py-1 sm:flex sm:shrink-0">
            <div>
              <div className="h-12 w-12 rounded-full bg-blue-900" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-medium">
                {[currentUser?.first_name, currentUser?.last_name].join(" ")}
              </span>
              <span className="text-xs font-medium">{currentUser?.email}</span>
            </div>
          </div>
          <Tabs2 tabs={tabsWithCurrent} />
        </div>
        {children}
      </div>
    </div>
  );
};
