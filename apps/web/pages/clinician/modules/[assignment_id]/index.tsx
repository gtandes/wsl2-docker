import { faArrowLeft } from "@fortawesome/pro-regular-svg-icons";
import Button from "../../../../components/Button";
import { withAuth } from "../../../../hooks/withAuth";
import { ClinicianGroup } from "../../../../types/roles";
import { useRouter } from "next/router";
import { useGetModuleAssignmentQuery } from "api";
import { useMemo } from "react";
import { useAuth } from "../../../../hooks/useAuth";

function ViewModule() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const assignmentId = router.query.assignment_id as string;

  const assignmentQuery = useGetModuleAssignmentQuery({
    variables: {
      assignmentId: assignmentId,
    },
  });

  const assignment =
    assignmentQuery.data?.junction_modules_definition_directus_users_by_id;
  const version = assignment?.module_version;

  const iframeUrl = useMemo(() => {
    const assignmentAttempt = assignment?.attempts?.at(0);
    const entryPoint = version?.entry_point;
    const packageId = version?.package?.id;

    if (!assignmentAttempt?.attempt) return "";

    const url = new URL(
      `${window.location.origin}/cms/modules/packages/${packageId}/${entryPoint}`
    );
    url.searchParams.append(
      "endpoint",
      `${window.location.origin}/cms/modules/lrs/${assignmentId}/`
    );
    url.searchParams.append("auth", "Basic bXlfa2V5Om15X3NlY3JldA==");
    url.searchParams.append(
      "actor",
      JSON.stringify({
        mbox: `mailto:${currentUser?.email}`,
        name: currentUser?.id,
        objectType: "Agent",
      })
    );
    url.searchParams.append("registration", assignmentAttempt.attempt);

    return url;
  }, [
    assignment?.attempts,
    assignmentId,
    currentUser?.email,
    currentUser?.id,
    version?.entry_point,
    version?.package?.id,
  ]);

  return (
    <div className="flex h-screen flex-col">
      <div className="flex items-center gap-5 bg-blue-700 px-5 py-3">
        <Button
          className="text-white"
          variant="link"
          label="Back to List"
          onClick={() => router.push("/clinician/modules")}
          iconLeft={faArrowLeft}
        />
        <h1 className="text-lg font-medium text-white">
          {assignment?.modules_definition_id?.title}
        </h1>
      </div>
      {assignmentQuery.loading ? null : iframeUrl.toString() === "" ? (
        <div className="flex flex-grow items-center justify-center">
          <p className="text-gray-700">Error getting the module</p>
        </div>
      ) : (
        <iframe className="grow" src={iframeUrl.toString()}></iframe>
      )}
    </div>
  );
}

export default withAuth(ViewModule, ClinicianGroup);
