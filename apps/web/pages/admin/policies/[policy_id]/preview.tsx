import { useRouter } from "next/router";
import { AdminLayout } from "../../../../components/AdminLayout";
import { withAuth } from "../../../../hooks/withAuth";
import { AdminGroup } from "../../../../types/roles";
import { useGetPolicyDetailQuery } from "api";
import { Spinner } from "../../../../components/Spinner";
import { faArrowLeft } from "@fortawesome/pro-solid-svg-icons";
import Button from "../../../../components/Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileLines } from "@fortawesome/pro-thin-svg-icons";

function Preview() {
  const router = useRouter();
  const { policy_id } = router.query;
  const { data: policyData, loading: policyLoading } = useGetPolicyDetailQuery({
    variables: { policyId: String(policy_id) },
  });

  return (
    <AdminLayout>
      {policyLoading ? (
        <div className="flex w-full items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <div className="flex w-full flex-col justify-center gap-3">
          <div className="flex w-full justify-between gap-4">
            <div className="flex gap-3">
              <div className="flex h-20 w-20 items-center justify-center rounded-md bg-green-50 text-green-500">
                <FontAwesomeIcon icon={faFileLines} size="3x" />
              </div>

              <div className="flex flex-col gap-3">
                <div className="text-xs font-semibold uppercase text-green-500">
                  {
                    policyData?.policies_by_id?.categories?.at(0)?.categories_id
                      ?.title
                  }
                </div>
                <h1 className="text-4xl font-medium text-gray-900">
                  {policyData?.policies_by_id?.name}
                </h1>
              </div>
            </div>
            <Button
              iconLeft={faArrowLeft}
              label="Back to Editing"
              variant="light-blue"
              onClick={async () => {
                await router.push(
                  `/admin/policies/${policyData?.policies_by_id?.id}`
                );
              }}
            />
          </div>
          <div className="flex flex-col items-center justify-center gap-10 rounded-lg bg-white px-2 pb-16 pt-24 sm:px-6 lg:px-32">
            <object
              name={policyData?.policies_by_id?.name || ""}
              data={`/cms/assets/${policyData?.policies_by_id?.document?.id}`}
              type="application/pdf"
              width="100%"
              height={800}
            >
              <div>Failed to load PDF document</div>
            </object>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default withAuth(Preview, AdminGroup);
