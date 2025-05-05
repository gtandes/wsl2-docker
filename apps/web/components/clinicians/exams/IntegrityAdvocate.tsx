import React, { memo, useEffect, useState } from "react";
import Script from "next/script";
import { useAgency } from "../../../hooks/useAgency";

interface IntegrityAdvocateProps {
  participantId?: string;
  courseId?: string;
  activityId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  assignmentId?: string;
  externaluserid?: string;
}

const IntegrityAdvocate: React.FC<IntegrityAdvocateProps> = (props) => {
  const {
    participantId = "",
    courseId = "",
    activityId = "",
    firstName = "",
    lastName = "",
    email = "",
    assignmentId = "",
    externaluserid = "",
  } = props;

  const { currentAgency } = useAgency();
  const [scriptSrc, setScriptSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!currentAgency?.ia_app_id) {
      console.warn("IntegrityAdvocate: Missing app ID");
      return;
    }

    const callbackUrl = new URL(
      "/cms/integrity-advocate/callback",
      window.location.origin
    );
    callbackUrl.searchParams.set("agency_id", currentAgency.id);
    callbackUrl.searchParams.set("assignment_id", assignmentId);

    try {
      const params = new URLSearchParams({
        appid: currentAgency.ia_app_id,
        participantidentifier: participantId,
        courseid: courseId,
        activityid: activityId,
        participantfirstname: firstName,
        participantlastname: lastName,
        participantemail: email,
        externaluserid: externaluserid,
        statusreviewcallback: callbackUrl.toString(),
      });

      setScriptSrc(
        `https://ca.integrityadvocateserver.com/participants/integrity?${params.toString()}`
      );
    } catch (error) {
      console.error("Error setting up IntegrityAdvocate:", error);
    }
  }, [
    currentAgency?.ia_app_id,
    currentAgency?.id,
    participantId,
    courseId,
    activityId,
    firstName,
    lastName,
    email,
    assignmentId,
    externaluserid,
  ]);

  if (!scriptSrc) return <div>No app id</div>;

  return (
    <Script
      id="integrity-advocate-script"
      src={scriptSrc}
      async
      strategy="afterInteractive"
      onError={(e) => {
        console.error("IntegrityAdvocate script error:", e);
      }}
    />
  );
};

export default memo(IntegrityAdvocate);
