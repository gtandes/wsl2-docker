import { PoliciesAssignmentsFragment } from "api";
import Link from "next/link";
import { formatDate, formatExpiresOnDate } from "../../utils/format";
import { Logos } from "../clinicians/skills-checklists/Logos";
import { Birthstone } from "next/font/google";
import Image from "next/image";
import { useFeatureFlags } from "../../hooks/useFeatureFlags";

const birthstone = Birthstone({
  weight: ["400"],
  subsets: ["latin"],
});

interface PolicySignatureProps {
  policy?: PoliciesAssignmentsFragment | null;
}

export const PolicySignature: React.FC<PolicySignatureProps> = ({ policy }) => {
  const { flags } = useFeatureFlags();

  if (!policy) {
    return (
      <div className="text-center text-red-600">
        Policy not found. Please try again later.
      </div>
    );
  }

  const policyLink = `/cms/assets/${policy.policies_id?.document?.id}`;
  const withEsign = !!policy.signature_file?.id;
  const sourceSignature = `${window.origin}/cms/assets/${policy.signature_file?.id}`;
  const user = policy.directus_users_id;

  const isSignaturePadEnabled = flags["enabled_signature_pad"] && withEsign;

  return (
    <div className="flex flex-col gap-6">
      <Logos />

      <div className="text-sm sm:text-base">
        <strong>Title:</strong> {policy.policies_id?.name}
      </div>
      <div className="text-sm sm:text-base">
        <strong>Category:</strong>{" "}
        {policy.policies_id?.categories
          ?.map((c) => c?.categories_id?.title)
          .join(", ")}
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <div className="text-sm sm:text-base">
          <strong>Assigned On:</strong>{" "}
          <span>{formatDate(policy.assigned_on ?? "")}</span>
        </div>
        <div className="text-sm sm:text-base">
          <strong>Signed On:</strong>{" "}
          <span>{formatDate(policy.signed_on ?? "")}</span>
        </div>
        {policy.expires_on && (
          <div className="text-sm sm:text-base">
            <strong>Expires On:</strong>{" "}
            <span>{formatExpiresOnDate(policy.expires_on)}</span>
          </div>
        )}
      </div>

      <div className="text-sm sm:text-base">
        <strong>Link:</strong>{" "}
        <Link
          className="text-sm text-blue-600 hover:underline"
          href={policyLink}
        >
          {`${window.origin}${policyLink}`}
        </Link>
      </div>

      <div className="relative flex items-start">
        <div className="flex h-6 items-center">
          <input
            type="checkbox"
            checked
            disabled
            className="text-indigo-600 focus:ring-indigo-600 h-4 w-4 rounded border-gray-300"
          />
        </div>
        <div className="ml-3 text-xs leading-6 sm:text-sm">
          <label className="font-medium text-gray-700">
            This is to certify that I have reviewed and fully understand this
            policy. I agree to adhere to all of its standards and practice
            patient safety at all times.
          </label>
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-2">
        <div className="flex items-center gap-4">
          <span className="w-20 text-sm font-medium">Signature:</span>
          <div className={`relative ${isSignaturePadEnabled ? "h-24" : ""}`}>
            {isSignaturePadEnabled ? (
              <Image
                alt="Signature"
                width={200}
                height={100}
                src={sourceSignature}
                className="max-h-24 object-contain"
              />
            ) : (
              <span className={birthstone.className + " border-b text-4xl"}>
                {user?.first_name} {user?.last_name}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-end gap-4 text-sm">
          <span className="w-20 font-medium">Name:</span>
          <span className="border-b">
            {policy?.directus_users_id?.first_name}{" "}
            {policy?.directus_users_id?.last_name}
          </span>
        </div>

        <div className="flex items-end gap-4 text-sm">
          <span className="w-20 font-medium">Email: </span>
          <span className="border-b">{user?.email}</span>
        </div>
      </div>
    </div>
  );
};
