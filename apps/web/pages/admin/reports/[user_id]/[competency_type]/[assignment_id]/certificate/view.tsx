import React, { useEffect, useState } from "react";
import { query } from "../../../../../../../utils/utils";
import { useRouter } from "next/router";
import { withAuth } from "../../../../../../../hooks/withAuth";
import { AdminGroup } from "../../../../../../../types/roles";

const CertViewer: React.FC = () => {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const router = useRouter();

  useEffect(() => {
    if (router.isReady) {
      const queryParams = new URLSearchParams(window.location.search);
      const userId = router.query.user_id as string | undefined;
      const competencyType = router.query.competency_type as string | undefined;
      const assignmentId = router.query.assignment_id as string | undefined;

      if (userId && competencyType && assignmentId) {
        const fetchCert = async () => {
          try {
            const response = await query(
              `/cms/certificates/view-cert?userId=${userId}&type=${competencyType}&assignmentId=${assignmentId}`,
              "GET",
              {}
            );

            if (response.ok) {
              const blob = await response.blob();
              const blobUrl = URL.createObjectURL(blob);
              setUrl(blobUrl);
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
        setError("Missing required query parameters");
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
      {url && !error ? (
        <iframe
          src={url}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
          }}
          title="Certificate Viewer"
        />
      ) : (
        <p>{error || "An unexpected error occurred"}</p>
      )}
    </div>
  );
};

export default withAuth(CertViewer, AdminGroup);
