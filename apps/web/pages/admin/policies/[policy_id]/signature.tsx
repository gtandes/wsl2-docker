import { PolicySignatureLayout } from "../../../../components/policies/PolicySignatureLayout";
import { useGetPolicyAssignmentQuery } from "api";
import { Spinner } from "../../../../components/Spinner";
import { PolicySignature } from "../../../../components/policies/PolicySignature";
import { useRouter } from "next/router";

function SignaturePage() {
  const router = useRouter();
  const policyId = router.query.policy_id as string;

  const policyQuery = useGetPolicyAssignmentQuery({
    variables: {
      id: policyId,
    },
  });

  const policy = policyQuery.data?.junction_directus_users_policies_by_id;

  return (
    <PolicySignatureLayout>
      {policyQuery.loading ? (
        <div className="flex items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <PolicySignature policy={policy} />
      )}
    </PolicySignatureLayout>
  );
}

export default SignaturePage;
