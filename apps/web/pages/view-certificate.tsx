import React, { useEffect, useState } from "react";
import { query } from "../utils/utils";

const CertViewer: React.FC = () => {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState<boolean>(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      const queryParams = new URLSearchParams(window.location.search);
      const key = queryParams.get("key");

      if (key) {
        const fetchCert = async () => {
          const response = await query(
            `/cms/certificates/view-cert?key=${key}`,
            "GET",
            {}
          );

          if (response.ok) {
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            setUrl(blobUrl);
          } else {
            setError(response.statusText);
            console.error("Failed to fetch the certificate");
          }
        };

        fetchCert();
      }
    }
  }, [isClient]);

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
      ) : !error ? (
        <p>Retrieving your certificate...</p>
      ) : (
        <p>{error}</p>
      )}
    </div>
  );
};

export default CertViewer;
