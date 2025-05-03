import { z } from "zod";
import Button from "../../../Button";
import { withAuth } from "../../../../hooks/withAuth";
import { AdminGroup } from "../../../../types/roles";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useCallback } from "react";
import { useAgency } from "../../../../hooks/useAgency";
import { Input } from "../../../Input";
import { BullhornGuide } from "../../../bullhorn/BullhornGuide";
import { query } from "../../../../utils/utils";
import {
  BH_VERIFICATION_SUCCESS,
  GENERIC_ERROR,
  notify,
} from "../../../Notification";
import { CustomTab } from "../../../CustomTab";
import CheckListStatusMapping from "../../../ChecklistStatusMapping";
import EnableBullhorn from "../../../EnableBullhorn";
import SyncBullhornModal from "./SyncBullhornModal";
import { SyncActionType } from "./enum";

const schema = z.object({
  client_id: z.string().min(208, { message: "Client ID is required" }),
  client_secret: z.string().min(208, { message: "Client Secret is required" }),
  client_username: z
    .string()
    .min(208, { message: "Client Username token is required" }),
  client_password: z
    .string()
    .min(208, { message: "Client Password is required" }),
});

type FormValues = z.infer<typeof schema>;

const BullhornIntegration = () => {
  const { currentAgency } = useAgency();
  const [verificationError, setVerificationError] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isChecklistEnabled, setIsChecklistEnabled] = useState(false);
  const [isBullhornEnabled, setIsBullhornEnabled] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [syncResults, setSyncResults] = useState([]);
  const [syncError, setSyncError] = useState(null);
  const [actionType, setActionType] = useState<SyncActionType>(
    SyncActionType.SyncToBH
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      client_id: "",
      client_secret: "",
      client_username: "",
      client_password: "",
    },
  });

  const handleBHVerification = async (values: FormValues) => {
    if (!currentAgency?.id) return;

    setIsLoading(true);
    setVerificationError(null);

    try {
      const response = await query(`/cms/integration/bullhorn/verify`, "POST", {
        ...values,
        agency_id: currentAgency.id,
      });

      if (!response.ok) {
        throw new Error(
          (await response.json()).error || "Failed to verify credentials"
        );
      }

      setIsVerified(true);
      notify(BH_VERIFICATION_SUCCESS);
    } catch (error) {
      setVerificationError(
        "Verification failed. Please check your credentials."
      );
      setIsVerified(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchCredentials = useCallback(async () => {
    if (!currentAgency?.id) return;

    try {
      const response = await query(
        `/cms/integration/bullhorn/find/${currentAgency.id}`,
        "GET"
      );

      if (response.status === 404) {
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch configuration");
      }

      const data = await response.json().catch(() => null);

      if (data && typeof data === "object" && data.data) {
        const {
          client_id = "",
          client_secret = "",
          client_username = "",
          client_password = "",
          is_verified = false,
          is_enable_mapping_checklist = false,
        } = data.data || {};

        form.reset({
          client_id,
          client_secret,
          client_username,
          client_password,
        });

        setIsVerified(!!is_verified);
        setIsChecklistEnabled(!!is_enable_mapping_checklist);
        setIsBullhornEnabled(!!currentAgency?.bh_enable);
      } else {
        console.warn(
          "No Bullhorn configuration found or response was malformed."
        );
      }
    } catch (err) {
      console.error("Error fetching credentials:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentAgency?.bh_enable, currentAgency?.id, form]);

  useEffect(() => {
    handleFetchCredentials();
  }, [handleFetchCredentials]);

  const fetchAndSyncCandidatesToBH = async () => {
    setIsLoading(true);
    setSyncError(null);
    setSyncResults([]);
    setActionType(SyncActionType.SyncToBH);
    setModalOpen(true);

    try {
      const response = await query(
        `/cms/integration/bullhorn/sync-bullhorn?agency_id=${currentAgency?.id}`,
        "GET"
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch candidates");
      }

      const data = await response.json();

      const formattedResults = Array.isArray(data.logs)
        ? data.logs.map((log: any) => {
            return {
              email: log.email || "",
              first_name: log.first_name || "",
              last_name: log.last_name || "",
              status: log.status || "failed",
            };
          })
        : [];

      setIsLoading(false);
      setSyncResults(formattedResults);
    } catch (err) {
      console.error("Sync failed:", err);
      notify(GENERIC_ERROR);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAndCreateCandidatesFromBH = async () => {
    setIsLoading(true);
    setSyncError(null);
    setSyncResults([]);
    setActionType(SyncActionType.SyncFromBH);
    setModalOpen(true);

    try {
      const response = await query(
        `/cms/integration/bullhorn/candidates?agency_id=${currentAgency?.id}`,
        "GET"
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to fetch candidates from V2"
        );
      }

      const data = await response.json();

      const formattedResults = Array.isArray(data.logs)
        ? data.logs.map((log: any) => {
            return {
              email: log.email || "",
              first_name: log.first_name || "",
              last_name: log.last_name || "",
              status: log.status || "failed",
            };
          })
        : [];

      setIsLoading(false);

      setSyncResults(formattedResults);
    } catch (err) {
      console.error("Sync failed:", err);
      notify(GENERIC_ERROR);
    } finally {
      setIsLoading(false);
    }
  };

  const renderVerifyStatus = () => (
    <p
      className={`ml-2 mt-0 rounded-2xl border px-2 py-1 text-xs ${
        isVerified ? "text-green-500" : "text-red-500"
      }`}
    >
      {isVerified ? "Verified" : "Not Verified"}
    </p>
  );

  return (
    <div className="flex flex-col gap-5 rounded-lg bg-white px-10 py-8">
      <div className="flex flex-col items-center justify-between gap-4 border-b border-gray-200 pb-4 sm:flex-row">
        <h2 className="text-lg font-medium text-gray-900">
          Bullhorn Integration
        </h2>
      </div>

      <div className="flex flex-wrap gap-6">
        <div className="flex-1">
          <div className="rounded-lg bg-white">
            <BullhornGuide />
            <hr className="my-3 border-t border-gray-300" />

            <div className="mb-3 flex items-center">
              <h3 className="md:text-2xs md:font-semibold">
                Account Credentials
              </h3>
              {renderVerifyStatus()}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                register={form.register("client_username")}
                label="Client Username"
                required
                error={form.formState.errors.client_username}
                placeholder="Client Username"
              />
              <Input
                register={form.register("client_password")}
                label="Client Password"
                required
                error={form.formState.errors.client_password}
                type="password"
                placeholder="Client Password"
              />
              <Input
                register={form.register("client_id")}
                label="Client ID"
                required
                error={form.formState.errors.client_id}
                type="password"
                placeholder="Client ID"
              />
              <Input
                register={form.register("client_secret")}
                label="Client Secret"
                required
                error={form.formState.errors.client_secret}
                type="password"
                placeholder="Client Secret"
              />
            </div>

            <div className="mt-3 flex gap-4">
              <Button
                label="Verify Credentials"
                size="sm"
                type="button"
                onClick={() => handleBHVerification(form.getValues())}
                disabled={
                  !form.formState.isDirty || !currentAgency || isLoading
                }
              />
            </div>

            {verificationError && (
              <div className="mt-4 text-red-500">{verificationError}</div>
            )}
          </div>
        </div>

        <div className="flex-1">
          <EnableBullhorn isBullhornEnabled={isBullhornEnabled} />
          <hr className="my-3 border-t border-gray-300" />
          <div className="rounded-lg bg-white">
            {currentAgency?.id && (
              <CustomTab
                ats_type="bullhorn"
                agency_id={currentAgency.id}
                isDisabled={!isBullhornEnabled}
              />
            )}
          </div>

          <CheckListStatusMapping
            isChecklistEnabled={isChecklistEnabled}
            isDisabled={!isBullhornEnabled}
          />

          <hr className="my-3 border-t border-gray-300" />
          <div className="mb-3 flex items-center">
            <h3 className="md:text-2xs mr-3 md:font-semibold">Sync Profiles</h3>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            This section allows you to synchronize profiles between the HSH and
            Bullhorn platforms. Simply click the respective button to initiate
            the synchronization process.
          </p>

          <div className="mt-3 flex gap-4">
            <Button
              disabled={isLoading || !isBullhornEnabled}
              label="HSH to Bullhorn"
              size="sm"
              type="button"
              onClick={fetchAndSyncCandidatesToBH}
            />
            <Button
              disabled={isLoading || !isBullhornEnabled}
              label="Bullhorn to HSH"
              size="sm"
              type="button"
              onClick={fetchAndCreateCandidatesFromBH}
            />
          </div>
        </div>
      </div>
      <SyncBullhornModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        isLoading={isLoading}
        results={syncResults}
        error={syncError}
        actionType={actionType}
      />
    </div>
  );
};

export default withAuth(BullhornIntegration, AdminGroup);
