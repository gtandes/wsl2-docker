import React, { useEffect, useState, useRef } from "react";
import { query } from "../../../../../../../utils/utils";
import { useRouter } from "next/router";
import { withAuth } from "../../../../../../../hooks/withAuth";
import { AdminGroup } from "../../../../../../../types/roles";

const CertDownloader: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const hasDownloaded = useRef(false);

  const router = useRouter();

  const isValidInput = (str: string | undefined) => {
    return str && /^[\w-]+$/.test(str);
  };

  useEffect(() => {
    if (router.isReady && !hasDownloaded.current) {
      hasDownloaded.current = true;

      const userId = router.query.user_id as string | undefined;
      const competencyType = router.query.competency_type as string | undefined;
      const assignmentId = router.query.assignment_id as string | undefined;

      if (
        userId &&
        competencyType &&
        assignmentId &&
        isValidInput(userId) &&
        isValidInput(competencyType) &&
        isValidInput(assignmentId)
      ) {
        const fetchCert = async () => {
          try {
            const safeUserId = encodeURIComponent(userId);
            const safeCompetencyType = encodeURIComponent(competencyType);
            const safeAssignmentId = encodeURIComponent(assignmentId);

            const response = await query(
              `/cms/certificates/view-cert?userId=${safeUserId}&type=${safeCompetencyType}&assignmentId=${safeAssignmentId}`,
              "GET",
              {}
            );

            if (response.ok) {
              const blob = await response.blob();
              const blobUrl = URL.createObjectURL(blob);

              const link = document.createElement("a");
              link.href = blobUrl;
              link.download = `certificate_${safeUserId}_${safeAssignmentId}.pdf`;

              link.textContent = `Download Certificate for ${safeUserId}`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);

              URL.revokeObjectURL(blobUrl);
            } else {
              setError(response.statusText || "Failed to fetch certificate");
            }
          } catch (err) {
            console.error("Error fetching certificate:", err);
            setError("An unexpected error occurred");
          } finally {
            setLoading(false);
          }
        };

        fetchCert();
      } else {
        setError("Invalid query parameters");
        setLoading(false);
      }
    }
  }, [router.isReady, router.query]);

  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          margin: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <p>Retrieving your certificate...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100vh",
        margin: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      {error ? <p>{error}</p> : <p>Download should start automatically...</p>}
    </div>
  );
};

export default withAuth(CertDownloader, AdminGroup);
