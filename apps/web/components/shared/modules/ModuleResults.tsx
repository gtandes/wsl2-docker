import { useRouter } from "next/router";
import { useAuth } from "../../../hooks/useAuth";
import {
  Directus_Users,
  Junction_Modules_Definition_Directus_Users,
  useGetModuleassignmentByUserIdQuery,
  useSysUserByIdQuery,
} from "api";
import { createContext } from "react";
import { PrintLandscapeOrientation } from "../../utils/PrintLandscapeOrientation";
import Button from "../../Button";
import { CompetencyState } from "types";
import { faArrowLeft } from "@fortawesome/pro-solid-svg-icons";
import { UserRole } from "../../../types/roles";
import { ModuleResultsDescription } from "../../clinicians/modules/ModuleResultsDescription";
import { ModuleAnalytics } from "../../clinicians/modules/ModuleAnalytics";

type ModuleResults = {
  results?: Junction_Modules_Definition_Directus_Users;
  userInfo?: Directus_Users;
};

export const ModuleResultsContext = createContext<ModuleResults>({
  results: undefined,
});

export const ModuleResults = () => {
  const { currentUser } = useAuth();
  const router = useRouter();
  const { user_id, assignment_id } = router.query;
  const userId = user_id || currentUser?.id;
  const isClinician = currentUser?.role === UserRole.Clinician;
  const { data: userData } = useSysUserByIdQuery({
    variables: {
      id: userId as string,
    },
    skip: !userId,
  });
  const userInfo = userData?.users_by_id as Directus_Users;

  const { data } = useGetModuleassignmentByUserIdQuery({
    variables: {
      userId: String(userId),
      assignmentId: String(assignment_id),
    },
    skip: !userId || !assignment_id,
  });
  const results = data
    ?.junction_modules_definition_directus_users[0] as Junction_Modules_Definition_Directus_Users;

  return (
    results && (
      <ModuleResultsContext.Provider
        value={{
          results,
          userInfo,
        }}
      >
        <PrintLandscapeOrientation />
        <div className="flex min-h-screen justify-center">
          <div className="bg-white p-5 print:text-sm">
            <div className="flex print:hidden">
              <div className="my-5 flex w-full">
                {isClinician && (
                  <Button
                    iconLeft={faArrowLeft}
                    label="Back to Score"
                    variant="link"
                    onClick={() => {
                      router.push(`/clinician/modules`);
                    }}
                  />
                )}

                <div className="ml-auto flex gap-3">
                  {results?.status === CompetencyState.FINISHED && (
                    <Button
                      label="Certificate"
                      variant="light"
                      onClick={() => {
                        const route = router.asPath.startsWith("/admin")
                          ? `/admin/dashboard/reports/${userInfo?.id}/modules/${assignment_id}/certificate`
                          : `/clinician/modules/${assignment_id}/certificate`;
                        return router.push(route);
                      }}
                    />
                  )}
                  <Button
                    label="Download"
                    variant="solid"
                    onClick={() => print()}
                  />
                </div>
              </div>
            </div>
            <div className="print-exam-fit flex flex-col gap-5 px-5 md:px-52">
              <ModuleResultsDescription />
              <ModuleAnalytics />
            </div>
          </div>
        </div>
      </ModuleResultsContext.Provider>
    )
  );
};
