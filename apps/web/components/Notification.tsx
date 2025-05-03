import React from "react";
import toast, { Toast } from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faXmark,
  faCircleCheck,
  faCircleExclamation,
} from "@fortawesome/pro-solid-svg-icons";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";

export type NotificationProps = {
  type: "success" | "error";
  title?: React.ReactNode;
  description?: React.ReactNode;
};

export const GENERIC_SUCCESS_DELETED: NotificationProps = {
  type: "success",
  title: <>Deleted!</>,
};

export const LOGIN_SUCCESS: NotificationProps = {
  type: "success",
  title: <>Log in successful</>,
  description: <>Welcome back!</>,
};

export const GENERIC_SUCCESS_SAVED: NotificationProps = {
  type: "success",
  title: <>Saved!</>,
};

export const GENERIC_SUCCESS_CREATED: NotificationProps = {
  type: "success",
  title: <>Created!</>,
};

export const GENERIC_ERROR: NotificationProps = {
  type: "error",
  title: <>Something went wrong</>,
  description: (
    <>Please try again. If this problem persists, please contact support.</>
  ),
};

export const GENERIC_ERROR_PLEASE_RELOAD: NotificationProps = {
  type: "error",
  title: <>Something went wrong</>,
  description: (
    <>
      Please refresh the page. If this problem persists, please contact support.
    </>
  ),
};

export const GENERIC_FILE_UPLOAD_ERROR: NotificationProps = {
  type: "error",
  title: <>Upload error</>,
  description: (
    <>
      Some files could not be uploaded . Please try again and if this problem
      persists, contact support.
    </>
  ),
};

export const INCORRECT_LOGIN: NotificationProps = {
  type: "error",
  title: <>Incorrect Log in</>,
  description: (
    <>
      Not sure what happened?
      <br />
      Your user or password might be incorrect. Please review it and try again!
    </>
  ),
};

export const ALL_FIELDS_ARE_REQUIRED: NotificationProps = {
  type: "error",
  title: <>All Fields Are Required!</>,
  description: <>Please make sure that all fields are not empty.</>,
};

export const COPIED: NotificationProps = {
  type: "success",
  title: <>Copied to Clipboard!</>,
  description: <>The link has been successfully copied.</>,
};

export const BH_VERIFICATION_SUCCESS: NotificationProps = {
  type: "success",
  title: <>Credential Verification Successful</>,
  description: (
    <>
      Your credential has been successfully verified. You may now proceed with
      Bullhorn integration.
    </>
  ),
};

export const PROFILE_SYNC_SUCCESS: NotificationProps = {
  type: "success",
  title: <>Profile Sync Completed Successfully</>,
  description: <>The clinician&apos;s profile has been synced to Bullhorn.</>,
};

export const NO_NEW_PROFILES_TO_SYNC: NotificationProps = {
  type: "error",
  title: <>No New Profiles Found</>,
  description: (
    <>All clinicians are already synced to Bullhorn. No new profiles to sync.</>
  ),
};

export const CLINICIAN_ALREADY_SYNCED: NotificationProps = {
  type: "error",
  title: <>Clinician Already Synced</>,
  description: (
    <>This clinician is already present in Bullhorn. No changes needed.</>
  ),
};

export const SYNC_NOT_ALLOWED: NotificationProps = {
  type: "error",
  title: <>Sync Restricted</>,
  description: <>Only clinicians can be synced with Bullhorn.</>,
};

export const CUSTOM_MESSAGE = (
  type: "success" | "error",
  title?: React.ReactNode,
  description?: React.ReactNode
): NotificationProps => ({
  type,
  ...(title && { title }),
  ...(description && { description }),
});

export const notify = ({
  type = "success",
  title,
  description,
}: {
  type: "success" | "error";
  title?: React.ReactNode;
  description?: React.ReactNode;
}) => {
  let displayTitle: React.ReactNode;
  let displayDescription: React.ReactNode = description || "";
  let color = "";
  let icon: React.ReactElement<IconDefinition> | null = null;

  switch (type) {
    case "error":
      color = "text-red-500";
      icon = <FontAwesomeIcon icon={faCircleExclamation} />;
      displayTitle = title || <>Something went wrong</>;
      break;
    case "success":
    default:
      color = "text-green-500";
      icon = <FontAwesomeIcon icon={faCircleCheck} />;
      displayTitle = title || "Success!";
      break;
  }

  const NotificationContent = ({ t }: { t: Toast }) => (
    <div className="flex gap-3">
      <div className={color}>{icon}</div>
      <div className="">
        <p className="text-sm font-medium text-gray-900">{displayTitle}</p>
        {displayDescription && (
          <p className="mt-1 text-sm text-gray-500">{displayDescription}</p>
        )}
      </div>
      <div className="">
        <button
          type="button"
          className="inline-flex rounded-md bg-white text-gray-400 hover:text-gray-500"
          onClick={() => toast.remove(t.id)}
        >
          <span className="sr-only">Close</span>
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>
    </div>
  );

  return toast((t) => <NotificationContent t={t} />);
};
