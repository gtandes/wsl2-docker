import React, { useRef, useState } from "react";
import Button from "../../../components/Button";
import {
  GENERIC_FILE_UPLOAD_ERROR,
  GENERIC_SUCCESS_SAVED,
  notify,
} from "../../../components/Notification";
import {
  useUpdatePoliciesAssignmentMutation,
  useGetPolicyAssignmentQuery,
} from "api";
import { ExpirationType, controlExpiration } from "types";
import SignaturePad, { SignaturePadRef } from "./sigPad";
import { createFile, updateFile } from "../../../utils/utils";
import { v4 as uuidv4 } from "uuid";
import { useFeatureFlags } from "../../../hooks/useFeatureFlags";

interface Props {
  relationId: string;
  expirationType: ExpirationType;
  onClose: () => void;
}

const PolicySignModal: React.FC<Props> = ({
  relationId,
  expirationType,
  onClose,
}) => {
  const { flags } = useFeatureFlags();
  const isSignaturePadEnabled = flags["enabled_signature_pad"];

  const [checked, setChecked] = useState(false);
  const sigPadRef = useRef<SignaturePadRef | null>(null);
  const [loading, setLoading] = useState(false);

  const [updateAssignedPolicy] = useUpdatePoliciesAssignmentMutation({
    refetchQueries: [
      "getAllPoliciesAssignments",
      "GetClinicianDashboardCompetencies",
      "GetClinicianDashboardItems",
      "GetClinicianDashboardAnalytics",
    ],
  });

  const { data } = useGetPolicyAssignmentQuery({
    variables: { id: relationId },
  });
  const policy = data?.junction_directus_users_policies_by_id;
  const existingSignature = policy?.signature_file?.id
    ? `${window.origin}/cms/assets/${policy.signature_file.id}`
    : null;

  const uploadSignature = async (): Promise<null | {
    id: string;
    title: string;
    filename_download: string;
    storage: string;
  }> => {
    if (!sigPadRef.current) return null;

    try {
      const signatureFile = await sigPadRef.current.getSignatureFile();
      if (!signatureFile) return null;

      const fileId = uuidv4();
      const formData = new FormData();

      formData.append("id", fileId);
      formData.append("folder", "0ef0a03f-3df9-4d3f-8960-86f1efc56287");
      formData.append("file", signatureFile);

      const file = policy?.signature_file?.id
        ? await updateFile(policy?.signature_file?.id, formData)
        : await createFile(formData);

      return {
        id: file?.id ?? "",
        title: file?.filename_download ?? "",
        filename_download: file?.filename_download ?? "",
        storage: "local",
      };
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  const onSign = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const now = new Date();

      if (isSignaturePadEnabled) {
        const esignatureFile = await uploadSignature();
        if (!esignatureFile) {
          notify(GENERIC_FILE_UPLOAD_ERROR);
          setLoading(false);
          return;
        }

        await updateAssignedPolicy({
          variables: {
            id: relationId,
            data: {
              signed_on: now,
              expires_on: controlExpiration(expirationType, now),
              signature_file: esignatureFile,
            },
          },
        });
      } else {
        if (!checked) {
          notify({ title: "Please confirm agreement.", type: "error" });
          setLoading(false);
          return;
        }

        await updateAssignedPolicy({
          variables: {
            id: relationId,
            data: {
              signed_on: now,
              expires_on: controlExpiration(expirationType, now),
            },
          },
        });
      }

      notify(GENERIC_SUCCESS_SAVED);
    } catch (error) {
      console.error(error);
      notify({ title: "Error saving signature. Try again.", type: "error" });
    } finally {
      setLoading(false);
      onClose();
    }
  };

  const isDisabledButton = !checked || loading;

  return (
    <div>
      <p className="p-5 pt-0 text-sm text-gray-400">
        {isSignaturePadEnabled ? (
          <span>
            Please read the following agreement carefully. Once you have read
            it, provide your signature in the box below and click{" "}
            <b>Sign Now</b> to confirm that you have read, understood, and
            agreed to the policy.
          </span>
        ) : (
          <span>
            Please read the following agreement. Once you have read it, please
            check the box and click on the button marked <b>Sign Now</b> to
            indicate that you have read and understood it.
          </span>
        )}
      </p>
      {isSignaturePadEnabled && (
        <div className="overflow-hidden">
          <SignaturePad ref={sigPadRef} existingSignature={existingSignature} />
        </div>
      )}

      <div className="relative flex items-start">
        <div className="flex h-6 items-center">
          <input
            type="checkbox"
            checked={checked}
            onChange={() => setChecked(!checked)}
            className="text-indigo-600 focus:ring-indigo-600 h-4 w-4 rounded border-gray-300"
          />
        </div>

        <div className="ml-3 mt-1 text-xs leading-6 sm:text-sm">
          <label className="font-medium text-gray-700">
            This is to certify that I have reviewed and fully understand this
            policy. I agree to adhere to all of its standards and practice
            patient safety at all times.
          </label>
        </div>
      </div>
      <div className="float-right mt-5 flex gap-2">
        <Button
          disabled={isDisabledButton}
          onClick={onSign}
          label="Sign Now"
          variant="light-blue"
        />
        <Button
          disabled={loading}
          onClick={onClose}
          label="Cancel"
          variant="solid"
        />
      </div>
    </div>
  );
};

export default PolicySignModal;
